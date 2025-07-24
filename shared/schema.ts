import { z } from "zod";

// Prisma-based type definitions that match the Prisma schema
export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: string;
  department: string | null;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin: Date | null;
}

export interface Department {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
}

export interface File {
  id: number;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedBy: number;
  department: string | null;
  category: string | null;
  description: string | null;
  status: string;
  createdAt: Date;
  isDeleted: boolean;
}

// Zod schemas for validation
export const insertUserSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["superuser", "admin", "user"]).default("user"),
  department: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const insertDepartmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const insertFileSchema = z.object({
  filename: z.string().min(1),
  originalName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().positive(),
  filePath: z.string().min(1),
  uploadedBy: z.number().positive(),
  department: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type InsertFile = z.infer<typeof insertFileSchema>;
