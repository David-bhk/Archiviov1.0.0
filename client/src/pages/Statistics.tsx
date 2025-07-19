import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart3, FileText, Users, HardDrive, TrendingUp, Calendar } from "lucide-react";
import Sidebar from "../components/Layout/Sidebar";
import TopBar from "../components/Layout/TopBar";
import RightPanel from "../components/Layout/RightPanel";
import UploadModal from "../components/Files/UploadModal";
import UserManagementModal from "../components/Users/UserManagementModal";
import { Stats } from "../types";

export default function Statistics() {
  const { user } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: stats, isLoading, isError, error } = useQuery<Stats>({
    queryKey: ["/api/stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await apiRequest("GET", `/api/stats?userId=${user.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case "pdf": return "bg-red-500";
      case "docx": return "bg-blue-500";
      case "xlsx": return "bg-green-500";
      case "png": case "jpg": case "jpeg": return "bg-purple-500";
      default: return "bg-slate-500";
    }
  };

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
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-slate-800">Statistiques</h2>
          </div>
          <p className="text-slate-600">Analysez les données de votre système</p>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total des fichiers</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalFiles || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats?.totalSize ? formatFileSize(stats.totalSize) : "0 B"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Utilisateurs actifs</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.activeUsers || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Total: {stats?.totalUsers || 0}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Mes fichiers</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.userFiles || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Vos téléchargements
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Départements</CardTitle>
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalDepartments || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Organisés
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* File Types Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Répartition par type de fichier</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats?.fileTypes && Object.entries(stats.fileTypes).map(([type, count]) => {
                      const total = Object.values(stats.fileTypes).reduce((sum, c) => sum + c, 0);
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      
                      return (
                        <div key={type} className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getFileTypeColor(type)}`}></div>
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-sm font-medium uppercase">{type}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-slate-600">{count} fichiers</span>
                              <Badge variant="outline">{percentage}%</Badge>
                            </div>
                          </div>
                          <div className="w-24">
                            <Progress value={percentage} className="h-2" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Storage Usage */}
              <Card>
                <CardHeader>
                  <CardTitle>Utilisation du stockage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Espace utilisé</span>
                      <span className="text-sm text-slate-600">
                        {stats?.totalSize ? formatFileSize(stats.totalSize) : "0 B"}
                      </span>
                    </div>
                    <Progress value={25} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      25% de l'espace total utilisé
                    </p>
                  </div>
                </CardContent>
              </Card>
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