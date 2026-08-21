import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { roleSchema, type Role, type User } from "@shared/schema";

function getRequiredJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET doit être défini dans l'environnement.");
  }
  return secret;
}

const JWT_SECRET = getRequiredJwtSecret();

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export interface AuthenticatedUser {
  id: number;
  role: Role;
  department: string | null;
}

export function generateToken(user: Pick<User, "id" | "role" | "department">) {
  // On encode l'id, le rôle et le département dans le token
  return jwt.sign({
    id: user.id,
    role: user.role,
    department: user.department,
  }, JWT_SECRET, { expiresIn: "7d" });
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token manquant ou invalide" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === "string") {
      return res.status(401).json({ message: "Token invalide ou expiré" });
    }

    const id = Number(decoded.id);
    const parsedRole = roleSchema.safeParse(decoded.role);
    const department = typeof decoded.department === "string" ? decoded.department : null;

    if (!Number.isInteger(id) || id <= 0 || !parsedRole.success) {
      return res.status(401).json({ message: "Token invalide ou expiré" });
    }

    req.user = { id, role: parsedRole.data, department };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Accès interdit" });
    }
    next();
  };
}

export function requireSelfOrAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Non authentifié" });
  }

  if (req.user.role === "ADMIN" || req.user.role === "SUPERUSER" || req.user.id === Number(req.params.userId)) {
    return next();
  }
  return res.status(403).json({ message: "Accès interdit" });
}
