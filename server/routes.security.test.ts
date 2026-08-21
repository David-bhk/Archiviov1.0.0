import express from "express";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import type { Server } from "http";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storageMocks = vi.hoisted(() => ({
  getFile: vi.fn(),
  deleteFile: vi.fn(),
  getUser: vi.fn(),
  getAllFiles: vi.fn(),
  getAllUsers: vi.fn(),
  getAllDepartments: vi.fn(),
  getFilesByUser: vi.fn(),
  createUser: vi.fn(),
  reviewFile: vi.fn(),
  getFilesWithFilters: vi.fn(),
}));

vi.mock("./storage", () => ({ storage: storageMocks }));

import { generateToken } from "./middleware/auth";
import { registerRoutes } from "./routes";

let server: Server | undefined;
let baseUrl = "";
let temporaryDirectory = "";

async function startServer() {
  const app = express();
  app.use(express.json());
  server = await registerRoutes(app);
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Le serveur de test n'a pas obtenu de port local");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
}

function userToken() {
  return generateToken({ id: 10, role: "USER", department: "IT" });
}

function adminToken() {
  return generateToken({ id: 20, role: "ADMIN", department: "IT" });
}

beforeEach(async () => {
  vi.clearAllMocks();
  temporaryDirectory = mkdtempSync(path.join(tmpdir(), "archivio-security-test-"));
  await startServer();
});

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) =>
      server?.close((error) => (error ? reject(error) : resolve())),
    );
  }
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe("critical route protections", () => {
  it("forbids a regular user from downloading a foreign document", async () => {
    const filePath = path.join(temporaryDirectory, "foreign-document.pdf");
    writeFileSync(filePath, "document sensible");
    storageMocks.getFile.mockResolvedValue({
      id: 90,
      filename: "stored.pdf",
      originalName: "foreign-document.pdf",
      filePath,
      department: "Administration",
      uploadedBy: 99,
      isDeleted: false,
      status: "archived",
    });
    storageMocks.getUser.mockResolvedValue({
      id: 10,
      role: "USER",
      department: "IT",
      isActive: true,
    });

    const response = await fetch(`${baseUrl}/api/files/90/download`, {
      headers: { Authorization: `Bearer ${userToken()}` },
    });

    expect(response.status).toBe(403);
  });

  it("forbids a regular user from deleting a foreign document", async () => {
    const filePath = path.join(temporaryDirectory, "foreign-document.pdf");
    writeFileSync(filePath, "document sensible");
    storageMocks.getFile.mockResolvedValue({
      id: 91,
      filePath,
      department: "Administration",
      uploadedBy: 99,
    });
    storageMocks.deleteFile.mockResolvedValue(true);
    storageMocks.getUser.mockResolvedValue({
      id: 10,
      role: "USER",
      department: "IT",
      isActive: true,
    });

    const response = await fetch(`${baseUrl}/api/files/91`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken()}` },
    });

    expect(response.status).toBe(403);
  });

  it("soft-deletes an authorized document without removing its physical file", async () => {
    const filePath = path.join(temporaryDirectory, "retained-document.pdf");
    writeFileSync(filePath, "document à conserver");
    storageMocks.getFile.mockResolvedValue({
      id: 92,
      filePath,
      department: "Administration",
      uploadedBy: 99,
      isDeleted: false,
    });
    storageMocks.getUser.mockResolvedValue({
      id: 1,
      role: "SUPERUSER",
      department: "Administration",
      isActive: true,
    });
    storageMocks.deleteFile.mockResolvedValue(true);

    const response = await fetch(`${baseUrl}/api/files/92`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${generateToken({
          id: 1,
          role: "SUPERUSER",
          department: "Administration",
        })}`,
      },
    });

    expect(response.status).toBe(200);
    expect(storageMocks.deleteFile).toHaveBeenCalledWith(92);
    expect(existsSync(filePath)).toBe(true);
  });

  it("rejects unauthenticated statistics identity supplied by the client", async () => {
    const response = await fetch(`${baseUrl}/api/stats?userId=1`);

    expect(response.status).toBe(401);
  });

  it("forbids an administrator from creating a superuser", async () => {
    storageMocks.getUser.mockResolvedValue({
      id: 20,
      role: "ADMIN",
      department: "IT",
      isActive: true,
    });
    storageMocks.createUser.mockImplementation(async (user) => ({
      ...user,
      id: 50,
      isActive: true,
      createdAt: new Date(),
      lastLogin: null,
    }));

    const response = await fetch(`${baseUrl}/api/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "forbidden-superuser",
        email: "forbidden@example.test",
        password: "temporary-password",
        role: "SUPERUSER",
        department: "IT",
        firstName: "Test",
        lastName: "Interdit",
      }),
    });

    expect(response.status).toBe(403);
  });

  it("archives a pending document with an identified and justified decision", async () => {
    storageMocks.getUser.mockResolvedValue({
      id: 20,
      role: "ADMIN",
      department: "IT",
      isActive: true,
    });
    storageMocks.getFile.mockResolvedValue({
      id: 93,
      department: "IT",
      isDeleted: false,
      status: "pending",
    });
    storageMocks.reviewFile.mockResolvedValue({ id: 93, status: "archived" });

    const response = await fetch(`${baseUrl}/api/files/93/approve`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ justification: "Document vérifié et conforme" }),
    });

    expect(response.status).toBe(200);
    expect(storageMocks.reviewFile).toHaveBeenCalledWith(
      93,
      20,
      "archived",
      "Document vérifié et conforme",
    );
  });

  it("refuses a review decision without a valid justification", async () => {
    storageMocks.getUser.mockResolvedValue({
      id: 20,
      role: "ADMIN",
      department: "IT",
      isActive: true,
    });
    storageMocks.getFile.mockResolvedValue({
      id: 94,
      department: "IT",
      isDeleted: false,
      status: "pending",
    });

    const response = await fetch(`${baseUrl}/api/files/94/reject`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ justification: "" }),
    });

    expect(response.status).toBe(400);
    expect(storageMocks.reviewFile).not.toHaveBeenCalled();
  });

  it("limits an administrator's pending queue to their department", async () => {
    storageMocks.getUser.mockResolvedValue({
      id: 20,
      role: "ADMIN",
      department: "IT",
      isActive: true,
    });
    storageMocks.getFilesWithFilters.mockResolvedValue({
      data: [], total: 0, page: 1, limit: 20, totalPages: 0,
    });

    const response = await fetch(`${baseUrl}/api/files/pending`, {
      headers: { Authorization: `Bearer ${adminToken()}` },
    });

    expect(response.status).toBe(200);
    expect(storageMocks.getFilesWithFilters).toHaveBeenCalledWith(
      { status: "pending", department: "IT" },
      { page: 1, limit: 20 },
    );
  });
});
