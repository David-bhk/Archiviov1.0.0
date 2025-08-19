import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRole } from "../contexts/RoleContext";
import Sidebar from "../components/Layout/Sidebar";
import TopBar from "../components/Layout/TopBar";
import RightPanel from "../components/Layout/RightPanel";
import FileGrid from "../components/Files/FileGrid";
import UploadModal from "../components/Files/UploadModal";
import UserManagementModal from "../components/Users/UserManagementModal";

export default function Dashboard() {
  const { user } = useAuth();
  const { canAccessUserManagement } = useRole();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* Mobile sidebar overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileMenu(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-white">
            <Sidebar 
              onUserManagement={() => {
                setShowUserModal(true);
                setShowMobileMenu(false);
              }} 
              onClose={() => setShowMobileMenu(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar onUserManagement={() => setShowUserModal(true)} />
      </div>
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onUpload={() => setShowUploadModal(true)}
          onMenuToggle={() => setShowMobileMenu(true)}
          showUploadButton={true}
          pageTitle={isAdmin ? "Tableau de bord" : "Mon espace"}
          breadcrumb="/ Accueil"
        />
        
        {/* Show full filters for admins and superusers */}
        {isAdmin && (
          <div className="bg-white border-b border-slate-200 p-3 lg:p-4">
            <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              <h2 className="text-lg lg:text-xl font-bold text-slate-800">Filtres avancés</h2>
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
                <select 
                  value={filters.type} 
                  onChange={(e) => setFilters({...filters, type: e.target.value})}
                  className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-md text-sm"
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
                  className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-md text-sm"
                >
                  <option value="all">Tous les départements</option>
                  <option value="Administration">Administration</option>
                  <option value="IT">IT</option>
                  <option value="RH">RH</option>
                </select>
                <select 
                  value={filters.date} 
                  onChange={(e) => setFilters({...filters, date: e.target.value})}
                  className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-md text-sm"
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
          <div className="bg-white border-b border-slate-200 p-3 lg:p-4">
            <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              <div>
                <h2 className="text-lg lg:text-xl font-bold text-slate-800">Mes fichiers récents</h2>
                <p className="text-sm text-slate-600">Fichiers de votre département et vos uploads</p>
              </div>
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
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
