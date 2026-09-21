import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { File } from "@shared/schema";
import {
  resolveAvailableDocumentPath,
  toPublicDocument,
} from "./document-presentation";

let temporaryDirectory = "";

function documentFixture(overrides: Partial<File> = {}): File {
  return {
    id: 1,
    filename: "stored.pdf",
    originalName: "rapport.pdf",
    fileType: "application/pdf",
    fileSize: 7,
    filePath: "stored.pdf",
    uploadedBy: 1,
    department: "IT",
    departmentId: 1,
    classificationLevel: 1,
    category: "Rapport",
    description: null,
    status: "archived",
    reviewedBy: 1,
    reviewedAt: new Date("2026-09-21T10:00:00.000Z"),
    reviewComment: "Validé",
    createdAt: new Date("2026-09-21T09:00:00.000Z"),
    isDeleted: false,
    ...overrides,
  };
}

beforeEach(() => {
  temporaryDirectory = mkdtempSync(path.join(tmpdir(), "archivio-document-presentation-"));
});

afterEach(() => {
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe("document presentation", () => {
  it("marks a regular file with the recorded size as available", () => {
    const absolutePath = path.join(temporaryDirectory, "stored.pdf");
    writeFileSync(absolutePath, "contenu");
    const document = documentFixture();

    expect(resolveAvailableDocumentPath(document, () => absolutePath)).toBe(absolutePath);
    expect(toPublicDocument(document, () => absolutePath).isAvailable).toBe(true);
  });

  it("marks missing or size-mismatched content as unavailable", () => {
    const wrongSizePath = path.join(temporaryDirectory, "wrong-size.pdf");
    writeFileSync(wrongSizePath, "x");
    const document = documentFixture();

    expect(resolveAvailableDocumentPath(document, () => path.join(temporaryDirectory, "missing.pdf"))).toBeNull();
    expect(resolveAvailableDocumentPath(document, () => wrongSizePath)).toBeNull();
  });

  it("omits the internal storage path from public responses", () => {
    const publicDocument = toPublicDocument(
      documentFixture({ filePath: "private/storage-location.pdf" }),
      () => null,
    );

    expect(publicDocument.isAvailable).toBe(false);
    expect(publicDocument).not.toHaveProperty("filePath");
    expect(JSON.stringify(publicDocument)).not.toContain("private/storage-location.pdf");
  });
});
