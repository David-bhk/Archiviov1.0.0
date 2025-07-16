import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CloudUpload, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useRole } from "../../contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";
import { Department } from "../../types";

interface UploadModalProps {
  onClose: () => void;
}

export default function UploadModal({ onClose }: UploadModalProps) {
  const { user } = useAuth();
  const { canUploadFiles, canManageDepartments } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [formData, setFormData] = useState({
    department: "",
    category: "",
    description: "",
  });

  // Check if user can upload files
  if (!canUploadFiles()) {
    return null;
  }

  // Set default department for regular users
  useEffect(() => {
    if (user && user.role === "user") {
      setFormData(prev => ({ ...prev, department: user.department }));
    }
  }, [user]);

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (fileData: any) => {
      const response = await apiRequest("POST", "/api/files", fileData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "Fichier téléchargé",
        description: "Le fichier a été téléchargé avec succès",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le fichier",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un fichier",
        variant: "destructive",
      });
      return;
    }

    if (!formData.department || !formData.category) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    // Simulate file upload for each selected file
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileData = {
        filename: file.name.replace(/\s+/g, "_").toLowerCase(),
        originalName: file.name,
        fileType: file.name.split(".").pop() || "",
        fileSize: file.size,
        filePath: `/uploads/${file.name}`,
        uploadedBy: user?.id,
        department: formData.department,
        category: formData.category,
        description: formData.description,
      };

      await uploadMutation.mutateAsync(fileData);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    setSelectedFiles(files);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Télécharger des fichiers</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-primary transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <CloudUpload className="mx-auto mb-4 text-slate-400" size={48} />
            <p className="text-lg font-medium text-slate-700 mb-2">
              Glissez et déposez vos fichiers ici
            </p>
            <p className="text-sm text-slate-500 mb-4">ou cliquez pour sélectionner</p>
            <Button type="button" variant="outline">
              <Input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              Sélectionner des fichiers
            </Button>
            
            {selectedFiles && selectedFiles.length > 0 && (
              <div className="mt-4 text-sm text-slate-600">
                <p>Fichiers sélectionnés: {selectedFiles.length}</p>
                <ul className="mt-2 space-y-1">
                  {Array.from(selectedFiles).map((file, index) => (
                    <li key={index} className="text-left">
                      {file.name} ({Math.round(file.size / 1024)} KB)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Département *</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
                disabled={user?.role === "user"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un département" />
                </SelectTrigger>
                <SelectContent>
                  {canManageDepartments() ? (
                    departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value={user?.department || ""}>
                      {user?.department}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rapport">Rapport</SelectItem>
                  <SelectItem value="Manuel">Manuel</SelectItem>
                  <SelectItem value="Budget">Budget</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Contrat">Contrat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ajoutez une description pour ces fichiers..."
              rows={3}
            />
          </div>
          
          <div className="flex items-center justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? "Téléchargement..." : "Télécharger"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
