import { createContext, useContext } from "react";
import { RoleContextType, File } from "../types";
import { useAuth } from "./AuthContext";

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const hasAccess = (allowedRoles: string[]): boolean => {
    if (!user) return false;
    const userRole = user.role?.toUpperCase();
    const allowedRolesUpper = allowedRoles.map(role => role.toUpperCase());
    return allowedRolesUpper.includes(userRole);
  };

  const canManageUsers = (): boolean => {
    if (!user) return false;
    return user.role?.toUpperCase() === "SUPERUSER" || user.role?.toUpperCase() === "ADMIN";
  };

  const canDeleteFile = (file: File): boolean => {
    if (!user) return false;
    if (user.role?.toUpperCase() === "SUPERUSER" || user.role?.toUpperCase() === "ADMIN") return true;
    // Regular users cannot delete files without admin approval
    return false;
  };

  const canAccessFile = (file: File): boolean => {
    if (!user) return false;
    if (user.role?.toUpperCase() === "SUPERUSER" || user.role?.toUpperCase() === "ADMIN") return true;
    // Regular users can access files they uploaded OR files from their department
    return file.uploadedBy === user.id || file.department === user.department;
  };

  const canManageDepartments = (): boolean => {
    if (!user) return false;
    return user.role?.toUpperCase() === "SUPERUSER" || user.role?.toUpperCase() === "ADMIN";
  };

  const canUploadFiles = (): boolean => {
    if (!user) return false;
    // Tous les utilisateurs actifs peuvent uploader
    return !!user.isActive;
  };

  const canAccessUserManagement = (): boolean => {
    if (!user) return false;
    return user.role?.toUpperCase() === "SUPERUSER" || user.role?.toUpperCase() === "ADMIN";
  };

  return (
    <RoleContext.Provider
      value={{
        hasAccess,
        canManageUsers,
        canDeleteFile,
        canAccessUserManagement,
        canAccessFile,
        canManageDepartments,
        canUploadFiles,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
