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
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface CompactFileCardProps {
  file: File;
}

function getAuthToken() {
  return localStorage.getItem('archivio_token'); // Corrigé pour utiliser la bonne clé
}

export default function CompactFileCard({ file }: CompactFileCardProps) {
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
      case "pdf": return <FileText className="w-8 h-8 text-red-500" />;
      case "docx": case "doc": return <FileText className="w-8 h-8 text-blue-500" />;
      case "xlsx": case "xls": return <FileText className="w-8 h-8 text-green-500" />;
      case "png": case "jpg": case "jpeg": return <Image className="w-8 h-8 text-purple-500" />;
      default: return <FileText className="w-8 h-8 text-slate-500" />;
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
    return formatDistanceToNow(d, { addSuffix: true, locale: fr });
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
    <Card className="border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 cursor-pointer group h-full bg-white">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {/* File Icon */}
          <div className="flex-shrink-0">
            {getFileIcon(file.fileType)}
          </div>
          
          {/* File Info */}
          <div className="flex-1 min-w-0">
            <h3 
              className="font-semibold text-slate-900 text-sm leading-tight mb-1 line-clamp-2" 
              title={file.originalName}
            >
              {file.originalName}
            </h3>
            
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {file.fileType.toUpperCase()}
              </Badge>
              <span className="text-xs text-slate-500 font-medium">
                {formatFileSize(file.fileSize)}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center space-x-1">
                <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">
                    {file.uploaderName ? file.uploaderName.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
                <span className="truncate max-w-16">
                  {file.uploaderName || "Inconnu"}
                </span>
              </div>
              <span>{formatDate(file.createdAt)}</span>
            </div>
          </div>
          
          {/* Actions - Visible au hover */}
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-slate-100">
                <Eye className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              {canDeleteFile(file) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Department & Category */}
        {(file.department || file.category) && (
          <div className="flex items-center space-x-2 mt-3 pt-2 border-t border-slate-100">
            {file.department && (
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                {file.department}
              </Badge>
            )}
            {file.category && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {file.category}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
