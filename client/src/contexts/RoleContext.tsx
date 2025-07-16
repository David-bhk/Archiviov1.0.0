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
    return user.role === "superuser" || user.role === "admin";
  };

  const canDeleteFile = (file: File): boolean => {
    if (!user) return false;
    if (user.role === "superuser") return true;
    if (user.role === "admin") return true;
    // Regular users can only delete files from their department that they uploaded
    return file.uploadedBy === user.id && file.department === user.department;
  };

  const canAccessFile = (file: File): boolean => {
    if (!user) return false;
    if (user.role === "superuser" || user.role === "admin") return true;
    // Regular users can only access files from their department
    return file.department === user.department;
  };

  const canManageDepartments = (): boolean => {
    if (!user) return false;
    return user.role === "superuser" || user.role === "admin";
  };

  const canUploadFiles = (): boolean => {
    if (!user) return false;
    return user.isActive;
  };

  const canAccessUserManagement = (): boolean => {
    if (!user) return false;
    return user.role === "superuser" || user.role === "admin";
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
