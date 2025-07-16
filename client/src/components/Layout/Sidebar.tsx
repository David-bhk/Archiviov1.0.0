import { useAuth } from "../../contexts/AuthContext";
import { useRole } from "../../contexts/RoleContext";
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
  Users 
} from "lucide-react";
import { Stats } from "../../types";

interface SidebarProps {
  onUserManagement: () => void;
}

export default function Sidebar({ onUserManagement }: SidebarProps) {
  const { user, logout } = useAuth();
  const { hasAccess } = useRole();
  const [location, navigate] = useLocation();

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats", { userId: user?.id }],
    enabled: !!user,
  });

  if (!user) return null;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "superuser": return "bg-red-500";
      case "admin": return "bg-blue-500";
      case "user": return "bg-slate-500";
      default: return "bg-slate-500";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "superuser": return "SuperUser";
      case "admin": return "Admin";
      case "user": return "Utilisateur";
      default: return role;
    }
  };

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Archive className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Archivio</h1>
            <p className="text-sm text-slate-500">v1.0.0</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <div className="mb-4">
          <div className="flex items-center space-x-3 p-3 bg-slate-100 rounded-lg">
            <div className={`w-10 h-10 ${getRoleColor(user.role)} rounded-full flex items-center justify-center text-white font-semibold`}>
              <span>{getInitials(user.firstName, user.lastName)}</span>
            </div>
            <div>
              <p className="font-medium text-slate-800">{`${user.firstName} ${user.lastName}`}</p>
              <p className="text-sm text-slate-500">{getRoleLabel(user.role)}</p>
              <div className="flex items-center space-x-1 mt-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-xs text-slate-500">En ligne</span>
              </div>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => navigate("/")}
          className={`w-full flex items-center space-x-3 p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group ${location === "/" ? "bg-primary/10 text-primary" : ""}`}
        >
          <Gauge className={`w-5 h-5 ${location === "/" ? "text-primary" : "text-slate-500 group-hover:text-primary"}`} />
          <span className="font-medium">Tableau de bord</span>
        </button>
        
        <button 
          onClick={() => navigate("/my-files")}
          className={`w-full flex items-center space-x-3 p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group ${location === "/my-files" ? "bg-primary/10 text-primary" : ""}`}
        >
          <FileText className={`w-5 h-5 ${location === "/my-files" ? "text-primary" : "text-slate-500 group-hover:text-primary"}`} />
          <span className="font-medium">Mes fichiers</span>
          <span className="ml-auto text-sm text-slate-500">{stats?.userFiles || 0}</span>
        </button>
        
        <button 
          onClick={() => navigate("/departments")}
          className={`w-full flex items-center space-x-3 p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group ${location === "/departments" ? "bg-primary/10 text-primary" : ""}`}
        >
          <Building className={`w-5 h-5 ${location === "/departments" ? "text-primary" : "text-slate-500 group-hover:text-primary"}`} />
          <span className="font-medium">Départements</span>
        </button>
        
        {hasAccess(["superuser", "admin"]) && (
          <button
            onClick={onUserManagement}
            className="w-full flex items-center space-x-3 p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group"
          >
            <Users className="w-5 h-5 text-slate-500 group-hover:text-primary" />
            <span className="font-medium">Utilisateurs</span>
            <span className="ml-auto text-sm text-slate-500">{stats?.totalUsers || 0}</span>
          </button>
        )}
        
        {hasAccess(["superuser"]) && (
          <button 
            onClick={() => navigate("/configuration")}
            className={`w-full flex items-center space-x-3 p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group ${location === "/configuration" ? "bg-primary/10 text-primary" : ""}`}
          >
            <Cog className={`w-5 h-5 ${location === "/configuration" ? "text-primary" : "text-slate-500 group-hover:text-primary"}`} />
            <span className="font-medium">Configuration</span>
          </button>
        )}
        
        <button 
          onClick={() => navigate("/statistics")}
          className={`w-full flex items-center space-x-3 p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group ${location === "/statistics" ? "bg-primary/10 text-primary" : ""}`}
        >
          <BarChart3 className={`w-5 h-5 ${location === "/statistics" ? "text-primary" : "text-slate-500 group-hover:text-primary"}`} />
          <span className="font-medium">Statistiques</span>
        </button>
        
        <button 
          onClick={() => navigate("/search")}
          className={`w-full flex items-center space-x-3 p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group ${location === "/search" ? "bg-primary/10 text-primary" : ""}`}
        >
          <Search className={`w-5 h-5 ${location === "/search" ? "text-primary" : "text-slate-500 group-hover:text-primary"}`} />
          <span className="font-medium">Recherche</span>
        </button>
      </nav>
      
      <div className="p-4 border-t border-slate-200">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
