import { useQuery } from "@tanstack/react-query";
import { Upload, UserPlus, Edit } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Stats, File, User } from "../../types";
import { apiRequest } from "../../lib/queryClient";

export default function RightPanel() {
  const { user } = useAuth();
  
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await apiRequest("GET", `/api/stats?userId=${user.id}`);
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Récupère les derniers fichiers uploadés par l'utilisateur connecté
  const { data: recentFiles } = useQuery<File[]>({
    queryKey: ["/api/files/user", user?.id, "recent"],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await apiRequest("GET", `/api/files/user/${user.id}`);
      const response = await res.json();
      const files = response.data || [];
      // Trie par date décroissante et prend les 3 derniers
      return Array.isArray(files)
        ? files.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 3)
        : [];
    },
    enabled: !!user?.id,
  });

  // Récupère les derniers utilisateurs créés (pour superuser/admin)
  const { data: recentUsers } = useQuery<User[]>({
    queryKey: ["/api/users", "recent"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      const response = await res.json();
      const users = response.data || [];
      // Trie par date décroissante et prend les 2 derniers
      return Array.isArray(users)
        ? users.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 2)
        : [];
    },
    enabled: !!user && (user.role === "admin" || user.role === "superuser"),
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

  const getFileTypePercentage = (type: string) => {
    if (!stats?.fileTypes) return 0;
    const total = Object.values(stats.fileTypes).reduce((sum, count) => sum + count, 0);
    return total > 0 ? Math.round((stats.fileTypes[type] / total) * 100) : 0;
  };

  return (
    <div className="hidden xl:block w-72 xl:w-80 bg-white border-l border-slate-200 flex-shrink-0">
      <div className="p-4 xl:p-6">
        <h3 className="text-base xl:text-lg font-semibold text-slate-800 mb-3 xl:mb-4">Activité récente</h3>
        <div className="space-y-3 xl:space-y-4">
          {/* Fichiers uploadés récemment */}
          {recentFiles && recentFiles.length > 0 && recentFiles.map(file => (
            <div key={file.id} className="flex items-start space-x-2 xl:space-x-3">
              <div className="w-7 xl:w-8 h-7 xl:h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <Upload className="text-white" size={12} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs xl:text-sm text-slate-800">
                  <span className="font-medium">Vous</span> avez téléchargé
                  <span className="font-medium truncate"> {file.originalName}</span>
                </p>
                <p className="text-xs text-slate-500 truncate">{file.createdAt ? new Date(file.createdAt).toLocaleString() : 'Date inconnue'}</p>
              </div>
            </div>
          ))}

          {/* Nouveaux utilisateurs (admin/superuser) */}
          {recentUsers && recentUsers.length > 0 && recentUsers.map(user => (
            <div key={user.id} className="flex items-start space-x-2 xl:space-x-3">
              <div className="w-7 xl:w-8 h-7 xl:h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                <UserPlus className="text-white" size={12} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs xl:text-sm text-slate-800">
                  <span className="font-medium truncate">{user.firstName} {user.lastName}</span> ajouté au département {user.department || "-"}
                </p>
                <p className="text-xs text-slate-500 truncate">{user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Date inconnue'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-4 xl:p-6 border-t border-slate-200">
        <h3 className="text-base xl:text-lg font-semibold text-slate-800 mb-3 xl:mb-4">Statistiques</h3>
        <div className="space-y-3 xl:space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs xl:text-sm text-slate-600">Fichiers totaux</span>
            <span className="text-xs xl:text-sm font-semibold text-slate-800">{stats?.totalFiles || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs xl:text-sm text-slate-600 truncate">Espace utilisé</span>
            <span className="text-xs xl:text-sm font-semibold text-slate-800">
              {stats?.totalSize ? formatFileSize(stats.totalSize) : "0 B"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs xl:text-sm text-slate-600 truncate">Utilisateurs actifs</span>
            <span className="text-xs xl:text-sm font-semibold text-slate-800">{stats?.activeUsers || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs xl:text-sm text-slate-600 truncate">Départements</span>
            <span className="text-xs xl:text-sm font-semibold text-slate-800">{stats?.totalDepartments || 0}</span>
          </div>
        </div>
        
        <div className="mt-4 xl:mt-6">
          <h4 className="text-xs xl:text-sm font-medium text-slate-800 mb-2 xl:mb-3">Répartition par type</h4>
          <div className="space-y-2 xl:space-y-3">
            {stats?.fileTypes && Object.entries(stats.fileTypes).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center space-x-1 xl:space-x-2">
                  <div className={`w-2 xl:w-3 h-2 xl:h-3 ${getFileTypeColor(type)} rounded-full`}></div>
                  <span className="text-xs xl:text-sm text-slate-600 capitalize truncate">{type}</span>
                </div>
                <span className="text-xs xl:text-sm font-medium text-slate-800">{getFileTypePercentage(type)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
