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

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar onUserManagement={() => setShowUserModal(true)} />
      
      <div className="flex-1 flex flex-col">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onUpload={() => setShowUploadModal(true)}
        />
        
        <FiltersBar
          filters={filters}
          onFiltersChange={setFilters}
        />
        
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
