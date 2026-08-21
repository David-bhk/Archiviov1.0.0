import type { File, Role } from "@shared/schema";

export interface AccessActor {
  id: number;
  role: Role;
  department: string | null;
  isActive?: boolean;
}

export type DocumentAccessResource = Pick<
  File,
  "uploadedBy" | "department" | "status" | "isDeleted"
>;

export function canDownloadDocument(
  actor: AccessActor,
  document: DocumentAccessResource,
): boolean {
  if (actor.isActive === false || document.isDeleted) return false;

  if (actor.role === "SUPERUSER") return true;

  if (actor.role === "ADMIN") {
    return Boolean(actor.department && actor.department === document.department);
  }

  if (document.status !== "archived") return false;

  return (
    document.uploadedBy === actor.id ||
    Boolean(actor.department && actor.department === document.department)
  );
}

export function canDeleteDocument(
  actor: AccessActor,
  document: Pick<File, "department" | "isDeleted">,
): boolean {
  if (actor.isActive === false || document.isDeleted) return false;
  if (actor.role === "SUPERUSER") return true;

  return (
    actor.role === "ADMIN" &&
    Boolean(actor.department && actor.department === document.department)
  );
}

export function canReviewDocument(
  actor: AccessActor,
  document: Pick<File, "department" | "isDeleted">,
): boolean {
  return canDeleteDocument(actor, document);
}

export function canCreateUser(
  actor: AccessActor,
  target: Pick<AccessActor, "role" | "department">,
): boolean {
  if (actor.isActive === false) return false;
  if (actor.role === "SUPERUSER") return true;

  return (
    actor.role === "ADMIN" &&
    target.role === "USER" &&
    Boolean(actor.department && actor.department === target.department)
  );
}

export function canDeleteUser(
  actor: AccessActor,
  target: Pick<AccessActor, "id" | "role" | "department">,
): boolean {
  if (actor.isActive === false || actor.id === target.id) return false;
  if (target.role === "SUPERUSER") return false;
  if (actor.role === "SUPERUSER") return true;

  return (
    actor.role === "ADMIN" &&
    target.role === "USER" &&
    Boolean(actor.department && actor.department === target.department)
  );
}
