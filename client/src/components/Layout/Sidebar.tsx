import { useAuth } from "../../contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Archive,
  BarChart3,
  Building,
  Cog,
  FileText,
  LogOut,
  Search,
  Gauge,
  Users,
} from "lucide-react";
import { Stats, User, File } from "../../types";
import { apiRequest } from "../../lib/queryClient";

import React from "react";

interface SidebarProps {
  onUserManagement: () => void;
  onClose?: () => void;
}

export default function Sidebar({ onUserManagement, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  // Create local hasAccess function to avoid RoleProvider dependency
  const hasAccess = (allowedRoles: string[]): boolean => {
    if (!user) return false;
    const userRole = user.role?.toUpperCase();
    const allowedRolesUpper = allowedRoles.map(role => role.toUpperCase());
    return allowedRolesUpper.includes(userRole);
  };

  // ...existing code...

  const { data: userFiles = [] } = useQuery<File[]>({
    queryKey: ["files", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest("GET", `/files/user/${user.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/users");
      return res.json();
    },
    enabled: !!user && (user.role?.toUpperCase() === "ADMIN" || user.role?.toUpperCase() === "SUPERUSER"),
  });

  function getInitials(firstName: string, lastName: string) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }

  function getRoleLabel(role: string) {
    const roles: Record<string, string> = {
      superuser: "Super Utilisateur",
      admin: "Administrateur",
      user: "Utilisateur",
    };
    return roles[role] || "Inconnu";
  }

  function getRoleColor(role: string) {
    const colors: Record<string, string> = {
      superuser: "bg-red-500",
      admin: "bg-blue-500",
      user: "bg-green-500",
    };
    return colors[role] || "bg-gray-400";
  }

  // ...existing code...

  return (
    <div className="w-56 xl:w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
      <div className="p-4 xl:p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 xl:space-x-3">
            <div className="w-8 xl:w-10 h-8 xl:h-10 bg-primary rounded-lg flex items-center justify-center">
              <Archive className="text-white" size={16} />
            </div>
            <div>
              <h1 className="text-lg xl:text-xl font-bold text-slate-800">Archivio</h1>
              <p className="text-xs xl:text-sm text-slate-500">v1.0.0</p>
            </div>
          </div>
          {/* Bouton fermeture mobile */}
          {onClose && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="lg:hidden"
            >
              ✕
            </Button>
          )}
        </div>
      </div>
      <nav className="flex-1 p-3 xl:p-4 space-y-1 xl:space-y-2">
        {user && (
          <div className="mb-3 xl:mb-4">
            <div className="flex items-center space-x-2 xl:space-x-3 p-2 xl:p-3 bg-slate-100 rounded-lg">
              <div className={`w-8 xl:w-10 h-8 xl:h-10 ${getRoleColor(user.role)} rounded-full flex items-center justify-center text-white font-semibold text-sm xl:text-base`}>
                <span>{getInitials(user.firstName, user.lastName)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800 text-sm xl:text-base truncate">{`${user.firstName} ${user.lastName}`}</p>
                <p className="text-xs xl:text-sm text-slate-500 truncate">{getRoleLabel(user.role)}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <div className="w-1.5 xl:w-2 h-1.5 xl:h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-xs text-slate-500">En ligne</span>
                </div>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => navigate("/")}
          className={`w-full flex items-center space-x-2 xl:space-x-3 p-2 xl:p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group ${location === "/" ? "bg-primary/10 text-primary" : ""}`}
        >
          <Gauge className={`w-4 xl:w-5 h-4 xl:h-5 ${location === "/" ? "text-primary" : "text-slate-500 group-hover:text-primary"}`} />
          <span className="font-medium text-sm xl:text-base truncate">Tableau de bord</span>
        </button>
        <button
          onClick={() => navigate("/my-files")}
          className={`w-full flex items-center space-x-2 xl:space-x-3 p-2 xl:p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group ${location === "/my-files" ? "bg-primary/10 text-primary" : ""}`}
        >
          <FileText className={`w-4 xl:w-5 h-4 xl:h-5 ${location === "/my-files" ? "text-primary" : "text-slate-500 group-hover:text-primary"}`} />
          <span className="font-medium text-sm xl:text-base truncate">Mes fichiers</span>
          <span className="ml-auto text-xs px-1.5 xl:px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">{Array.isArray(userFiles) ? userFiles.length : 0}</span>
        </button>
        <button
          onClick={() => navigate("/departments")}
          className={`w-full flex items-center space-x-2 xl:space-x-3 p-2 xl:p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group ${location === "/departments" ? "bg-primary/10 text-primary" : ""}`}
        >
          <Building className={`w-4 xl:w-5 h-4 xl:h-5 ${location === "/departments" ? "text-primary" : "text-slate-500 group-hover:text-primary"}`} />
          <span className="font-medium text-sm xl:text-base truncate">Départements</span>
        </button>
        {hasAccess(["superuser", "admin"]) && (
          <button
            onClick={onUserManagement}
            className="w-full flex items-center space-x-2 xl:space-x-3 p-2 xl:p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group"
          >
            <Users className="w-4 xl:w-5 h-4 xl:h-5 text-slate-500 group-hover:text-primary" />
            <span className="font-medium text-sm xl:text-base truncate">Utilisateurs</span>
            <span className="ml-auto text-xs px-1.5 xl:px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">{Array.isArray(users) ? users.length : 0}</span>
          </button>
        )}
        {hasAccess(["superuser"]) && (
          <button
            onClick={() => navigate("/configuration")}
            className={`w-full flex items-center space-x-2 xl:space-x-3 p-2 xl:p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group ${location === "/configuration" ? "bg-primary/10 text-primary" : ""}`}
          >
            <Cog className={`w-4 xl:w-5 h-4 xl:h-5 ${location === "/configuration" ? "text-primary" : "text-slate-500 group-hover:text-primary"}`} />
            <span className="font-medium text-sm xl:text-base truncate">Configuration</span>
          </button>
        )}
        <button
          onClick={() => navigate("/statistics")}
          className={`w-full flex items-center space-x-2 xl:space-x-3 p-2 xl:p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group ${location === "/statistics" ? "bg-primary/10 text-primary" : ""}`}
        >
          <BarChart3 className={`w-4 xl:w-5 h-4 xl:h-5 ${location === "/statistics" ? "text-primary" : "text-slate-500 group-hover:text-primary"}`} />
          <span className="font-medium text-sm xl:text-base truncate">Statistiques</span>
        </button>
        <button
          onClick={() => navigate("/search")}
          className={`w-full flex items-center space-x-2 xl:space-x-3 p-2 xl:p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group ${location === "/search" ? "bg-primary/10 text-primary" : ""}`}
        >
          <Search className={`w-4 xl:w-5 h-4 xl:h-5 ${location === "/search" ? "text-primary" : "text-slate-500 group-hover:text-primary"}`} />
          <span className="font-medium text-sm xl:text-base truncate">Recherche</span>
        </button>
      </nav>
      <div className="p-3 xl:p-4 border-t border-slate-200">
        <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50 text-sm xl:text-base" onClick={logout}>
          <LogOut className="w-4 h-4 mr-2" />
          <span className="truncate">Déconnexion</span>
        </Button>
      </div>
    </div>
  );
  }
