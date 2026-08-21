import { useAuth } from "../contexts/AuthContext";
import type { Role } from "@shared/schema";

export function useRoleAccess() {
  const { user } = useAuth();

  const hasAccess = (allowedRoles: Role[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const isSuperUser = (): boolean => {
    return user?.role === "SUPERUSER";
  };

  const isAdmin = (): boolean => {
    return user?.role === "ADMIN";
  };

  const isUser = (): boolean => {
    return user?.role === "USER";
  };

  return {
    hasAccess,
    isSuperUser,
    isAdmin,
    isUser,
    currentRole: user?.role,
  };
}
