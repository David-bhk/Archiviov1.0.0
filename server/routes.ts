
import type { Express } from "express";
import { generateToken, requireAuth, requireRole, requireSelfOrAdmin, AuthRequest } from "./middleware/auth";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertDepartmentSchema, reviewDocumentSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";
import { randomUUID } from "crypto";
import {
  canCreateUser,
  canDeleteDocument,
  canDeleteUser,
  canDownloadDocument,
  canReviewDocument,
} from "./services/authorization";
import {
  ensureUploadsRoot,
  removeStoredFile,
  resolveStoredFilePath,
  uploadsRoot,
} from "./services/file-storage";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Ensure uploads directory exists
ensureUploadsRoot();

// Configure multer for file uploads
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsRoot);
  },
  filename: (req, file, cb) => {
    cb(null, randomUUID() + path.extname(file.originalname).toLowerCase());
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
  // Configuration CORS pour le réseau local
  app.use(cors({
    origin: [
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      'http://192.168.0.103:5000',
      'http://localhost:5173', // Vite dev server
      'http://192.168.0.103:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Route pour récupérer les activités récentes
  app.get("/api/activities", requireAuth, requireRole("ADMIN", "SUPERUSER"), async (req: AuthRequest, res) => {
    try {
      const requestedLimit = Number(req.query.limit);
      const limit = Number.isInteger(requestedLimit)
        ? Math.min(100, Math.max(1, requestedLimit))
        : 10;
      const activities = await storage.getRecentActivities(limit);
      res.json(activities.map((activity) => ({
        id: activity.id,
        type: activity.type,
        userId: activity.userId,
        fileId: activity.fileId,
        description: activity.description,
        createdAt: activity.createdAt,
        user: activity.user ? {
          id: activity.user.id,
          firstName: activity.user.firstName,
          lastName: activity.user.lastName,
          role: activity.user.role,
          department: activity.user.department,
        } : null,
        file: activity.file ? {
          id: activity.file.id,
          originalName: activity.file.originalName,
          department: activity.file.department,
        } : null,
      })));
    } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
    }
  });
  // Route pour approuver un fichier (admin/superuser)
  app.patch("/api/files/:id/approve", requireAuth, requireRole("ADMIN", "SUPERUSER"), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!req.user) {
        return res.status(401).json({ message: "Non authentifié" });
      }
      const [actor, existingFile] = await Promise.all([
        storage.getUser(req.user.id),
        storage.getFile(id),
      ]);
      if (!actor || !actor.isActive) {
        return res.status(401).json({ message: "Compte invalide ou inactif" });
      }
      if (!existingFile) {
        return res.status(404).json({ message: "Fichier non trouvé" });
      }
      if (!canReviewDocument(actor, existingFile)) {
        return res.status(403).json({ message: "Accès interdit" });
      }
      if (existingFile.status !== "pending") {
        return res.status(409).json({ message: "Ce document a déjà été traité" });
      }
      const { justification } = reviewDocumentSchema.parse(req.body);
      const file = await storage.reviewFile(id, actor.id, "archived", justification);
      if (!file) {
        return res.status(404).json({ message: "Fichier non trouvé" });
      }
      res.json({ message: "Fichier approuvé", file });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Justification invalide" });
      }
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
      if (!req.user) {
        return res.status(401).json({ message: "Non authentifié" });
      }
      const actor = await storage.getUser(req.user.id);
      if (!actor || !actor.isActive) {
        return res.status(401).json({ message: "Compte invalide ou inactif" });
      }
      if (!canDownloadDocument(actor, file)) {
        return res.status(403).json({ message: "Accès interdit" });
      }
      const absolutePath = resolveStoredFilePath(file.filePath);
      if (!absolutePath) {
        return res.status(400).json({ message: "Chemin de fichier invalide" });
      }
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
  app.patch("/api/files/:id/reject", requireAuth, requireRole("ADMIN", "SUPERUSER"), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!req.user) return res.status(401).json({ message: "Non authentifié" });
      const [actor, existingFile] = await Promise.all([
        storage.getUser(req.user.id),
        storage.getFile(id),
      ]);
      if (!actor || !actor.isActive) return res.status(401).json({ message: "Compte invalide ou inactif" });
      if (!existingFile) return res.status(404).json({ message: "Fichier non trouvé" });
      if (!canReviewDocument(actor, existingFile)) return res.status(403).json({ message: "Accès interdit" });
      if (existingFile.status !== "pending") return res.status(409).json({ message: "Ce document a déjà été traité" });
      const { justification } = reviewDocumentSchema.parse(req.body);
      const file = await storage.reviewFile(id, actor.id, "rejected", justification);
      if (!file) return res.status(404).json({ message: "Fichier non trouvé" });
      res.json({ message: "Fichier refusé", file });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Justification invalide" });
      }
      res.status(500).json({ message: "Erreur lors du refus" });
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
          isActive: user.isActive,
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
  app.get("/api/users", requireAuth, requireRole("ADMIN", "SUPERUSER"), async (req, res) => {
    try {
      const authRequest = req as AuthRequest;
      if (!authRequest.user) {
        return res.status(401).json({ message: "Non authentifié" });
      }
      const actor = await storage.getUser(authRequest.user.id);
      if (!actor || !actor.isActive) {
        return res.status(401).json({ message: "Compte invalide ou inactif" });
      }
      const { page, limit } = req.query;
      
      // Parse pagination parameters
      const pageNum = page ? parseInt(page as string) : 1;
      const limitNum = limit ? parseInt(limit as string) : 10;
      const paginationOptions = { page: pageNum, limit: limitNum };
      
      let result;
      if (actor.role === "SUPERUSER") {
        result = await storage.getAllUsers(paginationOptions);
      } else {
        const departmentUsers = actor.department
          ? await storage.getUsersByDepartment(actor.department)
          : [];
        const startIndex = (pageNum - 1) * limitNum;
        const data = departmentUsers.slice(startIndex, startIndex + limitNum);
        result = {
          data,
          total: departmentUsers.length,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(departmentUsers.length / limitNum),
        };
      }
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

  app.post("/api/users", requireAuth, requireRole("ADMIN", "SUPERUSER"), async (req, res) => {
    try {
      const authRequest = req as AuthRequest;
      if (!authRequest.user) {
        return res.status(401).json({ message: "Non authentifié" });
      }
      const actor = await storage.getUser(authRequest.user.id);
      if (!actor || !actor.isActive) {
        return res.status(401).json({ message: "Compte invalide ou inactif" });
      }
      const userData = insertUserSchema.parse(req.body);
      if (!canCreateUser(actor, userData)) {
        return res.status(403).json({ message: "Accès interdit" });
      }
      
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

  app.delete("/api/users/:id", requireAuth, requireRole("ADMIN", "SUPERUSER"), async (req, res) => {
    try {
      const authRequest = req as AuthRequest;
      if (!authRequest.user) {
        return res.status(401).json({ message: "Non authentifié" });
      }
      const id = parseInt(req.params.id);
      const [actor, target] = await Promise.all([
        storage.getUser(authRequest.user.id),
        storage.getUser(id),
      ]);
      if (!actor || !actor.isActive) {
        return res.status(401).json({ message: "Compte invalide ou inactif" });
      }
      if (!target) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!canDeleteUser(actor, target)) {
        return res.status(403).json({ message: "Accès interdit" });
      }
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

  app.post("/api/departments", requireAuth, requireRole("ADMIN", "SUPERUSER"), async (req, res) => {
    try {
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
  app.put("/api/departments/:id", requireAuth, requireRole("ADMIN", "SUPERUSER"), async (req, res) => {
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
  app.delete("/api/departments/:id", requireAuth, requireRole("ADMIN", "SUPERUSER"), async (req, res) => {
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
  app.get("/api/files/pending", requireAuth, requireRole("ADMIN", "SUPERUSER"), async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Non authentifié" });
      const actor = await storage.getUser(req.user.id);
      if (!actor || !actor.isActive) return res.status(401).json({ message: "Compte invalide ou inactif" });
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const filters = actor.role === "SUPERUSER"
        ? { status: "pending" as const }
        : { status: "pending" as const, department: actor.department || undefined };
      const result = await storage.getFilesWithFilters(filters, { page, limit });
      const data = await Promise.all(result.data.map(async (file) => {
        const uploader = file.uploadedBy ? await storage.getUser(file.uploadedBy) : undefined;
        const uploaderName = uploader
          ? `${uploader.firstName} ${uploader.lastName}`.trim()
          : "Inconnu";
        return { ...file, uploaderName };
      }));
      res.json({ ...result, data });
    } catch {
      res.status(500).json({ message: "Erreur lors du chargement des documents en attente" });
    }
  });

  app.get("/api/files", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { department, search, date, type, page, limit } = req.query;
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: "Non authentifié" });
      }
      const actor = await storage.getUser(currentUser.id);
      if (!actor || !actor.isActive) {
        return res.status(401).json({ message: "Compte invalide ou inactif" });
      }
      
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
      
      let result;
      let files;
      
      // Filter files based on user role
      if (actor.role === "SUPERUSER") {
        result = await storage.getFilesWithFilters(filters, paginationOptions);
        files = result.data;
      } else if (actor.role === "ADMIN") {
        result = await storage.getFilesWithFilters(
          { ...filters, department: actor.department || undefined },
          paginationOptions,
        );
        files = result.data;
      } else {
        // Regular users can only see files they uploaded OR files from their department
        const userFiles = await storage.getFilesByUser(actor.id, { page: 1, limit: 10000 });
        const departmentFilters = {
          ...filters,
          department: actor.department || undefined,
          status: "archived" as const,
        };
        const departmentFiles = await storage.getFilesWithFilters(departmentFilters, { page: 1, limit: 10000 });
        
        // Combine and deduplicate files
        const combinedFiles = [...userFiles.data];
        departmentFiles.data.forEach(file => {
          if (!combinedFiles.find(f => f.id === file.id)) {
            combinedFiles.push(file);
          }
        });
        
        // Apply pagination to combined results
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        files = combinedFiles.slice(startIndex, endIndex);
        
        result = {
          data: files,
          total: combinedFiles.length,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(combinedFiles.length / limitNum)
        };
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
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ message: "Non authentifié" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Aucun fichier fourni" });
      }

      const actor = await storage.getUser(currentUser.id);
      if (!actor || !actor.isActive) {
        removeStoredFile(req.file.filename);
        return res.status(401).json({ message: "Compte invalide ou inactif" });
      }

      const { department, category, description } = req.body;
      const targetDepartment = actor.role === "SUPERUSER"
        ? department || actor.department
        : actor.department;
      
      // Validate required fields
      if (!targetDepartment) {
        // Clean up uploaded file if validation fails
        if (fs.existsSync(req.file.path)) {
          removeStoredFile(req.file.filename);
        }
        return res.status(400).json({ message: "Département requis" });
      }

      const fileData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileType: path.extname(req.file.originalname).slice(1).toLowerCase(),
        fileSize: req.file.size,
        filePath: req.file.filename,
        uploadedBy: currentUser.id,
        department: targetDepartment,
        category: category || undefined,
        description: description || undefined,
        status: "pending" as const,
      };

      const file = await storage.createFile(fileData);
      await storage.createActivity({
        type: "document_uploaded",
        userId: currentUser.id,
        fileId: file.id,
        description: `Document téléversé : ${file.originalName}`,
      });
      
      res.json(file);
    } catch (error) {
      console.error("File upload error:", error);
      
      // Clean up uploaded file if database operation fails
      if (req.file) {
        try {
          removeStoredFile(req.file.filename);
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
      if (!req.user) {
        return res.status(401).json({ message: "Non authentifié" });
      }
      
      const [actor, file] = await Promise.all([
        storage.getUser(req.user.id),
        storage.getFile(id),
      ]);
      if (!actor || !actor.isActive) {
        return res.status(401).json({ message: "Compte invalide ou inactif" });
      }
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      if (!canDeleteDocument(actor, file)) {
        return res.status(403).json({ message: "Accès interdit" });
      }

      // Soft-delete only. Physical purge requires a retention policy.
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
  app.get("/api/stats", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Non authentifié" });
      }
      const currentUserId = req.user.id;
      const currentUser = await storage.getUser(currentUserId);
      
      if (!currentUser || !currentUser.isActive) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // For stats, we need all data, so use a large limit
      const allFilesResult = await storage.getAllFiles({ page: 1, limit: 10000 });
      const usersResult = await storage.getAllUsers({ page: 1, limit: 10000 });
      const departments = await storage.getAllDepartments();

      // Filter files based on user role
      let files = allFilesResult.data;
      if (currentUser.role !== "SUPERUSER") {
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
