import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FileCard from "./FileCard";
import { File } from "../../types";

interface FileGridProps {
  searchQuery: string;
  filters: {
    type: string;
    department: string;
    date: string;
  };
}

export default function FileGrid({ searchQuery, filters }: FileGridProps) {
  const { data: files, isLoading } = useQuery<File[]>({
    queryKey: ["/api/files", { search: searchQuery, department: filters.department }],
  });

  const filteredFiles = files?.filter((file) => {
    if (filters.type !== "all" && file.fileType !== filters.type) return false;
    if (filters.department !== "all" && file.department !== filters.department) return false;
    if (searchQuery && !file.originalName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }) || [];

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

  if (filteredFiles.length === 0) {
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

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredFiles.map((file) => (
          <FileCard key={file.id} file={file} />
        ))}
      </div>
      
      {/* Pagination */}
      <div className="mt-8 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Affichage de 1 à {filteredFiles.length} sur {filteredFiles.length} fichiers
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="default" size="sm">
            1
          </Button>
          <Button variant="outline" size="sm" disabled>
            2
          </Button>
          <Button variant="outline" size="sm" disabled>
            3
          </Button>
          <Button variant="outline" size="sm" disabled>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
