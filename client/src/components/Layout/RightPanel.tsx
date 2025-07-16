import { useQuery } from "@tanstack/react-query";
import { Upload, UserPlus, Edit } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Stats } from "../../types";

export default function RightPanel() {
  const { user } = useAuth();
  
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats", { userId: user?.id }],
    enabled: !!user,
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
    <div className="w-80 bg-white border-l border-slate-200">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Activité récente</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Upload className="text-white" size={14} />
            </div>
            <div>
              <p className="text-sm text-slate-800">
                <span className="font-medium">Marie Dubois</span> a téléchargé 
                <span className="font-medium"> Rapport_Q1_2024.pdf</span>
              </p>
              <p className="text-xs text-slate-500">Il y a 2 heures</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
              <UserPlus className="text-white" size={14} />
            </div>
            <div>
              <p className="text-sm text-slate-800">
                <span className="font-medium">Nouvel utilisateur</span> ajouté au département IT
              </p>
              <p className="text-xs text-slate-500">Il y a 4 heures</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
              <Edit className="text-white" size={14} />
            </div>
            <div>
              <p className="text-sm text-slate-800">
                <span className="font-medium">Pierre Martin</span> a modifié 
                <span className="font-medium"> Manuel_Procedures.docx</span>
              </p>
              <p className="text-xs text-slate-500">Hier</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6 border-t border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Statistiques</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Fichiers totaux</span>
            <span className="text-sm font-semibold text-slate-800">{stats?.totalFiles || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Espace utilisé</span>
            <span className="text-sm font-semibold text-slate-800">
              {stats?.totalSize ? formatFileSize(stats.totalSize) : "0 B"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Utilisateurs actifs</span>
            <span className="text-sm font-semibold text-slate-800">{stats?.activeUsers || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Départements</span>
            <span className="text-sm font-semibold text-slate-800">{stats?.totalDepartments || 0}</span>
          </div>
        </div>
        
        <div className="mt-6">
          <h4 className="text-sm font-medium text-slate-800 mb-3">Répartition par type</h4>
          <div className="space-y-3">
            {stats?.fileTypes && Object.entries(stats.fileTypes).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 ${getFileTypeColor(type)} rounded-full`}></div>
                  <span className="text-sm text-slate-600 capitalize">{type}</span>
                </div>
                <span className="text-sm font-medium text-slate-800">{getFileTypePercentage(type)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
