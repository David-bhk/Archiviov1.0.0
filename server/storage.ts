import { PrismaClient } from '@prisma/client'
import { type User, type InsertUser, type Department, type InsertDepartment, type File, type InsertFile } from "@shared/schema";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser & { lastLogin: Date }>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getUsersByDepartment(department: string): Promise<User[]>;
  
  // Department management
  getDepartment(id: number): Promise<Department | undefined>;
  getDepartmentByName(name: string): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  getAllDepartments(): Promise<Department[]>;
  
  // File management
  getFile(id: number): Promise<File | undefined>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, file: Partial<InsertFile>): Promise<File | undefined>;
  deleteFile(id: number): Promise<boolean>;
  getAllFiles(): Promise<File[]>;
  getFilesByUser(userId: number): Promise<File[]>;
  getFilesByDepartment(department: string): Promise<File[]>;
  searchFiles(query: string): Promise<File[]>;
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

  async getAllUsers(): Promise<User[]> {
    const users = await this.prisma.user.findMany();
    return users.map(this.mapPrismaUserToUser);
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

  // File methods
  async getFile(id: number): Promise<File | undefined> {
    const file = await this.prisma.file.findUnique({
      where: { id },
    });
    return file ? this.mapPrismaFileToFile(file) : undefined;
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const file = await this.prisma.file.create({
      data: insertFile,
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

  async getAllFiles(): Promise<File[]> {
    const files = await this.prisma.file.findMany({
      where: { isDeleted: false },
    });
    return files.map(this.mapPrismaFileToFile);
  }

  async getFilesByUser(userId: number): Promise<File[]> {
    const files = await this.prisma.file.findMany({
      where: { 
        uploadedBy: userId,
        isDeleted: false 
      },
    });
    return files.map(this.mapPrismaFileToFile);
  }

  async getFilesByDepartment(department: string): Promise<File[]> {
    const files = await this.prisma.file.findMany({
      where: { 
        department,
        isDeleted: false 
      },
    });
    return files.map(this.mapPrismaFileToFile);
  }

  async searchFiles(query: string): Promise<File[]> {
    const files = await this.prisma.file.findMany({
      where: {
        isDeleted: false,
        OR: [
          { originalName: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
    });
    return files.map(this.mapPrismaFileToFile);
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
    isActive: prismaUser.isActive,
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
    isDeleted: prismaFile.isDeleted,
    createdAt: prismaFile.createdAt,
  });
}

export const storage = new PrismaStorage();
