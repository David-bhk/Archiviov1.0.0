import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FileCard from "./FileCard";
import { File } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest } from "../../lib/queryClient";
import { useState, useEffect } from "react";

interface FileGridProps {
  searchQuery: string;
  filters: {
    type: string;
    department: string;
    date: string;
  };
}

interface PaginatedResponse {
  data: File[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function FileGrid({ searchQuery, filters }: FileGridProps) {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  
  // Adjust grid size based on user role - regular users get smaller grid for more activity space
  const isRegularUser = user?.role?.toUpperCase() === "USER";
  const limit = isRegularUser ? 9 : 12; // 9 files (3x3 grid) for regular users, 12 for admins
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters.department, filters.date, filters.type]);
  
  const { data: response, isLoading, error } = useQuery<PaginatedResponse>({
    queryKey: ["/api/files", { search: searchQuery, department: filters.department, date: filters.date, type: filters.type, page: currentPage, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (filters.department && filters.department !== "all") params.append("department", filters.department);
      if (filters.date && filters.date !== "all") {
        // On suppose que filters.date est du type "30days", "7days", etc.
        const match = filters.date.match(/(\d+)/);
        if (match) params.append("date", match[1]);
      }
      if (filters.type && filters.type !== "all") params.append("type", filters.type);
      params.append("page", currentPage.toString());
      params.append("limit", limit.toString());
      
      const url = `/api/files?${params.toString()}`;
      const res = await apiRequest("GET", url);
      const data = await res.json();
      return data;
    },
  });

  const files = response?.data || [];

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
  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, total);

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
    // For regular users, only show pagination if there are actually files to paginate
    // This prevents empty pages when they don't have access to many files
    if (totalPages <= 1 || (isRegularUser && files.length === 0)) return null;
    
    return (
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Affichage de {startItem} à {endItem} sur {total} fichiers
          {isRegularUser && (
            <span className="text-xs text-slate-500 block">
              (Fichiers de votre département et vos uploads)
            </span>
          )}
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

  return (
    <div className="flex-1 p-6 flex flex-col">
      {/* Top pagination */}
      {renderPagination()}
      
      {/* File grid with adaptive layout based on user role */}
      <div className="flex-1 mt-4">
        <div className={`grid gap-4 ${
          isRegularUser 
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" // 3 columns max for regular users
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6" // Full responsive for admins
        }`}>
          {files.map((file) => (
            <FileCard key={file.id} file={file} />
          ))}
        </div>
      </div>
      
      {/* Bottom pagination */}
      <div className="mt-6">
        {renderPagination()}
      </div>
    </div>
  );
}
