import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "changeme";

export interface AuthRequest extends Request {
  user?: any;
}

export function generateToken(user: any) {
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
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Accès interdit" });
    }
    next();
  };
}

export function requireSelfOrAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user.role === "admin" || req.user.role === "superuser" || req.user.id === Number(req.params.userId)) {
    return next();
  }
  return res.status(403).json({ message: "Accès interdit" });
}
