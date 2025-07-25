
import type { Express } from "express";
import { generateToken, requireAuth, requireRole, requireSelfOrAdmin, AuthRequest } from "./middleware/auth";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertFileSchema, insertDepartmentSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ 
  storage: storage_multer,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Max 10 files at once
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non autorisé: ${ext}. Types autorisés: ${allowedTypes.join(', ')}`));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Route pour récupérer les activités récentes
  app.get("/api/activities", requireAuth, async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getRecentActivities(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });
  // Route pour approuver un fichier (admin/superuser)
  app.patch("/api/files/:id/approve", requireAuth, requireRole("admin", "superuser"), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      // TODO: vérifier que l'utilisateur est admin/superuser (à sécuriser selon ton auth)
      const file = await storage.updateFile(id, { status: "approved" });
      if (!file) {
        return res.status(404).json({ message: "Fichier non trouvé" });
      }
      res.json({ message: "Fichier approuvé", file });
    } catch (error) {
      res.status(500).json({ message: "Erreur lors de l'approbation" });
    }
  });
  // Download file route
  app.get("/api/files/:id/download", requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const file = await storage.getFile(id);
      if (!file || !file.filePath) {
        return res.status(404).json({ message: "Fichier introuvable" });
      }
      const absolutePath = path.isAbsolute(file.filePath)
        ? file.filePath
        : path.join(process.cwd(), file.filePath);
      if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({ message: "Fichier non trouvé sur le serveur" });
      }
      // Détermine le type MIME
      const ext = path.extname(file.originalName || file.filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
      };
      const mimeType = mimeTypes[ext] || "application/octet-stream";
      res.setHeader("Content-Type", mimeType);
      res.download(absolutePath, file.originalName || file.filename);
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password hash
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Update last login
      await storage.updateUser(user.id, { lastLogin: new Date() });

      // Génère un token JWT sécurisé
      const token = generateToken(user);
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          department: user.department,
          firstName: user.firstName,
          lastName: user.lastName,
        }
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    res.json({ message: "Logged out successfully" });
  });

  // Token validation endpoint
  app.get("/api/auth/validate", requireAuth, async (req: AuthRequest, res) => {
    res.json({ valid: true, user: req.user });
  });

  // User routes
  app.get("/api/users", requireAuth, requireRole("admin", "superuser"), async (req, res) => {
    try {
      const { page, limit } = req.query;
      
      // Parse pagination parameters
      const pageNum = page ? parseInt(page as string) : 1;
      const limitNum = limit ? parseInt(limit as string) : 10;
      const paginationOptions = { page: pageNum, limit: limitNum };
      
      const result = await storage.getAllUsers(paginationOptions);
      const sanitizedUsers = result.data.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      }));
      
      // Return paginated response
      res.json({
        data: sanitizedUsers,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      });
    } catch (error) {
      console.error("Error in /api/users:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/users", requireAuth, requireRole("admin", "superuser"), async (req, res) => {
    try {
      console.log("Données reçues pour création d'utilisateur:", req.body);
      const userData = insertUserSchema.parse(req.body);
      console.log("Validation réussie, données parsées:", userData);
      
      // Hash the password before storing
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const userWithHashedPassword = {
        ...userData,
        password: hashedPassword,
      };
      
      const user = await storage.createUser(userWithHashedPassword);
      res.json({ 
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error) {
      console.error("Erreur lors de la création d'utilisateur:", error);
      if (error instanceof Error) {
        console.error("Message d'erreur:", error.message);
      }
      res.status(400).json({ message: "Invalid user data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireRole("admin", "superuser"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Department routes
  app.get("/api/departments", requireAuth, async (req, res) => {
    try {
      const departments = await storage.getAllDepartments();
      // For department stats, we need all data
      const usersResult = await storage.getAllUsers({ page: 1, limit: 10000 });
      const filesResult = await storage.getAllFiles({ page: 1, limit: 10000 });
      
      // Add counts to each department
      const departmentsWithCounts = departments.map(dept => ({
        ...dept,
        userCount: usersResult.data.filter(user => user.department === dept.name).length,
        fileCount: filesResult.data.filter(file => file.department === dept.name).length,
      }));
      
      res.json(departmentsWithCounts);
    } catch (error) {
      console.error("Error in /api/departments:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/departments", requireAuth, requireRole("admin", "superuser"), async (req, res) => {
    try {
      console.log("Received department data:", req.body);
      const departmentData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(departmentData);
      res.json(department);
    } catch (error) {
      console.error("Department creation error:", error);
      res.status(400).json({ 
        message: "Invalid department data", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Update department
  app.put("/api/departments/:id", requireAuth, requireRole("admin", "superuser"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const updated = await storage.updateDepartment(id, updateData);
      if (!updated) {
        return res.status(404).json({ message: "Department not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // Delete department
  app.delete("/api/departments/:id", requireAuth, requireRole("admin", "superuser"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDepartment(id);
      if (!deleted) {
        return res.status(404).json({ message: "Department not found or cannot be deleted" });
      }
      res.json({ message: "Department deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // File routes
  app.get("/api/files", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { department, search, date, type, page, limit } = req.query;
      const currentUser = req.user;
      
      // Parse pagination parameters
      const pageNum = page ? parseInt(page as string) : 1;
      const limitNum = limit ? parseInt(limit as string) : 12;
      const paginationOptions = { page: pageNum, limit: limitNum };
      
      // Build filters object
      const filters: any = {};
      
      if (search) filters.search = search as string;
      if (department && department !== "all") filters.department = department as string;
      if (type && type !== "all") filters.fileType = type as string;
      if (date) {
        const days = parseInt(date as string);
        if (!isNaN(days)) {
          filters.dateRange = days;
        }
      }
      
      // Use the new filtered method
      let result = await storage.getFilesWithFilters(filters, paginationOptions);
      let files = result.data;
      
      // Filter files based on user role and department access
      if (currentUser.role === "user") {
        // For regular users, we need to filter by their department
        const userFilters = { ...filters, department: currentUser.department };
        result = await storage.getFilesWithFilters(userFilters, paginationOptions);
        files = result.data;
      }
      
      // Pour chaque fichier, ajoute le nom de l'uploader
      const filesWithUploader = await Promise.all(files.map(async (file) => {
        let uploaderName = "Inconnu";
        if (file.uploadedBy) {
          const uploader = await storage.getUser(file.uploadedBy);
          if (uploader) {
            if (uploader.firstName || uploader.lastName) {
              uploaderName = `${uploader.firstName || ''} ${uploader.lastName || ''}`.trim();
            } else {
              uploaderName = uploader.username || uploader.email || `ID ${uploader.id}`;
            }
          }
        }
        return { ...file, uploaderName };
      }));
      
      // Return paginated response
      res.json({
        data: filesWithUploader,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      });
    } catch (error) {
      console.error("Error in /api/files:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/files/user/:userId", requireAuth, requireSelfOrAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { page, limit } = req.query;
      
      // Parse pagination parameters
      const pageNum = page ? parseInt(page as string) : 1;
      const limitNum = limit ? parseInt(limit as string) : 12;
      const paginationOptions = { page: pageNum, limit: limitNum };
      
      const result = await storage.getFilesByUser(userId, paginationOptions);
      const files = result.data;
      
      // Ajoute le nom de l'uploader pour chaque fichier
      const filesWithUploader = await Promise.all(files.map(async (file) => {
        let uploaderName = "Inconnu";
        if (file.uploadedBy) {
          const uploader = await storage.getUser(file.uploadedBy);
          if (uploader) {
            if (uploader.firstName || uploader.lastName) {
              uploaderName = `${uploader.firstName || ''} ${uploader.lastName || ''}`.trim();
            } else {
              uploaderName = uploader.username || uploader.email || `ID ${uploader.id}`;
            }
          }
        }
        return { ...file, uploaderName };
      }));
      
      // Return paginated response
      res.json({
        data: filesWithUploader,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      });
    } catch (error) {
      console.error("Error in /api/files/user/:userId:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/files", requireAuth, (req: AuthRequest, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
              message: "Fichier trop volumineux", 
              details: "La taille maximale autorisée est de 10MB" 
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
              message: "Trop de fichiers", 
              details: "Maximum 10 fichiers autorisés" 
            });
          }
        }
        return res.status(400).json({ 
          message: "Erreur de fichier", 
          details: err.message 
        });
      }
      next();
    });
  }, async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Aucun fichier fourni" });
      }

      const { department, category, description } = req.body;
      
      // Validate required fields
      if (!department && req.user.role !== "user") {
        // Clean up uploaded file if validation fails
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ message: "Département requis" });
      }

      const fileData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileType: path.extname(req.file.originalname).slice(1).toLowerCase(),
        fileSize: req.file.size,
        filePath: req.file.path,
        uploadedBy: req.user.id,
        department: department || req.user.department || undefined,
        category: category || undefined,
        description: description || undefined,
        status: "approved" as const,
      };

      const file = await storage.createFile(fileData);
      
      // Log successful upload
      console.log(`File uploaded successfully: ${fileData.originalName} by user ${req.user.id}`);
      
      res.json(file);
    } catch (error) {
      console.error("File upload error:", error);
      
      // Clean up uploaded file if database operation fails
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error("Failed to cleanup file:", cleanupError);
        }
      }
      
      res.status(500).json({ message: "Échec de l'upload du fichier" });
    }
  });

  app.delete("/api/files/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get file info before deletion to delete physical file
      const file = await storage.getFile(id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Delete physical file
      if (fs.existsSync(file.filePath)) {
        fs.unlinkSync(file.filePath);
      }

      // Delete from database
      const success = await storage.deleteFile(id);
      if (!success) {
        return res.status(404).json({ message: "File not found" });
      }
      
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("File deletion error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Statistics routes
  app.get("/api/stats", async (req, res) => {
    try {
      const { userId } = req.query;
      const currentUserId = parseInt(userId as string);
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // For stats, we need all data, so use a large limit
      const allFilesResult = await storage.getAllFiles({ page: 1, limit: 10000 });
      const usersResult = await storage.getAllUsers({ page: 1, limit: 10000 });
      const departments = await storage.getAllDepartments();

      // Filter files based on user role
      let files = allFilesResult.data;
      if (currentUser.role === "user") {
        files = allFilesResult.data.filter(file => file.department === currentUser.department);
      }

      // Get user-specific file count
      const userFilesResult = await storage.getFilesByUser(currentUserId, { page: 1, limit: 10000 });

      const totalFiles = files.length;
      const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0);
      const activeUsers = usersResult.data.filter(user => user.isActive).length;

      // File type distribution
      const fileTypes = files.reduce((acc, file) => {
        acc[file.fileType] = (acc[file.fileType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        totalFiles,
        totalSize,
        activeUsers,
        totalDepartments: departments.length,
        fileTypes,
        userFiles: userFilesResult.data.length,
        totalUsers: usersResult.data.length,
      });
    } catch (error) {
      console.error("Error in /api/stats:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
