
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.xlsx', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
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

  // User routes
  app.get("/api/users", requireAuth, requireRole("admin", "superuser"), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const sanitizedUsers = users.map(user => ({
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
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/users", requireAuth, requireRole("admin", "superuser"), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
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
      res.status(400).json({ message: "Invalid user data" });
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
      const users = await storage.getAllUsers();
      const files = await storage.getAllFiles();
      
      // Add counts to each department
      const departmentsWithCounts = departments.map(dept => ({
        ...dept,
        userCount: users.filter(user => user.department === dept.name).length,
        fileCount: files.filter(file => file.department === dept.name).length,
      }));
      
      res.json(departmentsWithCounts);
    } catch (error) {
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
      res.status(400).json({ message: "Invalid department data", error: error.message });
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
      const { department, search, date } = req.query;
      const currentUser = req.user;
      let files;
      if (search) {
        files = await storage.searchFiles(search as string);
      } else if (department) {
        files = await storage.getFilesByDepartment(department as string);
      } else {
        files = await storage.getAllFiles();
      }
      // Filtrage par date (date = nombre de jours)
      if (date) {
        const days = parseInt(date as string);
        if (!isNaN(days)) {
          const now = new Date();
          files = files.filter(file => {
            if (!file.createdAt) return false;
            const fileDate = new Date(file.createdAt);
            const diff = (now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24);
            return diff <= days;
          });
        }
      }
      // Filter files based on user role and department access
      if (currentUser.role === "user") {
        files = files.filter(file => file.department === currentUser.department);
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
      res.json(filesWithUploader);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/files/user/:userId", requireAuth, requireSelfOrAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const files = await storage.getFilesByUser(userId);
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
      res.json(filesWithUploader);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/files", requireAuth, upload.single("file"), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { department, category, description } = req.body;
      // uploadedBy est maintenant sécurisé via req.user
      const fileData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileType: path.extname(req.file.originalname).slice(1).toLowerCase(),
        fileSize: req.file.size,
        filePath: req.file.path,
        uploadedBy: req.user.id,
        department: department || req.user.department || null,
        category: category || null,
        description: description || null,
        // status removed: all files are visible immediately
      };

      const file = await storage.createFile(fileData);
      res.json(file);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "File upload failed" });
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

      const allFiles = await storage.getAllFiles();
      const users = await storage.getAllUsers();
      const departments = await storage.getAllDepartments();

      // Filter files based on user role
      let files = allFiles;
      if (currentUser.role === "user") {
        files = allFiles.filter(file => file.department === currentUser.department);
      }

      // Get user-specific file count
      const userFiles = await storage.getFilesByUser(currentUserId);

      const totalFiles = files.length;
      const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0);
      const activeUsers = users.filter(user => user.isActive).length;

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
        userFiles: userFiles.length,
        totalUsers: users.length,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
