import { useAuth } from "../../contexts/AuthContext";
import { useRole } from "../../contexts/RoleContext";
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

interface SidebarProps {
  onUserManagement: () => void;
}

export default function Sidebar({ onUserManagement }: SidebarProps) {
  const { user, logout } = useAuth();
  const { hasAccess } = useRole();

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
        
        <a href="#" className="flex items-center space-x-3 p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group">
          <Gauge className="w-5 h-5 text-slate-500 group-hover:text-primary" />
          <span className="font-medium">Tableau de bord</span>
        </a>
        
        <a href="#" className="flex items-center space-x-3 p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group">
          <FileText className="w-5 h-5 text-slate-500 group-hover:text-primary" />
          <span className="font-medium">Mes fichiers</span>
          <span className="ml-auto text-sm text-slate-500">24</span>
        </a>
        
        <a href="#" className="flex items-center space-x-3 p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group">
          <Building className="w-5 h-5 text-slate-500 group-hover:text-primary" />
          <span className="font-medium">Départements</span>
        </a>
        
        {hasAccess(["superuser", "admin"]) && (
          <button
            onClick={onUserManagement}
            className="w-full flex items-center space-x-3 p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group"
          >
            <Users className="w-5 h-5 text-slate-500 group-hover:text-primary" />
            <span className="font-medium">Utilisateurs</span>
            <span className="ml-auto text-sm text-slate-500">12</span>
          </button>
        )}
        
        {hasAccess(["superuser"]) && (
          <a href="#" className="flex items-center space-x-3 p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group">
            <Cog className="w-5 h-5 text-slate-500 group-hover:text-primary" />
            <span className="font-medium">Configuration</span>
          </a>
        )}
        
        <a href="#" className="flex items-center space-x-3 p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group">
          <BarChart3 className="w-5 h-5 text-slate-500 group-hover:text-primary" />
          <span className="font-medium">Statistiques</span>
        </a>
        
        <a href="#" className="flex items-center space-x-3 p-3 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors group">
          <Search className="w-5 h-5 text-slate-500 group-hover:text-primary" />
          <span className="font-medium">Recherche</span>
        </a>
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
