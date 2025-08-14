import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, CloudUpload, Search, Menu } from "lucide-react";
import { useRole } from "../../contexts/RoleContext";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onUpload: () => void;
  onMenuToggle?: () => void;
  showUploadButton?: boolean;
  pageTitle?: string;
  breadcrumb?: string;
}

export default function TopBar({ 
  searchQuery, 
  onSearchChange, 
  onUpload, 
  onMenuToggle,
  showUploadButton = false,
  pageTitle = "Gestion des fichiers",
  breadcrumb = "/ Tous les fichiers"
}: TopBarProps) {
  return (
    <div className="bg-white border-b border-slate-200 p-3 lg:p-4">
      {/* Mobile layout - stacked */}
      <div className="flex flex-col space-y-3 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {/* Menu hamburger */}
            {onMenuToggle && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onMenuToggle}
                className="flex-shrink-0"
              >
                <Menu className="w-5 h-5" />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-slate-800 truncate">{pageTitle}</h2>
              <div className="text-xs text-slate-500 truncate">
                <span>{breadcrumb}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {showUploadButton && (
              <Button onClick={onUpload} size="sm" className="flex items-center space-x-1">
                <CloudUpload className="w-4 h-4" />
                <span className="hidden sm:inline">Upload</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-800">
              <Bell className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Search bar on mobile */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10"
          />
        </div>
      </div>

      {/* Desktop layout - horizontal */}
      <div className="hidden lg:flex items-center justify-between">
        <div className="flex items-center space-x-4 min-w-0 flex-1">
          <h2 className="text-xl xl:text-2xl font-bold text-slate-800">{pageTitle}</h2>
          <div className="text-sm text-slate-500">
            <span>{breadcrumb}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Rechercher des fichiers..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-64 xl:w-80 pl-10"
            />
          </div>
          
          {showUploadButton && (
            <Button onClick={onUpload} className="flex items-center space-x-2">
              <CloudUpload className="w-4 h-4" />
              <span>Télécharger</span>
            </Button>
          )}
          
          <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-800">
            <Bell className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
