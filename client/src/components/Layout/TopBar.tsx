import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, CloudUpload, Search } from "lucide-react";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onUpload: () => void;
}

export default function TopBar({ searchQuery, onSearchChange, onUpload }: TopBarProps) {
  return (
    <div className="bg-white border-b border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-slate-800">Gestion des fichiers</h2>
          <div className="text-sm text-slate-500">
            <span>/ Tous les fichiers</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Rechercher des fichiers..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-80 pl-10"
            />
          </div>
          
          <Button onClick={onUpload} className="flex items-center space-x-2">
            <CloudUpload className="w-4 h-4" />
            <span>Télécharger</span>
          </Button>
          
          <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-800">
            <Bell className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
