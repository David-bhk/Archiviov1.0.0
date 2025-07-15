import { users, departments, files, type User, type InsertUser, type Department, type InsertDepartment, type File, type InsertFile } from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private departments: Map<number, Department>;
  private files: Map<number, File>;
  private currentUserId: number;
  private currentDepartmentId: number;
  private currentFileId: number;

  constructor() {
    this.users = new Map();
    this.departments = new Map();
    this.files = new Map();
    this.currentUserId = 1;
    this.currentDepartmentId = 1;
    this.currentFileId = 1;
    this.initializeData();
  }

  private initializeData() {
    // Initialize departments
    const dept1: Department = {
      id: this.currentDepartmentId++,
      name: "Administration",
      description: "Administration générale",
      createdAt: new Date(),
    };
    const dept2: Department = {
      id: this.currentDepartmentId++,
      name: "Comptabilité",
      description: "Gestion financière",
      createdAt: new Date(),
    };
    const dept3: Department = {
      id: this.currentDepartmentId++,
      name: "Ressources Humaines",
      description: "Gestion du personnel",
      createdAt: new Date(),
    };
    const dept4: Department = {
      id: this.currentDepartmentId++,
      name: "Marketing",
      description: "Communication et marketing",
      createdAt: new Date(),
    };
    const dept5: Department = {
      id: this.currentDepartmentId++,
      name: "IT",
      description: "Informatique",
      createdAt: new Date(),
    };

    this.departments.set(dept1.id, dept1);
    this.departments.set(dept2.id, dept2);
    this.departments.set(dept3.id, dept3);
    this.departments.set(dept4.id, dept4);
    this.departments.set(dept5.id, dept5);

    // Initialize users
    const superUser: User = {
      id: this.currentUserId++,
      username: "john.doe",
      email: "john.doe@archivio.com",
      password: "hashed_password",
      role: "superuser",
      department: "Administration",
      firstName: "John",
      lastName: "Doe",
      isActive: true,
      createdAt: new Date(),
      lastLogin: new Date(),
    };

    const admin: User = {
      id: this.currentUserId++,
      username: "marie.dubois",
      email: "marie.dubois@archivio.com",
      password: "hashed_password",
      role: "admin",
      department: "Comptabilité",
      firstName: "Marie",
      lastName: "Dubois",
      isActive: true,
      createdAt: new Date(),
      lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
    };

    const user: User = {
      id: this.currentUserId++,
      username: "pierre.martin",
      email: "pierre.martin@archivio.com",
      password: "hashed_password",
      role: "user",
      department: "Ressources Humaines",
      firstName: "Pierre",
      lastName: "Martin",
      isActive: true,
      createdAt: new Date(),
      lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000),
    };

    this.users.set(superUser.id, superUser);
    this.users.set(admin.id, admin);
    this.users.set(user.id, user);
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      role: insertUser.role || "user",
      department: insertUser.department || null,
      isActive: true,
      createdAt: new Date(),
      lastLogin: null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser & { lastLogin: Date }>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updateData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersByDepartment(department: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.department === department,
    );
  }

  // Department methods
  async getDepartment(id: number): Promise<Department | undefined> {
    return this.departments.get(id);
  }

  async getDepartmentByName(name: string): Promise<Department | undefined> {
    return Array.from(this.departments.values()).find(
      (dept) => dept.name === name,
    );
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const id = this.currentDepartmentId++;
    const department: Department = {
      ...insertDepartment,
      id,
      description: insertDepartment.description || null,
      createdAt: new Date(),
    };
    this.departments.set(id, department);
    return department;
  }

  async getAllDepartments(): Promise<Department[]> {
    return Array.from(this.departments.values());
  }

  // File methods
  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = this.currentFileId++;
    const file: File = {
      ...insertFile,
      id,
      uploadedBy: insertFile.uploadedBy || null,
      department: insertFile.department || null,
      category: insertFile.category || null,
      description: insertFile.description || null,
      isDeleted: false,
      createdAt: new Date(),
    };
    this.files.set(id, file);
    return file;
  }

  async updateFile(id: number, updateData: Partial<InsertFile>): Promise<File | undefined> {
    const file = this.files.get(id);
    if (!file) return undefined;

    const updatedFile = { ...file, ...updateData };
    this.files.set(id, updatedFile);
    return updatedFile;
  }

  async deleteFile(id: number): Promise<boolean> {
    const file = this.files.get(id);
    if (!file) return false;

    const updatedFile = { ...file, isDeleted: true };
    this.files.set(id, updatedFile);
    return true;
  }

  async getAllFiles(): Promise<File[]> {
    return Array.from(this.files.values()).filter(file => !file.isDeleted);
  }

  async getFilesByUser(userId: number): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      (file) => file.uploadedBy === userId && !file.isDeleted,
    );
  }

  async getFilesByDepartment(department: string): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      (file) => file.department === department && !file.isDeleted,
    );
  }

  async searchFiles(query: string): Promise<File[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.files.values()).filter(
      (file) => 
        !file.isDeleted && 
        (file.originalName.toLowerCase().includes(lowerQuery) ||
         file.description?.toLowerCase().includes(lowerQuery)),
    );
  }
}

export const storage = new MemStorage();
