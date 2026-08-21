import type { DocumentStatus, Role } from "@shared/schema";

export interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  role: Role;
  department?: string;
  firstName: string;
  lastName: string;
  isActive?: boolean;
  createdAt?: Date;
  lastLogin?: Date;
}

export interface Department {
  id: number;
  name: string;
  description?: string;
  userCount?: number;
  fileCount?: number;
  createdAt?: Date;
}

export interface File {
  id: number;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedBy?: number;
  uploaderName?: string; // Ajouté pour affichage frontend
  department?: string;
  category?: string;
  description?: string;
  status: DocumentStatus;
  reviewedBy?: number | null;
  reviewedAt?: Date | null;
  reviewComment?: string | null;
  createdAt?: Date;
  isDeleted?: boolean;
}

// Types pour l'optimisation des performances
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface SearchFilters {
  type: string;
  department: string;
  date: string;
  status?: string;
  size?: { min: number; max: number };
}

export interface FileSearchParams {
  search?: string;
  filters: SearchFilters;
  page: number;
  limit: number;
  sortBy?: 'name' | 'size' | 'date' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export type ViewMode = 'cards' | 'compact' | 'table';

export interface Stats {
  totalFiles: number;
  totalSize: number;
  activeUsers: number;
  totalDepartments: number;
  fileTypes: Record<string, number>;
  userFiles: number;
  totalUsers: number;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

export interface RoleContextType {
  hasAccess: (allowedRoles: Role[]) => boolean;
  canManageUsers: () => boolean;
  canDeleteFile: (file: File) => boolean;
  canDownloadFile: (file: File) => boolean;
  canAccessUserManagement: () => boolean;
  canAccessFile: (file: File) => boolean;
  canManageDepartments: () => boolean;
  canUploadFiles: () => boolean;
}
