import { describe, expect, it } from "vitest";
import {
  canCreateUser,
  canDeleteDocument,
  canDeleteUser,
  canDownloadDocument,
} from "./authorization";

const document = {
  uploadedBy: 3,
  department: "IT",
  status: "archived" as const,
  isDeleted: false,
};

describe("document authorization", () => {
  it("allows a regular user to download an archived document from their department", () => {
    expect(
      canDownloadDocument(
        { id: 8, role: "USER", department: "IT", isActive: true },
        document,
      ),
    ).toBe(true);
  });

  it("does not expose pending documents to regular users", () => {
    expect(
      canDownloadDocument(
        { id: 3, role: "USER", department: "IT", isActive: true },
        { ...document, status: "pending" },
      ),
    ).toBe(false);
  });

  it("limits administrators to documents in their department", () => {
    expect(
      canDownloadDocument(
        { id: 2, role: "ADMIN", department: "RH", isActive: true },
        document,
      ),
    ).toBe(false);
  });

  it("allows a superuser to access a pending non-deleted document", () => {
    expect(
      canDownloadDocument(
        { id: 1, role: "SUPERUSER", department: "Administration", isActive: true },
        { ...document, status: "pending" },
      ),
    ).toBe(true);
  });

  it("never allows access to a soft-deleted document", () => {
    expect(
      canDownloadDocument(
        { id: 1, role: "SUPERUSER", department: "Administration", isActive: true },
        { ...document, isDeleted: true },
      ),
    ).toBe(false);
  });

  it("allows only an administrator from the same department to delete a document", () => {
    expect(
      canDeleteDocument(
        { id: 2, role: "ADMIN", department: "IT", isActive: true },
        document,
      ),
    ).toBe(true);
    expect(
      canDeleteDocument(
        { id: 2, role: "ADMIN", department: "RH", isActive: true },
        document,
      ),
    ).toBe(false);
  });
});

describe("user administration authorization", () => {
  it("limits an administrator to creating regular users in their department", () => {
    const admin = { id: 2, role: "ADMIN" as const, department: "IT", isActive: true };

    expect(canCreateUser(admin, { role: "USER", department: "IT" })).toBe(true);
    expect(canCreateUser(admin, { role: "ADMIN", department: "IT" })).toBe(false);
    expect(canCreateUser(admin, { role: "USER", department: "RH" })).toBe(false);
  });

  it("prevents self-deletion and deletion of a superuser", () => {
    const superuser = {
      id: 1,
      role: "SUPERUSER" as const,
      department: "Administration",
      isActive: true,
    };

    expect(canDeleteUser(superuser, superuser)).toBe(false);
    expect(
      canDeleteUser(superuser, {
        id: 9,
        role: "SUPERUSER",
        department: "Administration",
      }),
    ).toBe(false);
  });
});
