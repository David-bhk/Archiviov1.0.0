import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, FileType, Building, Calendar } from "lucide-react";
import { Department } from "../../types";
import { useState, useEffect } from "react";
import { useDebounce } from "../../hooks/useDebounce";

interface FiltersBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: {
    type: string;
    department: string;
    date: string;
  };
  onFiltersChange: (filters: any) => void;
  totalFiles?: number;
  isLoading?: boolean;
}

export default function FiltersBar({ 
  searchQuery, 
  onSearchChange, 
  filters, 
  onFiltersChange,
  totalFiles = 0,
  isLoading = false
}: FiltersBarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery || '');
  const debouncedSearch = useDebounce(localSearch, 300);

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
  });

  // Sync debounced search with parent
  useEffect(() => {
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    setLocalSearch('');
    onFiltersChange({ type: 'all', department: 'all', date: 'all' });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.type !== 'all') count++;
    if (filters.department !== 'all') count++;
    if (filters.date !== 'all') count++;
    if (localSearch && localSearch.trim()) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="bg-white border-b border-slate-200 p-4 space-y-4">
      {/* Recherche principale */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher des fichiers..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10 pr-4"
          />
          {localSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocalSearch('')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Indicateur de résultats */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span>Recherche...</span>
            </div>
          ) : (
            <span className="font-medium">
              {totalFiles.toLocaleString()} fichier{totalFiles !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Filtres et contrôles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={filters.type} onValueChange={(value) => handleFilterChange("type", value)}>
            <SelectTrigger className="w-40">
              <FileType className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="pdf">📄 PDF</SelectItem>
              <SelectItem value="docx">📝 Word</SelectItem>
              <SelectItem value="xlsx">📊 Excel</SelectItem>
              <SelectItem value="png">🖼️ Images</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filters.department} onValueChange={(value) => handleFilterChange("department", value)}>
            <SelectTrigger className="w-48">
              <Building className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Département" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les départements</SelectItem>
              {departments?.map((dept) => (
                <SelectItem key={dept.id} value={dept.name}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filters.date} onValueChange={(value) => handleFilterChange("date", value)}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toute période</SelectItem>
              <SelectItem value="7days">7 derniers jours</SelectItem>
              <SelectItem value="30days">30 derniers jours</SelectItem>
              <SelectItem value="90days">3 derniers mois</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <>
              <Badge variant="secondary" className="gap-1">
                <Filter className="w-3 h-3" />
                {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-slate-500 hover:text-slate-700"
              >
                <X className="w-4 h-4 mr-1" />
                Effacer
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
