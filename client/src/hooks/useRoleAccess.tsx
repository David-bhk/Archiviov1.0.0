import { useAuth } from "../contexts/AuthContext";

export function useRoleAccess() {
  const { user } = useAuth();

  const hasAccess = (allowedRoles: string[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const isSuperUser = (): boolean => {
    return user?.role === "superuser";
  };

  const isAdmin = (): boolean => {
    return user?.role === "admin";
  };

  const isUser = (): boolean => {
    return user?.role === "user";
  };

  return {
    hasAccess,
    isSuperUser,
    isAdmin,
    isUser,
    currentRole: user?.role,
  };
}
