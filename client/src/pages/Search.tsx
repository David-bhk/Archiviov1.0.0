import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, Filter, X } from "lucide-react";
import Sidebar from "../components/Layout/Sidebar";
import TopBar from "../components/Layout/TopBar";
import RightPanel from "../components/Layout/RightPanel";
import FileCard from "../components/Files/FileCard";
import UploadModal from "../components/Files/UploadModal";
import UserManagementModal from "../components/Users/UserManagementModal";
import { File } from "../types";
import { apiRequest } from "../lib/queryClient";

export default function Search() {
  const { user } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [filters, setFilters] = useState({
    department: "",
    fileType: "",
  });

  const { data: files, isLoading, isError, error } = useQuery<File[]>({
    queryKey: ["/api/files", "search", activeQuery, user?.id],
    queryFn: async () => {
      if (!user || !activeQuery) return [];
      
      const params = new URLSearchParams();
      params.append('search', activeQuery);
      
      console.log("🔍 Search Debug:");
      console.log("- activeQuery:", activeQuery);
      console.log("- API URL:", `/api/files?${params.toString()}`);
      
      const response = await apiRequest("GET", `/api/files?${params.toString()}`);
      const result = await response.json();
      
      console.log("- API Response:", result);
      console.log("- Files found:", result.data?.length || result.length);
      
      return result.data || result; // Handle both paginated and direct array responses
    },
    enabled: !!user && activeQuery.length > 0,
  });

  const { data: departments } = useQuery<any[]>({
    queryKey: ["/api/departments"],
    enabled: !!user,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveQuery(searchQuery);
    }
  };

  const filteredFiles = files?.filter((file) => {
    if (filters.department && file.department !== filters.department) return false;
    if (filters.fileType && file.fileType !== filters.fileType) return false;
    return true;
  }) || [];

  const clearFilters = () => {
    setFilters({ department: "", fileType: "" });
  };

  const fileTypes = Array.from(new Set(files?.map(f => f.fileType) || []));

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar onUserManagement={() => setShowUserModal(true)} />
      
      <div className="flex-1 flex flex-col">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onUpload={() => setShowUploadModal(true)}
          showUploadButton={false}
          pageTitle="Recherche"
          breadcrumb="/ Recherche globale"
        />        <div className="bg-white border-b border-slate-200 p-4">
          <div className="flex items-center space-x-2 mb-4">
            <SearchIcon className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-slate-800">Recherche avancée</h2>
          </div>
          
          <form onSubmit={handleSearch} className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Rechercher dans les fichiers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={!searchQuery.trim()}>
              Rechercher
            </Button>
          </form>
        </div>
        
        {/* Filters */}
        <div className="bg-white border-b border-slate-200 p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Filtres:</span>
            </div>
            
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="px-3 py-1 border border-slate-300 rounded-md text-sm"
            >
              <option value="">Tous les départements</option>
              {departments?.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>
            
            <select
              value={filters.fileType}
              onChange={(e) => setFilters({ ...filters, fileType: e.target.value })}
              className="px-3 py-1 border border-slate-300 rounded-md text-sm"
            >
              <option value="">Tous les types</option>
              {fileTypes.map((type) => (
                <option key={type} value={type}>
                  {type.toUpperCase()}
                </option>
              ))}
            </select>
            
            {(filters.department || filters.fileType) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Effacer
              </Button>
            )}
          </div>
          
          {/* Active filters */}
          <div className="mt-2 flex items-center space-x-2">
            {activeQuery && (
              <Badge variant="outline">
                Recherche: "{activeQuery}"
                <button
                  onClick={() => setActiveQuery("")}
                  className="ml-2 text-slate-500 hover:text-slate-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filters.department && (
              <Badge variant="outline">
                Département: {filters.department}
              </Badge>
            )}
            {filters.fileType && (
              <Badge variant="outline">
                Type: {filters.fileType.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          {!activeQuery ? (
            <div className="text-center py-12">
              <SearchIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-xl text-slate-600 mb-2">Recherchez dans vos fichiers</p>
              <p className="text-slate-500">Tapez un mot-clé pour commencer votre recherche</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-red-600 font-semibold">Erreur lors du chargement des fichiers.</p>
              <p className="text-slate-500 text-sm mt-2">{error instanceof Error ? error.message : "Veuillez réessayer plus tard."}</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-slate-600 mb-2">Aucun résultat trouvé</p>
              <p className="text-slate-500">
                Aucun fichier ne correspond à votre recherche "{activeQuery}"
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-slate-600">
                  {filteredFiles.length} résultat{filteredFiles.length > 1 ? 's' : ''} 
                  {activeQuery && ` pour "{activeQuery}"`}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredFiles.map((file) => (
                  <FileCard key={file.id} file={file} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <RightPanel />
      
      {showUploadModal && (
        <UploadModal onClose={() => setShowUploadModal(false)} />
      )}
      
      {showUserModal && (
        <UserManagementModal onClose={() => setShowUserModal(false)} />
      )}
    </div>
  );
}