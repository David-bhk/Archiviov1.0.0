import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import FileCard from "./FileCard";
import CompactFileCard from "./CompactFileCard";
import FileTable from "./FileTable";
import FileToolbar from "./FileToolbar";
import { File, PaginatedResponse, ViewMode } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { useRole } from "../../contexts/RoleContext";
import { apiRequest } from "../../lib/queryClient";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import { useToast } from "@/hooks/use-toast";
import { downloadFile } from "../../utils/fileUtils";

interface FileGridProps {
  searchQuery: string;
  filters: {
    type: string;
    department: string;
    date: string;
  };
}

export default function FileGrid({ searchQuery, filters }: FileGridProps) {
  const { user } = useAuth();
  const { canDeleteFile } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // View mode for adaptive display
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  
  // Sorting state
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Intelligent pagination based on total file count
  const getOptimalLimit = (totalFiles: number): number => {
    if (totalFiles > 5000) return 50;  // 50 per page for massive datasets
    if (totalFiles > 1000) return 25;  // 25 per page for large datasets  
    if (totalFiles > 200) return 15;   // 15 per page for medium datasets
    return 12;                         // 12 per page for small datasets
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [adaptiveLimit, setAdaptiveLimit] = useState(12);
  
  // Debounced search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (fileId: number) => apiRequest("DELETE", `/api/files/${fileId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "Fichier supprimé",
        description: "Le fichier a été supprimé avec succès",
      });
    },
    onError: (error) => {
      console.error("Erreur lors de la suppression:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le fichier",
        variant: "destructive",
      });
    },
  });

  // Reset page when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, filters.department, filters.date, filters.type, sortBy, sortOrder]);
  
  const { data: response, isLoading, error } = useQuery<PaginatedResponse<File>>({
    queryKey: ["/api/files", { 
      search: debouncedSearchQuery, 
      department: filters.department, 
      date: filters.date, 
      type: filters.type, 
      page: currentPage, 
      limit: adaptiveLimit,
      sortBy,
      sortOrder
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearchQuery) params.append("search", debouncedSearchQuery);
      if (filters.department && filters.department !== "all") params.append("department", filters.department);
      if (filters.date && filters.date !== "all") {
        const match = filters.date.match(/(\d+)/);
        if (match) params.append("date", match[1]);
      }
      if (filters.type && filters.type !== "all") params.append("type", filters.type);
      params.append("page", currentPage.toString());
      params.append("limit", adaptiveLimit.toString());
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);
      
      const url = `/api/files?${params.toString()}`;
      const res = await apiRequest("GET", url);
      const data = await res.json();
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes pour les listes de fichiers
  });

  const files = response?.data || [];
  const totalFiles = response?.total || 0;

  // Auto-adjust pagination limit based on total files
  useEffect(() => {
    if (totalFiles > 0) {
      const optimalLimit = getOptimalLimit(totalFiles);
      if (optimalLimit !== adaptiveLimit) {
        setAdaptiveLimit(optimalLimit);
        setCurrentPage(1); // Reset to first page when limit changes
      }
      
      // Auto-switch to table view for large datasets
      if (totalFiles > 1000 && viewMode === 'cards') {
        setViewMode('compact');
        toast({
          title: "Vue compacte activée",
          description: "Basculement automatique vers une vue plus efficace pour de grandes quantités de fichiers",
        });
      }
    }
  }, [totalFiles, adaptiveLimit, viewMode, toast]);

  // Download handler (optimized with useCallback)
  const handleDownload = useCallback(async (file: File) => {
    try {
      const token = localStorage.getItem('archivio_token');
      if (!token) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour télécharger",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/files/${file.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.originalName || file.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Téléchargement réussi",
        description: `${file.originalName} a été téléchargé`,
      });
    } catch (error) {
      console.error("Erreur de téléchargement:", error);
      toast({
        title: "Erreur de téléchargement",
        description: error instanceof Error ? error.message : "Impossible de télécharger le fichier",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Delete handler (optimized with useCallback)
  const handleDelete = useCallback((file: File) => {
    if (!canDeleteFile(file)) {
      toast({
        title: "Action non autorisée",
        description: "Vous n'avez pas les permissions pour supprimer ce fichier",
        variant: "destructive",
      });
      return;
    }
    
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce fichier ?")) {
      deleteMutation.mutate(file.id);
    }
  }, [canDeleteFile, toast, deleteMutation]);

  // Sort handlers
  const handleSort = useCallback((field: 'name' | 'size' | 'date' | 'type') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  }, [sortBy]);

  if (error) {
    console.error("FileGrid error:", error);
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Erreur lors du chargement des fichiers</p>
          <p className="text-sm text-slate-500 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-600">Chargement des fichiers...</p>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Aucun fichier trouvé</p>
          {searchQuery && (
            <p className="text-sm text-slate-500 mt-2">
              Essayez de modifier votre recherche ou vos filtres
            </p>
          )}
        </div>
      </div>
    );
  }

  const totalPages = response?.totalPages || 1;
  const total = response?.total || 0;
  const startItem = (currentPage - 1) * adaptiveLimit + 1;
  const endItem = Math.min(currentPage * adaptiveLimit, total);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Affichage de {startItem} à {endItem} sur {total} fichiers
          <span className="text-xs text-slate-500 block">
            ({adaptiveLimit} par page - ajusté automatiquement)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          {getPageNumbers().map((pageNum) => (
            <Button 
              key={pageNum}
              variant={currentPage === pageNum ? "default" : "outline"} 
              size="sm"
              onClick={() => handlePageChange(pageNum)}
            >
              {pageNum}
            </Button>
          ))}
          
          <Button 
            variant="outline" 
            size="sm" 
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Render files based on view mode
  const renderFileContent = () => {
    if (files.length === 0 && !isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 lg:py-16">
          <FileText className="w-12 h-12 lg:w-16 lg:h-16 text-slate-300 mb-4" />
          <p className="text-slate-500 text-center">
            Aucun fichier trouvé avec les filtres actuels
          </p>
        </div>
      );
    }

    switch (viewMode) {
      case 'table':
        return (
          <FileTable 
            files={files} 
            onDownload={handleDownload}
            onDelete={handleDelete}
          />
        );
      
      case 'compact':
        return (
          <div className="grid gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {files.map((file) => (
              <CompactFileCard key={file.id} file={file} />
            ))}
          </div>
        );
      
      case 'cards':
      default:
        return (
          <div className="grid gap-3 lg:gap-4 xl:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {files.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Toolbar optimisée */}
      <FileToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        totalFiles={totalFiles}
        currentPage={currentPage}
        totalPages={totalPages}
        isLoading={isLoading}
      />
      
      {/* Top pagination - Hidden on mobile */}
      <div className="hidden sm:block p-4 border-b border-slate-100">
        {renderPagination()}
      </div>
      
      {/* File content */}
      <div className="flex-1 p-3 lg:p-6">
        {renderFileContent()}
      </div>
      
      {/* Bottom pagination */}
      <div className="p-4 border-t border-slate-100">
        {renderPagination()}
      </div>
    </div>
  );
}
