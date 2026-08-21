PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_files" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "department" TEXT,
    "category" TEXT,
    "description" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" INTEGER,
    "reviewedAt" DATETIME,
    "reviewComment" TEXT,
    "uploadedBy" INTEGER,
    CONSTRAINT "files_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "files_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "files_department_fkey" FOREIGN KEY ("department") REFERENCES "departments" ("name") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_files" (
    "id", "filename", "originalName", "fileType", "fileSize", "filePath",
    "department", "category", "description", "isDeleted", "createdAt",
    "status", "uploadedBy"
)
SELECT
    "id", "filename", "originalName", "fileType", "fileSize", "filePath",
    "department", "category", "description", "isDeleted", "createdAt",
    'pending', "uploadedBy"
FROM "files";

DROP TABLE "files";
ALTER TABLE "new_files" RENAME TO "files";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
