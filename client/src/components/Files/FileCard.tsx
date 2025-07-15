import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Download, Trash2, MoreVertical, FileText, File as FileIcon, Image, Sheet } from "lucide-react";
import { useRole } from "../../contexts/RoleContext";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";
import { File, User } from "../../types";

interface FileCardProps {
  file: File;
}

export default function FileCard({ file }: FileCardProps) {
  const { user } = useAuth();
  const { canDeleteFile } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/files/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "Fichier supprimé",
        description: "Le fichier a été supprimé avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le fichier",
        variant: "destructive",
      });
    },
  });

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "pdf":
        return <FileText className="text-red-600" size={20} />;
      case "docx":
        return <FileText className="text-blue-600" size={20} />;
      case "xlsx":
        return <Sheet className="text-green-600" size={20} />;
      case "png":
      case "jpg":
      case "jpeg":
        return <Image className="text-purple-600" size={20} />;
      default:
        return <FileIcon className="text-slate-600" size={20} />;
    }
  };

  const getFileTypeColor = (fileType: string) => {
    switch (fileType) {
      case "pdf":
        return "bg-red-100";
      case "docx":
        return "bg-blue-100";
      case "xlsx":
        return "bg-green-100";
      case "png":
      case "jpg":
      case "jpeg":
        return "bg-purple-100";
      default:
        return "bg-slate-100";
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

  const getAuthorName = (uploadedBy: number | undefined) => {
    // In a real app, you would fetch user details
    // For now, we'll use mock data
    const users: Record<number, string> = {
      1: "John Doe",
      2: "Marie Dubois",
      3: "Pierre Martin",
      4: "Thomas Dupont",
    };
    return users[uploadedBy || 0] || "Inconnu";
  };

  const handleDelete = () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce fichier ?")) {
      deleteMutation.mutate(file.id);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`w-10 h-10 ${getFileTypeColor(file.fileType)} rounded-lg flex items-center justify-center`}>
              {getFileIcon(file.fileType)}
            </div>
            <div>
              <h3 className="font-medium text-slate-800 truncate" title={file.originalName}>
                {file.originalName}
              </h3>
              <p className="text-sm text-slate-500">{formatFileSize(file.fileSize)}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>

        {/* Image preview for image files */}
        {file.fileType === "png" && (
          <div className="mb-3">
            <img 
              src="https://images.unsplash.com/photo-1572021335469-31706a17aaef?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=200" 
              alt="Preview" 
              className="w-full h-20 object-cover rounded-lg"
            />
          </div>
        )}
        
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center space-x-2">
            <span className="w-4 text-slate-400">👤</span>
            <span>{getAuthorName(file.uploadedBy)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-4 text-slate-400">🏢</span>
            <span>{file.department || "Non spécifié"}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-4 text-slate-400">📅</span>
            <span>{formatDate(file.createdAt)}</span>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {file.category && (
              <Badge variant="secondary" className="text-xs">
                {file.category}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4" />
            </Button>
            {canDeleteFile(file) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
