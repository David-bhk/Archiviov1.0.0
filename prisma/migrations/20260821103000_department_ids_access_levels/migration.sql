PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

ALTER TABLE "departments"
ADD COLUMN "accessLevel" INTEGER
CHECK ("accessLevel" IS NULL OR "accessLevel" BETWEEN 1 AND 4);

ALTER TABLE "users"
ADD COLUMN "departmentId" INTEGER
REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "users"
SET "departmentId" = (
    SELECT "departments"."id"
    FROM "departments"
    WHERE "departments"."name" = "users"."department"
)
WHERE "department" IS NOT NULL;

CREATE TABLE "new_files" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "department" TEXT,
    "departmentId" INTEGER,
    "classificationLevel" INTEGER CHECK ("classificationLevel" IS NULL OR "classificationLevel" BETWEEN 1 AND 4),
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
    CONSTRAINT "files_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_files" (
    "id", "filename", "originalName", "fileType", "fileSize", "filePath",
    "department", "departmentId", "category", "description", "isDeleted",
    "createdAt", "status", "reviewedBy", "reviewedAt", "reviewComment", "uploadedBy"
)
SELECT
    "files"."id", "files"."filename", "files"."originalName", "files"."fileType",
    "files"."fileSize", "files"."filePath", "files"."department",
    "departments"."id", "files"."category", "files"."description",
    "files"."isDeleted", "files"."createdAt", "files"."status",
    "files"."reviewedBy", "files"."reviewedAt", "files"."reviewComment",
    "files"."uploadedBy"
FROM "files"
LEFT JOIN "departments" ON "departments"."name" = "files"."department";

DROP TABLE "files";
ALTER TABLE "new_files" RENAME TO "files";

CREATE INDEX "users_departmentId_idx" ON "users"("departmentId");
CREATE INDEX "files_departmentId_idx" ON "files"("departmentId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
