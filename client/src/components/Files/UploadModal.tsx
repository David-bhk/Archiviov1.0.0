import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CloudUpload, X, FileText, AlertCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useRole } from "../../contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";
import { Department } from "../../types";

interface UploadModalProps {
  onClose: () => void;
}

interface FileWithStatus {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  xhr?: XMLHttpRequest;
  errorMessage?: string;
}

export default function UploadModal({ onClose }: UploadModalProps) {
  const { user } = useAuth();
  const { canManageDepartments } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<FileWithStatus[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);
  const [formData, setFormData] = useState({
    department: "",
    category: "",
    description: "",
  });

  // Constants for file validation
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.gif'];

  // Set default department for regular users
  useEffect(() => {
    if (user && user.role === "user" && user.department) {
      setFormData(prev => ({ ...prev, department: user.department }));
    }
  }, [user]);

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  // File validation function
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!ALLOWED_TYPES.includes(fileExtension)) {
      return { 
        isValid: false, 
        error: `Type de fichier non autorisé: ${fileExtension}. Types autorisés: ${ALLOWED_TYPES.join(', ')}` 
      };
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return { 
        isValid: false, 
        error: `Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(1)}MB. Limite: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      };
    }
    
    return { isValid: true };
  };

  // Add files with validation
  const addFiles = (files: File[]) => {
    const newFiles: FileWithStatus[] = files.map(file => {
      const validation = validateFile(file);
      return {
        file,
        progress: 0, // Toujours commencer à 0
        status: validation.isValid ? 'pending' as const : 'error' as const,
        errorMessage: validation.error
      };
    });

    // Check for duplicates
    const filteredFiles = newFiles.filter(newFile => 
      !selectedFiles.some(existingFile => 
        existingFile.file.name === newFile.file.name && 
        existingFile.file.size === newFile.file.size
      )
    );

    if (filteredFiles.length !== newFiles.length) {
      toast({
        title: "Fichiers en double",
        description: "Certains fichiers ont été ignorés car ils sont déjà sélectionnés",
        variant: "destructive",
      });
    }

    setSelectedFiles(prev => [...prev, ...filteredFiles]);
  };

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
    addFiles(files);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemoveFile = (index: number) => {
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
    
    // Validate form data
    const validFiles = selectedFiles.filter(f => f.status !== 'error');
    
    if (validFiles.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un fichier valide",
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

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    // Upload each valid file
    for (let i = 0; i < selectedFiles.length; i++) {
      const fileObj = selectedFiles[i];
      
      // Skip invalid files
      if (fileObj.status === 'error') continue;

      try {
        // Update status to uploading
        setSelectedFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'uploading', progress: 0 } : f
        ));

        await new Promise<void>((resolve, reject) => {
          const fileFormData = new FormData();
          fileFormData.append("file", fileObj.file);
          fileFormData.append("uploadedBy", user!.id.toString());
          fileFormData.append("department", formData.department || user!.department || "");
          fileFormData.append("category", formData.category);
          fileFormData.append("description", formData.description);

          const xhr = new XMLHttpRequest();
          
          // Store XHR reference for potential cancellation
          setSelectedFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, xhr } : f
          ));

          xhr.open("POST", "/api/files");
          
          const token = localStorage.getItem("archivio_token");
          if (token) {
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          }

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              console.log(`Progress for file ${i}: ${percent}%`); // Debug log
              setSelectedFiles(prev => prev.map((f, idx) => 
                idx === i ? { ...f, progress: percent } : f
              ));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setSelectedFiles(prev => prev.map((f, idx) => 
                idx === i ? { ...f, status: 'done', progress: 100, xhr: undefined } : f
              ));
              successCount++;
              resolve();
            } else {
              const errorMessage = `Erreur ${xhr.status}: ${xhr.statusText}`;
              setSelectedFiles(prev => prev.map((f, idx) => 
                idx === i ? { ...f, status: 'error', xhr: undefined, errorMessage } : f
              ));
              errorCount++;
              reject(new Error(errorMessage));
            }
          };

          xhr.onerror = () => {
            const errorMessage = "Erreur de réseau";
            setSelectedFiles(prev => prev.map((f, idx) => 
              idx === i ? { ...f, status: 'error', xhr: undefined, errorMessage } : f
            ));
            errorCount++;
            reject(new Error(errorMessage));
          };

          xhr.onabort = () => {
            setSelectedFiles(prev => prev.map((f, idx) => 
              idx === i ? { ...f, status: 'error', xhr: undefined, errorMessage: "Upload annulé" } : f
            ));
            errorCount++;
            reject(new Error("Upload cancelled"));
          };

          xhr.send(fileFormData);
        });
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    setIsUploading(false);

    // Update cache and show summary
    queryClient.invalidateQueries({ queryKey: ["/api/files"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats"] });

    if (successCount > 0 && errorCount === 0) {
      toast({
        title: "Succès",
        description: `${successCount} fichier(s) téléchargé(s) avec succès`,
      });
      setTimeout(() => onClose(), 1500); // Auto-close after success
    } else if (successCount > 0 && errorCount > 0) {
      toast({
        title: "Partiellement réussi",
        description: `${successCount} fichier(s) réussi(s), ${errorCount} échoué(s)`,
        variant: "destructive",
      });
    } else if (errorCount > 0) {
      toast({
        title: "Échec",
        description: `${errorCount} fichier(s) ont échoué`,
        variant: "destructive",
      });
    }
  };

  // Improved drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    dragCountRef.current = 0;
    
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      addFiles(files);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Télécharger des fichiers</span>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isUploading}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Progress Global - Visible uniquement pendant l'upload */}
          {isUploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">
                  Upload en cours...
                </span>
                <span className="text-sm text-blue-600">
                  {selectedFiles.filter(f => f.status === 'done').length} / {selectedFiles.filter(f => f.status !== 'error').length}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-3 bg-blue-500 transition-all duration-500"
                  style={{ 
                    width: `${(selectedFiles.filter(f => f.status === 'done').length / selectedFiles.filter(f => f.status !== 'error').length) * 100}%` 
                  }}
                />
              </div>
            </div>
          )}

          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
              isDragActive 
                ? 'border-primary bg-primary/5 scale-105' 
                : 'border-slate-300 hover:border-primary hover:bg-slate-50'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <CloudUpload 
              className={`mx-auto mb-4 transition-colors ${
                isDragActive ? 'text-primary' : 'text-slate-400'
              }`} 
              size={48} 
            />
            <p className="text-lg font-medium text-slate-700 mb-2">
              {isDragActive ? 'Déposez vos fichiers ici' : 'Glissez et déposez vos fichiers ici'}
            </p>
            <p className="text-sm text-slate-500 mb-4">
              ou cliquez pour sélectionner • Limite: {MAX_FILE_SIZE / 1024 / 1024}MB par fichier
            </p>

            <label className="inline-block cursor-pointer bg-white border border-slate-300 rounded px-4 py-2 hover:border-primary transition-colors">
              Sélectionner des fichiers
              <Input
                ref={inputRef}
                type="file"
                multiple
                accept={ALLOWED_TYPES.join(',')}
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
            </label>
            
            {/* File List */}
            {selectedFiles.length > 0 && (
              <div className="mt-6 text-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium text-slate-700">
                    Fichiers sélectionnés: {selectedFiles.length}
                  </p>
                  {!isUploading && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFiles([])}
                      className="text-red-600 hover:text-red-700"
                    >
                      Tout supprimer
                    </Button>
                  )}
                </div>
                
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {selectedFiles.map((fileObj, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left ${
                        fileObj.status === 'error' ? 'border-red-200 bg-red-50' :
                        fileObj.status === 'done' ? 'border-green-200 bg-green-50' :
                        fileObj.status === 'uploading' ? 'border-blue-200 bg-blue-50' :
                        'border-slate-200 bg-white'
                      }`}
                    >
                      <FileText className={`w-4 h-4 flex-shrink-0 ${
                        fileObj.status === 'error' ? 'text-red-500' :
                        fileObj.status === 'done' ? 'text-green-500' :
                        fileObj.status === 'uploading' ? 'text-blue-500' :
                        'text-slate-400'
                      }`} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-700 truncate">
                          {fileObj.file.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {(fileObj.file.size / 1024).toFixed(1)} KB
                        </div>
                        {fileObj.errorMessage && (
                          <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {fileObj.errorMessage}
                          </div>
                        )}
                      </div>

                      {/* Progress Bar - Toujours visible sauf pour les erreurs */}
                      {fileObj.status !== 'error' && (
                        <div className="w-24">
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-2 transition-all duration-300 ${
                                fileObj.status === 'done' ? 'bg-green-500' : 
                                fileObj.status === 'uploading' ? 'bg-blue-500' : 
                                'bg-slate-300'
                              }`}
                              style={{ width: `${fileObj.progress}%` }}
                            />
                          </div>
                          <div className="text-xs text-slate-500 mt-1 text-center">
                            {fileObj.status === 'pending' ? 'En attente' : `${fileObj.progress}%`}
                          </div>
                        </div>
                      )}

                      {/* Status Icons and Actions */}
                      <div className="flex items-center gap-2">
                        {fileObj.status === 'done' && (
                          <span className="text-green-600 font-medium">✓</span>
                        )}
                        {fileObj.status === 'error' && (
                          <span className="text-red-600 font-medium">✕</span>
                        )}
                        {(fileObj.status === 'pending' || fileObj.status === 'error') && !isUploading && (
                          <Button 
                            type="button" 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleRemoveFile(index)}
                            className="p-1 h-6 w-6 text-slate-400 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isUploading}
            >
              {isUploading ? 'Fermer après upload' : 'Annuler'}
            </Button>
            <Button
              type="submit"
              disabled={isUploading || selectedFiles.filter(f => f.status !== 'error').length === 0}
              className="min-w-[120px]"
            >
              {isUploading 
                ? `Upload... (${selectedFiles.filter(f => f.status === 'done').length}/${selectedFiles.filter(f => f.status !== 'error').length})`
                : `Télécharger (${selectedFiles.filter(f => f.status !== 'error').length})`
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
