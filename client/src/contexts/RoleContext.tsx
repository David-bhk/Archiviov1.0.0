import { createContext, useContext } from "react";
import { RoleContextType, File } from "../types";
import { useAuth } from "./AuthContext";

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const hasAccess = (allowedRoles: string[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const canManageUsers = (): boolean => {
    if (!user) return false;
    return user.role === "SUPERUSER" || user.role === "ADMIN";
  };

  const canDeleteFile = (file: File): boolean => {
    if (!user) return false;
    if (user.role === "SUPERUSER") return true;
    if (user.role === "ADMIN") return true;
    // Regular users can only delete files from their department that they uploaded
    return file.uploadedBy === user.id && file.department === user.department;
  };

  const canAccessFile = (file: File): boolean => {
    if (!user) return false;
    if (user.role === "SUPERUSER" || user.role === "ADMIN") return true;
    // Regular users can only access files from their department
    return file.department === user.department;
  };

  const canManageDepartments = (): boolean => {
    if (!user) return false;
    return user.role === "SUPERUSER" || user.role === "ADMIN";
  };

  const canUploadFiles = (): boolean => {
    if (!user) return false;
    // Tous les utilisateurs actifs peuvent uploader
    return !!user.isActive;
  };

  const canAccessUserManagement = (): boolean => {
    if (!user) return false;
    return user.role === "SUPERUSER" || user.role === "ADMIN";
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
