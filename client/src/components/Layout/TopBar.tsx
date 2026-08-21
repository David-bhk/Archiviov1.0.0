import { Menu, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "../../contexts/AuthContext";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onUpload: () => void;
  onMenuToggle?: () => void;
  showSearch?: boolean;
  showUploadButton?: boolean;
  pageTitle?: string;
  breadcrumb?: string;
}

export default function TopBar({
  searchQuery,
  onSearchChange,
  onUpload,
  onMenuToggle,
  showSearch = true,
  showUploadButton = false,
  pageTitle = "Gestion documentaire",
  breadcrumb = "Archivio",
}: TopBarProps) {
  const { user } = useAuth();
  const initials = user
    ? `${user.firstName.slice(0, 1)}${user.lastName.slice(0, 1)}`.toUpperCase()
    : "";

  return (
    <header className="sticky top-0 z-30 border-b bg-background px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-3">
        {onMenuToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="shrink-0 lg:hidden"
            aria-label="Ouvrir la navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className={showSearch ? "min-w-0 lg:hidden" : "min-w-0"}>
          <p className="truncate text-sm font-semibold">{pageTitle}</p>
          <p className="truncate text-xs text-muted-foreground">{breadcrumb}</p>
        </div>

        {showSearch && (
          <div className="relative ml-auto hidden w-full max-w-md lg:block lg:ml-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Rechercher un document"
              placeholder="Rechercher un document..."
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className="min-h-10 bg-muted pl-10"
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {showUploadButton && (
            <Button onClick={onUpload} className="min-h-10" aria-label="Ajouter un nouveau document">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nouveau document</span>
            </Button>
          )}
          {user && (
            <div className="hidden items-center gap-3 border-l pl-4 sm:flex">
              <div className="text-right">
                <p className="max-w-40 truncate text-sm font-semibold">{user.firstName} {user.lastName}</p>
                <p className="max-w-40 truncate text-xs text-muted-foreground">{user.department || "Sans département"}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-card text-xs font-semibold" aria-hidden="true">
                {initials}
              </div>
            </div>
          )}
        </div>
      </div>

      {showSearch && (
        <div className="relative mt-3 lg:hidden">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            aria-label="Rechercher un document"
            placeholder="Rechercher un document..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="min-h-10 bg-muted pl-10"
          />
        </div>
      )}
    </header>
  );
}
