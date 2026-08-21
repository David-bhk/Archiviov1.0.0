import fs from "fs";
import path from "path";

function configuredStorageRoot(): string {
  const configured = process.env.UPLOADS_DIR?.trim() || "uploads";
  return path.resolve(process.cwd(), configured);
}

export const uploadsRoot = configuredStorageRoot();

export function ensureUploadsRoot(): void {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

export function resolveStoredFilePath(storedPath: string): string | null {
  const candidate = path.isAbsolute(storedPath)
    ? path.resolve(storedPath)
    : path.resolve(uploadsRoot, storedPath);
  const relative = path.relative(uploadsRoot, candidate);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return candidate;
}

export function removeStoredFile(storedPath: string): void {
  const absolutePath = resolveStoredFilePath(storedPath);
  if (absolutePath && fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}
