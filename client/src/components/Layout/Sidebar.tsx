import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  FileText,
  History,
  Landmark,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import type { Role } from "@shared/schema";

interface SidebarProps {
  onUserManagement: () => void;
  onUpload?: () => void;
  onClose?: () => void;
}

interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles?: Role[];
}

const navigationItems: NavigationItem[] = [
  { label: "Tableau de bord", path: "/", icon: LayoutDashboard },
  { label: "Documents", path: "/my-files", icon: FileText },
  { label: "Départements", path: "/departments", icon: Building2 },
  { label: "Validations", path: "/pending-files", icon: ClipboardCheck, roles: ["SUPERUSER", "ADMIN"] },
  { label: "Historique", path: "/activity-history", icon: History, roles: ["SUPERUSER", "ADMIN"] },
  { label: "Statistiques", path: "/statistics", icon: BarChart3 },
  { label: "Recherche avancée", path: "/search", icon: Search },
  { label: "Configuration", path: "/configuration", icon: Settings, roles: ["SUPERUSER"] },
];

const roleLabels: Record<Role, string> = {
  SUPERUSER: "Superutilisateur",
  ADMIN: "Administrateur",
  USER: "Utilisateur",
};

export default function Sidebar({ onUserManagement, onUpload, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  if (!user) return null;

  const navigateTo = (path: string) => {
    navigate(path);
    onClose?.();
  };

  const initials = `${user.firstName.slice(0, 1)}${user.lastName.slice(0, 1)}`.toUpperCase();

  return (
    <div className="flex h-full w-[280px] max-w-full shrink-0 flex-col border-r bg-card">
      <div className="flex min-h-20 items-center justify-between px-5">
        <button
          type="button"
          onClick={() => navigateTo("/")}
          className="flex items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Accéder au tableau de bord Archivio"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-primary">
            <Landmark className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-xl font-bold tracking-tight text-primary">Archivio</span>
            <span className="block text-xs font-medium text-muted-foreground">Gestion documentaire</span>
          </span>
        </button>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden" aria-label="Fermer la navigation">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {onUpload && (
        <div className="px-5 pb-5 pt-2">
          <Button className="min-h-10 w-full" onClick={onUpload}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau document
          </Button>
        </div>
      )}

      <nav aria-label="Navigation principale" className="flex-1 space-y-1 overflow-y-auto px-4 py-2">
        {navigationItems.map((item) => {
          if (item.roles && !item.roles.includes(user.role)) return null;
          const Icon = item.icon;
          const isActive = location === item.path;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigateTo(item.path)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}

        {(user.role === "ADMIN" || user.role === "SUPERUSER") && (
          <button
            type="button"
            onClick={() => {
              onUserManagement();
              onClose?.();
            }}
            className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Users className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Utilisateurs</span>
          </button>
        )}
      </nav>

      <div className="border-t p-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.firstName} {user.lastName}</p>
            <p className="truncate text-xs text-muted-foreground">{roleLabels[user.role]}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="min-h-10 w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={() => void logout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
