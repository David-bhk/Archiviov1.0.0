import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "../components/Layout/Sidebar";
import TopBar from "../components/Layout/TopBar";
import RightPanel from "../components/Layout/RightPanel";
import FileCard from "../components/Files/FileCard";
import FiltersBar from "../components/Files/FiltersBar";
import UploadModal from "../components/Files/UploadModal";
import UserManagementModal from "../components/Users/UserManagementModal";
import { File } from "../types";

export default function MyFiles() {
  const { user } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    type: "all",
    department: "all",
    date: "30days",
  });

  const { data: files, isLoading } = useQuery<File[]>({
    queryKey: [`/api/files/user/${user?.id}`],
    enabled: !!user,
  });

  const filteredFiles = files?.filter((file) => {
    if (filters.type !== "all" && file.fileType !== filters.type) return false;
    if (searchQuery && !file.originalName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }) || [];

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar onUserManagement={() => setShowUserModal(true)} />
      
      <div className="flex-1 flex flex-col">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onUpload={() => setShowUploadModal(true)}
        />
        
        <div className="bg-white border-b border-slate-200 p-4">
          <h2 className="text-2xl font-bold text-slate-800">Mes fichiers</h2>
          <p className="text-slate-600">Gérez vos fichiers personnels</p>
        </div>
        
        <FiltersBar
          filters={filters}
          onFiltersChange={setFilters}
        />
        
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600">Vous n'avez encore téléchargé aucun fichier</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-4 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90"
              >
                Télécharger votre premier fichier
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredFiles.map((file) => (
                <FileCard key={file.id} file={file} />
              ))}
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