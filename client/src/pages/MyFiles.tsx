import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRole } from "../contexts/RoleContext";
import Sidebar from "../components/Layout/Sidebar";
import TopBar from "../components/Layout/TopBar";
import RightPanel from "../components/Layout/RightPanel";
import FileGrid from "../components/Files/FileGrid";
import FiltersBar from "../components/Files/FiltersBar";
import UploadModal from "../components/Files/UploadModal";
import UserManagementModal from "../components/Users/UserManagementModal";

export default function MyFiles() {
  const { user } = useAuth();
  const { canManageDepartments } = useRole();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    type: "all",
    department: "all",
    date: "30days",
  });

  const isRegularUser = user?.role?.toUpperCase() === "USER";

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar onUserManagement={() => setShowUserModal(true)} />
      
      <div className="flex-1 flex flex-col">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onUpload={() => setShowUploadModal(true)}
          showUploadButton={true}
          pageTitle={isRegularUser ? "Mes fichiers" : "Gestion des fichiers"}
          breadcrumb={isRegularUser ? "/ Mes documents" : "/ Tous les fichiers"}
        />
        
        <div className="bg-white border-b border-slate-200 p-4">
          <h2 className="text-2xl font-bold text-slate-800">
            {isRegularUser ? "Mes fichiers" : "Gestion des fichiers"}
          </h2>
          <p className="text-slate-600">
            {isRegularUser 
              ? "Vos fichiers personnels et ceux de votre département" 
              : "Gérez tous les fichiers de l'organisation"
            }
          </p>
        </div>
        
        {/* Show filters bar only for admins or simplified version for regular users */}
        {!isRegularUser && (
          <FiltersBar
            filters={filters}
            onFiltersChange={setFilters}
          />
        )}
        
        {/* Simplified filter bar for regular users */}
        {isRegularUser && (
          <div className="bg-white border-b border-slate-200 p-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-slate-700">Type de fichier:</label>
                <select 
                  value={filters.type} 
                  onChange={(e) => setFilters({...filters, type: e.target.value})}
                  className="px-3 py-1 border border-slate-300 rounded-md text-sm"
                >
                  <option value="all">Tous les types</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">Word</option>
                  <option value="xlsx">Excel</option>
                  <option value="png">Images</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex-1 flex">
          {/* Main content area with FileGrid */}
          <div className="flex-1">
            <FileGrid
              searchQuery={searchQuery}
              filters={filters}
            />
          </div>
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