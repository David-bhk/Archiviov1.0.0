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

export default function Dashboard() {
  const { user } = useAuth();
  const { canAccessUserManagement } = useRole();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    type: "all",
    department: "all",
    date: "30days",
  });

  if (!user) {
    return null;
  }
  
  if (!user.role) {
    return <div>Erreur: Utilisateur sans rôle défini</div>;
  }

  const userRoleUpper = user.role.toUpperCase();
  const isRegularUser = userRoleUpper === "USER";
  const isAdmin = userRoleUpper === "ADMIN" || userRoleUpper === "SUPERUSER";

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar onUserManagement={() => setShowUserModal(true)} />
      
      <div className="flex-1 flex flex-col">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onUpload={() => setShowUploadModal(true)}
          showUploadButton={true}
          pageTitle={isAdmin ? "Tableau de bord" : "Mon espace"}
          breadcrumb="/ Accueil"
        />
        
        {/* Show full filters for admins and superusers */}
        {isAdmin && (
          <div className="bg-white border-b border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-bold text-slate-800">Filtres avancés</h2>
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
                <select 
                  value={filters.department} 
                  onChange={(e) => setFilters({...filters, department: e.target.value})}
                  className="px-3 py-1 border border-slate-300 rounded-md text-sm"
                >
                  <option value="all">Tous les départements</option>
                  <option value="Administration">Administration</option>
                  <option value="IT">IT</option>
                  <option value="RH">RH</option>
                </select>
                <select 
                  value={filters.date} 
                  onChange={(e) => setFilters({...filters, date: e.target.value})}
                  className="px-3 py-1 border border-slate-300 rounded-md text-sm"
                >
                  <option value="7days">7 derniers jours</option>
                  <option value="30days">30 derniers jours</option>
                  <option value="90days">90 derniers jours</option>
                  <option value="all">Toutes les dates</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
        {/* Simplified filter for regular users */}
        {isRegularUser && (
          <div className="bg-white border-b border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Mes fichiers récents</h2>
                <p className="text-sm text-slate-600">Fichiers de votre département et vos uploads</p>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-slate-700">Filtrer par type:</label>
                <select 
                  value={filters.type} 
                  onChange={(e) => setFilters({...filters, type: e.target.value})}
                  className="px-3 py-1 border border-slate-300 rounded-md text-sm"
                >
                  <option value="all">Tous</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">Word</option>
                  <option value="xlsx">Excel</option>
                  <option value="png">Images</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
        <FileGrid
          searchQuery={searchQuery}
          filters={filters}
        />
      </div>
      
      <RightPanel />
      
      {showUploadModal && (
        <UploadModal onClose={() => setShowUploadModal(false)} />
      )}
      
      {showUserModal && canAccessUserManagement() && (
        <UserManagementModal onClose={() => setShowUserModal(false)} />
      )}
    </div>
  );
}
