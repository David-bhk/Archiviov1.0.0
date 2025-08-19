import { Button } from "@/components/ui/button";
import { 
  Grid, 
  List, 
  Table2, 
  SortAsc, 
  SortDesc,
  Search,
  Filter
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ViewMode } from "../../types";

interface FileToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: 'name' | 'size' | 'date' | 'type';
  sortOrder: 'asc' | 'desc';
  onSort: (field: 'name' | 'size' | 'date' | 'type') => void;
  totalFiles: number;
  currentPage: number;
  totalPages: number;
  isLoading?: boolean;
}

export default function FileToolbar({
  viewMode,
  onViewModeChange,
  sortBy,
  sortOrder,
  onSort,
  totalFiles,
  currentPage,
  totalPages,
  isLoading = false
}: FileToolbarProps) {
  
  const getSortIcon = (field: string) => {
    if (sortBy === field) {
      return sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />;
    }
    return <SortAsc className="w-4 h-4 opacity-50" />;
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200">
      {/* Info et stats */}
      <div className="flex items-center space-x-4">
        <div className="text-sm text-slate-600">
          <span className="font-medium">{totalFiles}</span> fichiers
          {totalPages > 1 && (
            <span className="ml-2 text-slate-400">
              • Page {currentPage} sur {totalPages}
            </span>
          )}
        </div>
        {isLoading && (
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>

      {/* Contrôles */}
      <div className="flex items-center space-x-2">
        {/* Tri */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {getSortIcon(sortBy)}
              Trier par
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSort('name')} className="flex items-center justify-between">
              <span>Nom</span>
              {getSortIcon('name')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort('date')} className="flex items-center justify-between">
              <span>Date</span>
              {getSortIcon('date')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort('size')} className="flex items-center justify-between">
              <span>Taille</span>
              {getSortIcon('size')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort('type')} className="flex items-center justify-between">
              <span>Type</span>
              {getSortIcon('type')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-slate-200"></div>

        {/* Vue */}
        <div className="flex items-center border border-slate-200 rounded-lg p-1">
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('cards')}
            className="h-8 w-8 p-0"
            title="Vue cartes"
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'compact' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('compact')}
            className="h-8 w-8 p-0"
            title="Vue compacte"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('table')}
            className="h-8 w-8 p-0"
            title="Vue tableau"
          >
            <Table2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
