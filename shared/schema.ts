import { z } from "zod";

export const roles = ["SUPERUSER", "ADMIN", "USER"] as const;
export const roleSchema = z.enum(roles);
export type Role = z.infer<typeof roleSchema>;
export const documentStatuses = ["pending", "archived", "rejected"] as const;
export const documentStatusSchema = z.enum(documentStatuses);
export type DocumentStatus = z.infer<typeof documentStatusSchema>;
export const accessLevels = [1, 2, 3, 4] as const;
export const accessLevelSchema = z.union([
  z.literal(accessLevels[0]),
  z.literal(accessLevels[1]),
  z.literal(accessLevels[2]),
  z.literal(accessLevels[3]),
]);
export type AccessLevel = z.infer<typeof accessLevelSchema>;

// Prisma-based type definitions that match the Prisma schema
export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: Role;
  department: string | null;
  departmentId: number | null;
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
  accessLevel: AccessLevel | null;
  createdAt: Date;
}

export interface File {
  id: number;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedBy: number | null;
  department: string | null;
  departmentId: number | null;
  classificationLevel: AccessLevel | null;
  category: string | null;
  description: string | null;
  status: DocumentStatus;
  reviewedBy: number | null;
  reviewedAt: Date | null;
  reviewComment: string | null;
  createdAt: Date;
  isDeleted: boolean;
}

export interface ActivitySummary {
  id: number;
  type: string;
  userId: number | null;
  fileId: number | null;
  description: string | null;
  createdAt: Date;
  user: Pick<User, "id" | "firstName" | "lastName" | "role" | "department"> | null;
  file: Pick<File, "id" | "originalName" | "department"> | null;
}

// Zod schemas for validation
export const insertUserSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: roleSchema.default("USER"),
  department: z.string().min(1),
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
  status: documentStatusSchema.default("pending"),
});

export const reviewDocumentSchema = z.object({
  justification: z.string().trim().min(3).max(1000),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type InsertFile = z.infer<typeof insertFileSchema>;
