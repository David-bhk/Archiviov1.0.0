import { PrismaClient } from '@prisma/client'
import { type User, type InsertUser, type Department, type InsertDepartment, type File, type InsertFile } from "@shared/schema";

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser & { lastLogin: Date }>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(options?: PaginationOptions): Promise<PaginatedResult<User>>;
  getUsersByDepartment(department: string): Promise<User[]>;
  
  // Department management
  getDepartment(id: number): Promise<Department | undefined>;
  getDepartmentByName(name: string): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  getAllDepartments(): Promise<Department[]>;
  deleteDepartment(id: number): Promise<boolean>;
  updateDepartment(id: number, data: Partial<InsertDepartment>): Promise<Department | undefined>;
  
  // File management
  getFile(id: number): Promise<File | undefined>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, file: Partial<InsertFile>): Promise<File | undefined>;
  deleteFile(id: number): Promise<boolean>;
  getAllFiles(options?: PaginationOptions): Promise<PaginatedResult<File>>;
  getFilesByUser(userId: number, options?: PaginationOptions): Promise<PaginatedResult<File>>;
  getFilesByDepartment(department: string, options?: PaginationOptions): Promise<PaginatedResult<File>>;
  searchFiles(query: string, options?: PaginationOptions): Promise<PaginatedResult<File>>;

  // Activity management
  createActivity(activity: { type: string; userId?: number; fileId?: number; description?: string }): Promise<any>;
  getRecentActivities(limit?: number): Promise<any[]>;
}

export class PrismaStorage implements IStorage {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user ? this.mapPrismaUserToUser(user) : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });
    return user ? this.mapPrismaUserToUser(user) : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    return user ? this.mapPrismaUserToUser(user) : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        ...insertUser,
        role: insertUser.role?.toUpperCase() as any || 'USER',
      },
    });
    return this.mapPrismaUserToUser(user);
  }

  async updateUser(id: number, updateData: Partial<InsertUser & { lastLogin: Date }>): Promise<User | undefined> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: updateData,
      });
      return this.mapPrismaUserToUser(user);
    } catch (error) {
      return undefined;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      await this.prisma.user.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getAllUsers(options: PaginationOptions = {}): Promise<PaginatedResult<User>> {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const [total, users] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: users.map(this.mapPrismaUserToUser),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUsersByDepartment(department: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { department },
    });
    return users.map(this.mapPrismaUserToUser);
  }

  // Department methods
  async getDepartment(id: number): Promise<Department | undefined> {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });
    return department ? this.mapPrismaDepartmentToDepartment(department) : undefined;
  }

  async getDepartmentByName(name: string): Promise<Department | undefined> {
    const department = await this.prisma.department.findUnique({
      where: { name },
    });
    return department ? this.mapPrismaDepartmentToDepartment(department) : undefined;
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const department = await this.prisma.department.create({
      data: insertDepartment,
    });
    return this.mapPrismaDepartmentToDepartment(department);
  }

  async getAllDepartments(): Promise<Department[]> {
    const departments = await this.prisma.department.findMany();
    return departments.map(this.mapPrismaDepartmentToDepartment);
  }

  // Department update
  async updateDepartment(id: number, data: Partial<InsertDepartment>): Promise<Department | undefined> {
    try {
      const department = await this.prisma.department.update({
        where: { id },
        data,
      });
      return this.mapPrismaDepartmentToDepartment(department);
    } catch (error) {
      return undefined;
    }
  }

  // Department delete
  async deleteDepartment(id: number): Promise<boolean> {
    try {
      await this.prisma.department.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // File methods
  async getFile(id: number): Promise<File | undefined> {
    const file = await this.prisma.file.findUnique({
      where: { id },
    });
    return file ? this.mapPrismaFileToFile(file) : undefined;
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    // Utilise les bons champs pour Prisma
    const file = await this.prisma.file.create({
      data: {
        filename: insertFile.filename,
        originalName: insertFile.originalName,
        fileType: insertFile.fileType,
        fileSize: insertFile.fileSize,
        filePath: insertFile.filePath,
        department: insertFile.department || null,
        category: insertFile.category || null,
        description: insertFile.description || null,
        uploadedBy: insertFile.uploadedBy ?? null,
        // Les champs status, isDeleted, createdAt sont gérés par Prisma (default)
      },
    });
    return this.mapPrismaFileToFile(file);
  }

  async updateFile(id: number, updateData: Partial<InsertFile>): Promise<File | undefined> {
    try {
      const file = await this.prisma.file.update({
        where: { id },
        data: updateData,
      });
      return this.mapPrismaFileToFile(file);
    } catch (error) {
      return undefined;
    }
  }

  async deleteFile(id: number): Promise<boolean> {
    try {
      await this.prisma.file.update({
        where: { id },
        data: { isDeleted: true },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getAllFiles(options: PaginationOptions = {}): Promise<PaginatedResult<File>> {
    const { page = 1, limit = 12 } = options;
    const skip = (page - 1) * limit;

    const [total, files] = await Promise.all([
      this.prisma.file.count({ where: { isDeleted: false } }),
      this.prisma.file.findMany({
        where: { isDeleted: false },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: files.map(this.mapPrismaFileToFile),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFilesByUser(userId: number, options: PaginationOptions = {}): Promise<PaginatedResult<File>> {
    const { page = 1, limit = 12 } = options;
    const skip = (page - 1) * limit;

    const where = { 
      uploadedBy: userId,
      isDeleted: false 
    };

    const [total, files] = await Promise.all([
      this.prisma.file.count({ where }),
      this.prisma.file.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: files.map(this.mapPrismaFileToFile),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFilesByDepartment(department: string, options: PaginationOptions = {}): Promise<PaginatedResult<File>> {
    const { page = 1, limit = 12 } = options;
    const skip = (page - 1) * limit;

    const where = { 
      department,
      isDeleted: false 
    };

    const [total, files] = await Promise.all([
      this.prisma.file.count({ where }),
      this.prisma.file.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: files.map(this.mapPrismaFileToFile),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async searchFiles(query: string, options: PaginationOptions = {}): Promise<PaginatedResult<File>> {
    const { page = 1, limit = 12 } = options;
    const skip = (page - 1) * limit;

    const where = {
      isDeleted: false,
      OR: [
        { originalName: { contains: query } },
        { description: { contains: query } },
      ],
    };

    const [total, files] = await Promise.all([
      this.prisma.file.count({ where }),
      this.prisma.file.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: files.map(this.mapPrismaFileToFile),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Mapping functions
  private mapPrismaUserToUser = (prismaUser: any): User => ({
    id: prismaUser.id,
    username: prismaUser.username,
    email: prismaUser.email,
    password: prismaUser.password,
    role: prismaUser.role.toLowerCase(),
    department: prismaUser.department,
    firstName: prismaUser.firstName,
    lastName: prismaUser.lastName,
    isActive: prismaUser.isActive === undefined ? true : prismaUser.isActive,
    createdAt: prismaUser.createdAt,
    lastLogin: prismaUser.lastLogin,
  });

  private mapPrismaDepartmentToDepartment = (prismaDepartment: any): Department => ({
    id: prismaDepartment.id,
    name: prismaDepartment.name,
    description: prismaDepartment.description,
    createdAt: prismaDepartment.createdAt,
  });

  private mapPrismaFileToFile = (prismaFile: any): File => ({
    id: prismaFile.id,
    filename: prismaFile.filename,
    originalName: prismaFile.originalName,
    fileType: prismaFile.fileType,
    fileSize: prismaFile.fileSize,
    filePath: prismaFile.filePath,
    uploadedBy: prismaFile.uploadedBy,
    department: prismaFile.department,
    category: prismaFile.category,
    description: prismaFile.description,
    status: prismaFile.status,
    isDeleted: prismaFile.isDeleted,
    createdAt: prismaFile.createdAt,
  });
  // Activity methods
  async createActivity(activity: { type: string; userId?: number; fileId?: number; description?: string }): Promise<any> {
    return await this.prisma.activity.create({
      data: {
        type: activity.type,
        userId: activity.userId,
        fileId: activity.fileId,
        description: activity.description,
      },
    });
  }

  async getRecentActivities(limit: number = 10): Promise<any[]> {
    return await this.prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: true,
        file: true,
      },
    });
  }
}

export const storage = new PrismaStorage();
