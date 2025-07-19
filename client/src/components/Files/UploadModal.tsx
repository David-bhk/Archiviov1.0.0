import { useState, useEffect, useRef } from "react";
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
  const { canManageDepartments } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<Array<{
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'done' | 'error';
    xhr?: XMLHttpRequest | null;
  }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    department: "",
    category: "",
    description: "",
  });

  // Suppression du blocage d'upload : tous les utilisateurs connectés peuvent uploader

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
    mutationFn: async (fileData: FormData) => {
      const response = await fetch("/api/files", {
        method: "POST",
        body: fileData,
      });
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
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
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [
      ...prev,
      ...files.map(file => ({ file, progress: 0, status: 'pending' as const }))
    ]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemoveFile = (index: number) => {
    // Si upload en cours, annule le XHR
    setSelectedFiles(prev => {
      const fileObj = prev[index];
      if (fileObj && fileObj.status === 'uploading' && fileObj.xhr) {
        fileObj.xhr.abort();
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un fichier",
        variant: "destructive",
      });
      return;
    }
    if (!formData.department && user?.role !== "user") {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un département",
        variant: "destructive",
      });
      return;
    }
    // Upload each file with progress
    for (let i = 0; i < selectedFiles.length; i++) {
      await new Promise<void>((resolve, reject) => {
        const fileObj = selectedFiles[i];
        setSelectedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading', progress: 0 } : f));
        const fileFormData = new FormData();
        fileFormData.append("file", fileObj.file);
        fileFormData.append("uploadedBy", user!.id.toString());
        fileFormData.append("department", formData.department || user!.department || "");
        fileFormData.append("category", formData.category);
        fileFormData.append("description", formData.description);
        // ...ne plus gérer le champ status
        const xhr = new XMLHttpRequest();
        setSelectedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, xhr } : f));
        xhr.open("POST", "/api/files");
        const token = localStorage.getItem("archivio_token");
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setSelectedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, progress: percent } : f));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setSelectedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done', progress: 100, xhr: undefined } : f));
            resolve();
          } else {
            setSelectedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', xhr: undefined } : f));
            reject();
          }
        };
        xhr.onerror = () => {
          setSelectedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', xhr: undefined } : f));
          reject();
        };
        xhr.onabort = () => {
          setSelectedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', xhr: undefined } : f));
          reject();
        };
        xhr.send(fileFormData);
      });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/files"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    toast({
      title: "Fichiers téléchargés",
      description: "Tous les fichiers ont été téléchargés avec succès",
    });
    onClose();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files || []);
    setSelectedFiles(prev => [
      ...prev,
      ...files.map(file => ({ file, progress: 0, status: 'pending' as const, xhr: undefined }))
    ]);
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

            <label className="inline-block cursor-pointer bg-white border border-slate-300 rounded px-4 py-2 hover:border-primary transition-colors">
              Sélectionner des fichiers
            <Input
              ref={inputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
              onChange={handleFileSelect}
              className="hidden"
            />
            </label>
            
            {selectedFiles.length > 0 && (
              <div className="mt-4 text-sm text-slate-600">
                <p>Fichiers sélectionnés: {selectedFiles.length}</p>
                <ul className="mt-2 space-y-1">
                  {selectedFiles.map((f, index) => (
                    <li key={index} className="flex items-center justify-between gap-2 text-left">
                      <span>{f.file.name} ({Math.round(f.file.size / 1024)} KB)</span>
                      <div className="flex items-center gap-2">
                        {/* Progress bar toujours visible */}
                        <span className="w-32 bg-slate-200 rounded h-2 block overflow-hidden">
                          <span style={{ width: `${f.progress}%` }} className={`block h-2 ${f.status === 'error' ? 'bg-red-400' : 'bg-primary'} transition-all`}></span>
                        </span>
                        {f.status === 'done' && <span className="text-green-600">✔</span>}
                        {f.status === 'error' && <span className="text-red-600">✖</span>}
                        {(f.status === 'pending' || f.status === 'uploading') && (
                          <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveFile(index)}>
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
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
            <Button
              type="submit"
              disabled={selectedFiles.some(f => f.status === 'uploading') || selectedFiles.length === 0}
            >
              {selectedFiles.some(f => f.status === 'uploading') ? "Téléchargement..." : "Télécharger"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
