import fs from "fs";
import type { File } from "@shared/schema";
import { resolveStoredFilePath } from "./file-storage";

type StoredPathResolver = (storedPath: string) => string | null;

export type PublicDocument = Omit<File, "filePath"> & {
  isAvailable: boolean;
};

export function resolveAvailableDocumentPath(
  document: File,
  resolvePath: StoredPathResolver = resolveStoredFilePath,
): string | null {
  try {
    const absolutePath = resolvePath(document.filePath);
    if (!absolutePath) return null;
    const stats = fs.lstatSync(absolutePath);
    if (stats.isSymbolicLink() || !stats.isFile() || stats.size !== document.fileSize) {
      return null;
    }
    return absolutePath;
  } catch {
    return null;
  }
}

export function toPublicDocument(
  document: File,
  resolvePath: StoredPathResolver = resolveStoredFilePath,
): PublicDocument {
  const { filePath: _internalFilePath, ...publicFields } = document;
  return {
    ...publicFields,
    isAvailable: Boolean(resolveAvailableDocumentPath(document, resolvePath)),
  };
}
