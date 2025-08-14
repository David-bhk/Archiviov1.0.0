import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, Download, Eye, Trash2 } from "lucide-react";
import { File } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { useRole } from "../../contexts/RoleContext";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FileCardProps {
  file: File;
}

function getAuthToken() {
  return localStorage.getItem('archivio_token'); // Corrigé pour utiliser la bonne clé
}

export default function FileCard({ file }: FileCardProps) {
  const { user } = useAuth();
  const { canDeleteFile } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (fileId: number) => apiRequest("DELETE", `/api/files/${fileId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "Fichier supprimé",
        description: "Le fichier a été supprimé avec succès",
      });
    },
    onError: (error) => {
      console.error("Erreur lors de la suppression:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le fichier",
        variant: "destructive",
      });
    },
  });

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "pdf": return <FileText className="w-6 h-6 xl:w-7 xl:h-7 text-white" />;
      case "docx": case "doc": return <FileText className="w-6 h-6 xl:w-7 xl:h-7 text-white" />;
      case "xlsx": case "xls": return <FileText className="w-6 h-6 xl:w-7 xl:h-7 text-white" />;
      case "png": case "jpg": case "jpeg": return <Image className="w-6 h-6 xl:w-7 xl:h-7 text-white" />;
      default: return <FileText className="w-6 h-6 xl:w-7 xl:h-7 text-white" />;
    }
  };

  const getFileTypeColor = (fileType: string) => {
    switch (fileType) {
      case "pdf": return "bg-gradient-to-br from-red-500 to-red-600";
      case "docx": case "doc": return "bg-gradient-to-br from-blue-500 to-blue-600";
      case "xlsx": case "xls": return "bg-gradient-to-br from-green-500 to-green-600";
      case "png": case "jpg": case "jpeg": return "bg-gradient-to-br from-purple-500 to-purple-600";
      default: return "bg-gradient-to-br from-slate-500 to-slate-600";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("fr-FR");
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      if (!token) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour télécharger",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/files/${file.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.originalName || file.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Téléchargement réussi",
        description: `${file.originalName} a été téléchargé`,
      });
    } catch (error) {
      console.error("Erreur de téléchargement:", error);
      toast({
        title: "Erreur de téléchargement",
        description: error instanceof Error ? error.message : "Impossible de télécharger le fichier",
        variant: "destructive",
      });
    }
  };

  const handleDelete = () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce fichier ?")) {
      deleteMutation.mutate(file.id);
    }
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/50 hover:border-slate-300/80 hover:shadow-xl hover:shadow-slate-100/50 transition-all duration-300 cursor-pointer group h-full overflow-hidden rounded-2xl">
      <CardContent className="p-0 h-full flex flex-col">
        {/* Header moderne avec icône et titre */}
        <div className="relative p-4 xl:p-6">
          {/* Gradient background subtil */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent"></div>
          
          <div className="relative flex items-start space-x-4 xl:space-x-5">
            <div className={`w-14 xl:w-16 h-14 xl:h-16 ${getFileTypeColor(file.fileType)} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-slate-900/10`}>
              {getFileIcon(file.fileType)}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <h3 
                className="font-bold text-slate-900 text-base xl:text-lg leading-tight mb-3 break-words line-clamp-2" 
                title={file.originalName}
              >
                {file.originalName}
              </h3>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1.5 bg-gradient-to-r from-slate-100 to-slate-50 text-slate-800 rounded-full text-xs xl:text-sm font-semibold border border-slate-200/50">
                  {file.fileType.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Actions modernes avec glassmorphism */}
          <div className="absolute top-4 right-4 xl:top-6 xl:right-6 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <Button variant="ghost" size="sm" className="h-9 w-9 xl:h-10 xl:w-10 p-0 bg-white/90 backdrop-blur-sm hover:bg-white border border-slate-200/50 rounded-xl shadow-sm">
              <Eye className="w-4 h-4 xl:w-5 xl:h-5 text-slate-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-9 w-9 xl:h-10 xl:w-10 p-0 bg-blue-50/90 backdrop-blur-sm hover:bg-blue-100 border border-blue-200/50 text-blue-600 rounded-xl shadow-sm"
            >
              <Download className="w-4 h-4 xl:w-5 xl:h-5" />
            </Button>
            {canDeleteFile(file) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="h-9 w-9 xl:h-10 xl:w-10 p-0 bg-red-50/90 backdrop-blur-sm hover:bg-red-100 border border-red-200/50 text-red-600 rounded-xl shadow-sm"
              >
                <Trash2 className="w-4 h-4 xl:w-5 xl:h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Section métadonnées avec style moderne */}
        <div className="px-4 xl:px-6 pb-4">
          <div className="space-y-4">
            {/* Taille et Date avec design moderne */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-sm"></div>
                <span className="font-semibold text-slate-800 text-sm xl:text-base">{formatFileSize(file.fileSize)}</span>
              </div>
              <span className="text-slate-500 font-medium text-sm xl:text-base">{formatDate(file.createdAt)}</span>
            </div>

            {/* Utilisateur avec avatar moderne */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 xl:w-11 xl:h-11 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/20">
                <span className="text-sm xl:text-base font-bold text-white">
                  {file.uploaderName ? file.uploaderName.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm xl:text-base font-semibold text-slate-800 truncate">
                  {file.uploaderName || "Utilisateur inconnu"}
                </p>
                <p className="text-xs xl:text-sm text-slate-500 font-medium">Téléchargé par</p>
              </div>
            </div>

            {/* Description avec style moderne */}
            {file.description && (
              <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/50 backdrop-blur-sm">
                <p className="text-sm xl:text-base text-slate-700 line-clamp-2 leading-relaxed font-medium">
                  {file.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Preview moderne pour les images */}
        {(file.fileType === "png" || file.fileType === "jpg" || file.fileType === "jpeg") && (
          <div className="px-4 xl:px-6 pb-4">
            <div className="w-full h-32 xl:h-36 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 rounded-xl overflow-hidden border border-slate-200/50 shadow-inner">
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <div className="flex flex-col items-center">
                  <Image className="w-10 h-10 xl:w-12 xl:h-12 mb-2" />
                  <span className="text-sm xl:text-base font-semibold">Aperçu disponible</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Footer moderne avec glassmorphism */}
        <div className="px-4 xl:px-6 py-4 xl:py-5 bg-gradient-to-r from-slate-50/80 to-slate-100/40 backdrop-blur-sm border-t border-slate-200/50 mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {file.category && (
                <Badge variant="secondary" className="text-xs xl:text-sm px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-slate-300/50 text-slate-800 font-semibold rounded-full shadow-sm">
                  {file.category}
                </Badge>
              )}
              {file.department && (
                <Badge variant="outline" className="text-xs xl:text-sm px-3 py-1.5 border-primary/30 bg-primary/5 text-primary font-semibold rounded-full">
                  {file.department}
                </Badge>
              )}
            </div>
            
            {/* Status indicator moderne */}
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full shadow-sm animate-pulse"></div>
              <span className="text-xs text-slate-500 font-medium">Actif</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
