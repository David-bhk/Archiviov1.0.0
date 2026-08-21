import path from "path";
import { describe, expect, it } from "vitest";
import { resolveStoredFilePath, uploadsRoot } from "./file-storage";

describe("document storage paths", () => {
  it("resolves a stored filename inside the configured root", () => {
    expect(resolveStoredFilePath("document.pdf")).toBe(path.join(uploadsRoot, "document.pdf"));
  });

  it("rejects parent-directory traversal", () => {
    expect(resolveStoredFilePath("../secret.txt")).toBeNull();
  });

  it("rejects an absolute path outside the configured root", () => {
    const outside = path.resolve(uploadsRoot, "..", "outside.pdf");
    expect(resolveStoredFilePath(outside)).toBeNull();
  });
});
