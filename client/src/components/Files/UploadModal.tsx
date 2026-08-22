import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, CloudUpload, FileText, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { allowedUploadExtensions, maxUploadFileSizeBytes } from "@shared/uploadConstraints";
import { useAuth } from "../../contexts/AuthContext";
import { useRole } from "../../contexts/RoleContext";
import { apiRequest } from "../../lib/queryClient";
import type { Department } from "../../types";

interface UploadModalProps {
  onClose: () => void;
}

type UploadStatus = "pending" | "uploading" | "done" | "error";

interface SelectedFile {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  errorMessage?: string;
  retryable?: boolean;
}

interface UploadProgress {
  completed: number;
  total: number;
}

interface UploadSummary {
  success: number;
  error: number;
}

const statusLabels: Record<UploadStatus, string> = {
  pending: "Prêt",
  uploading: "En cours",
  done: "Téléversé",
  error: "À corriger",
};

const statusClasses: Record<UploadStatus, string> = {
  pending: "border-border bg-muted text-foreground",
  uploading: "border-info/30 bg-info/10 text-info",
  done: "border-success/30 bg-success/10 text-success",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
};

function getFileId(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function getFileExtension(filename: string) {
  const separatorIndex = filename.lastIndexOf(".");
  return separatorIndex >= 0 ? filename.slice(separatorIndex).toLowerCase() : "";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} octets`;
  if (bytes < 1024 * 1024) return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(bytes / 1024)} Ko`;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} Mo`;
}

function validateFile(file: File) {
  const extension = getFileExtension(file.name);
  if (!allowedUploadExtensions.includes(extension)) {
    return `Extension non autorisée${extension ? ` : ${extension}` : ""}. Formats acceptés : ${allowedUploadExtensions.join(", ")}.`;
  }
  if (file.size > maxUploadFileSizeBytes) {
    return `Fichier trop volumineux : ${formatFileSize(file.size)}. Limite actuelle : ${formatFileSize(maxUploadFileSizeBytes)}.`;
  }
  return null;
}

function readStringProperty(value: unknown, property: string) {
  if (typeof value !== "object" || value === null || !(property in value)) return undefined;
  const candidate = Reflect.get(value, property);
  return typeof candidate === "string" ? candidate : undefined;
}

function getUploadErrorMessage(xhr: XMLHttpRequest) {
  try {
    const response: unknown = JSON.parse(xhr.responseText);
    const message = readStringProperty(response, "message");
    const details = readStringProperty(response, "details");
    if (message && details) return `${message}. ${details}`;
    if (message) return message;
  } catch {
    // La réponse peut être vide ou ne pas être au format JSON.
  }
  return xhr.status === 0
    ? "Le serveur est inaccessible. Vérifiez la connexion puis réessayez."
    : `Le serveur a refusé le fichier (erreur ${xhr.status}).`;
}

export default function UploadModal({ onClose }: UploadModalProps) {
  const { user } = useAuth();
  const { canUploadFiles } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);
  const [formData, setFormData] = useState(() => ({
    department: user?.role === "SUPERUSER" ? "" : user?.department ?? "",
    category: "",
    description: "",
  }));

  const departmentsQuery = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/departments");
      return response.json();
    },
    enabled: Boolean(user?.role === "SUPERUSER"),
  });

  if (!user || !canUploadFiles()) return null;

  const pendingFiles = selectedFiles.filter((item) => item.status === "pending");
  const uploadedFiles = selectedFiles.filter((item) => item.status === "done");
  const targetDepartment = user.role === "SUPERUSER" ? formData.department : user.department ?? "";
  const isMissingDepartment = !targetDepartment;
  const departmentsUnavailable = user.role === "SUPERUSER" && departmentsQuery.isError;
  const noDepartments = user.role === "SUPERUSER" && !departmentsQuery.isLoading && !departmentsQuery.isError && (departmentsQuery.data?.length ?? 0) === 0;
  const overallProgress = uploadProgress && uploadProgress.total > 0
    ? Math.round((uploadProgress.completed / uploadProgress.total) * 100)
    : 0;

  const addFiles = (files: File[]) => {
    if (isUploading) return;
    const existingIds = new Set(selectedFiles.map((item) => item.id));
    const uniqueFiles = files.filter((file) => !existingIds.has(getFileId(file)));
    const duplicateCount = files.length - uniqueFiles.length;
    const additions = uniqueFiles.map((file): SelectedFile => {
      const errorMessage = validateFile(file);
      return {
        id: getFileId(file),
        file,
        progress: 0,
        status: errorMessage ? "error" : "pending",
        errorMessage: errorMessage ?? undefined,
        retryable: false,
      };
    });

    if (duplicateCount > 0) {
      toast({
        title: "Fichier déjà sélectionné",
        description: `${duplicateCount} ${duplicateCount > 1 ? "fichiers ont été ignorés" : "fichier a été ignoré"}.`,
      });
    }

    setSelectedFiles((current) => [...current, ...additions]);
    setUploadSummary(null);
    setFormError(null);
  };

  const updateSelectedFile = (id: string, values: Partial<Omit<SelectedFile, "id" | "file">>) => {
    setSelectedFiles((current) => current.map((item) => item.id === id ? { ...item, ...values } : item));
  };

  const uploadFile = (selectedFile: SelectedFile, department: string) => new Promise<boolean>((resolve) => {
    const fileFormData = new FormData();
    fileFormData.append("file", selectedFile.file);
    if (user.role === "SUPERUSER") fileFormData.append("department", department);
    if (formData.category.trim()) fileFormData.append("category", formData.category.trim());
    if (formData.description.trim()) fileFormData.append("description", formData.description.trim());

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/files");
    const token = localStorage.getItem("archivio_token");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      updateSelectedFile(selectedFile.id, {
        progress: Math.round((event.loaded / event.total) * 100),
      });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        updateSelectedFile(selectedFile.id, { status: "done", progress: 100, errorMessage: undefined, retryable: false });
        resolve(true);
        return;
      }
      updateSelectedFile(selectedFile.id, {
        status: "error",
        errorMessage: getUploadErrorMessage(xhr),
        retryable: true,
      });
      resolve(false);
    };

    xhr.onerror = () => {
      updateSelectedFile(selectedFile.id, {
        status: "error",
        errorMessage: "Le serveur est inaccessible. Vérifiez la connexion puis réessayez.",
        retryable: true,
      });
      resolve(false);
    };

    xhr.send(fileFormData);
  });

  const submitUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pendingFiles.length === 0) {
      setFormError("Sélectionnez au moins un fichier valide à téléverser.");
      return;
    }
    if (isMissingDepartment) {
      setFormError(user.role === "SUPERUSER"
        ? "Sélectionnez le département propriétaire des documents."
        : "Votre compte doit être rattaché à un département avant de téléverser un document.");
      return;
    }
    if (departmentsUnavailable || noDepartments) {
      setFormError("Le référentiel des départements n'est pas disponible.");
      return;
    }

    const uploadQueue = [...pendingFiles];
    setIsUploading(true);
    setFormError(null);
    setUploadSummary(null);
    setUploadProgress({ completed: 0, total: uploadQueue.length });
    let successCount = 0;
    let errorCount = 0;

    for (const selectedFile of uploadQueue) {
      updateSelectedFile(selectedFile.id, { status: "uploading", progress: 0, errorMessage: undefined, retryable: false });
      const succeeded = await uploadFile(selectedFile, targetDepartment);
      if (succeeded) successCount += 1;
      else errorCount += 1;
      setUploadProgress((current) => current ? { ...current, completed: current.completed + 1 } : current);
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/files"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/files/pending"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] }),
    ]);

    setIsUploading(false);
    setUploadSummary({ success: successCount, error: errorCount });
    if (successCount > 0 && errorCount === 0) {
      toast({
        title: "Téléversement terminé",
        description: `${successCount} ${successCount > 1 ? "documents ont été envoyés" : "document a été envoyé"} pour validation.`,
      });
    } else if (successCount > 0) {
      toast({
        title: "Téléversement partiel",
        description: `${successCount} réussi${successCount > 1 ? "s" : ""}, ${errorCount} échoué${errorCount > 1 ? "s" : ""}.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Téléversement impossible",
        description: "Aucun document n'a pu être envoyé.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []));
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isUploading) return;
    dragCountRef.current += 1;
    if (event.dataTransfer.items.length > 0) setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCountRef.current = Math.max(0, dragCountRef.current - 1);
    if (dragCountRef.current === 0) setIsDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    dragCountRef.current = 0;
    if (isUploading) return;
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) addFiles(files);
  };

  const requestClose = () => {
    if (!isUploading) onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) requestClose(); }}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto [&>button]:hidden">
        <div className="flex items-start justify-between gap-4">
          <DialogHeader>
            <DialogTitle>Téléverser des documents</DialogTitle>
            <DialogDescription>
              Les documents envoyés reçoivent le statut « En attente » avant leur validation.
            </DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={requestClose}
            disabled={isUploading}
            aria-label="Fermer la fenêtre de téléversement"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <form onSubmit={submitUpload} className="space-y-6">
          {formError && (
            <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          {uploadProgress && isUploading && (
            <section aria-live="polite" className="rounded-lg border border-info/30 bg-info/10 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-info">Téléversement en cours</span>
                <span className="text-muted-foreground">{uploadProgress.completed} sur {uploadProgress.total} traité{uploadProgress.completed > 1 ? "s" : ""}</span>
              </div>
              <Progress value={overallProgress} className="mt-3 h-2" aria-label={`Progression globale : ${overallProgress} %`} />
            </section>
          )}

          {uploadSummary && !isUploading && (
            <section aria-live="polite" className={`rounded-lg border p-4 ${uploadSummary.error > 0 ? "border-warning/30 bg-warning/10" : "border-success/30 bg-success/10"}`}>
              <div className="flex items-start gap-3">
                {uploadSummary.error > 0
                  ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
                  : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />}
                <div>
                  <p className="font-medium">Téléversement terminé</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {uploadSummary.success} réussi{uploadSummary.success > 1 ? "s" : ""} · {uploadSummary.error} échoué{uploadSummary.error > 1 ? "s" : ""}.
                    {uploadSummary.success > 0 ? " Les documents envoyés attendent maintenant une validation." : ""}
                  </p>
                </div>
              </div>
            </section>
          )}

          <section aria-labelledby="file-selection-title">
            <div
              className={`rounded-lg border-2 border-dashed px-5 py-8 text-center transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <CloudUpload className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
              <h3 id="file-selection-title" className="mt-3 font-semibold">
                {isDragActive ? "Déposez les fichiers ici" : "Sélectionnez les documents à envoyer"}
              </h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Glissez-déposez vos fichiers ou utilisez le sélecteur. Limite technique actuelle : {formatFileSize(maxUploadFileSizeBytes)} par fichier.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{allowedUploadExtensions.join(", ")}</p>
              <Button type="button" variant="outline" className="mt-4" onClick={() => inputRef.current?.click()} disabled={isUploading}>
                Choisir des fichiers
              </Button>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={allowedUploadExtensions.join(",")}
                onChange={handleFileSelect}
                className="sr-only"
                tabIndex={-1}
                disabled={isUploading}
                aria-label="Choisir les fichiers à téléverser"
              />
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{selectedFiles.length} {selectedFiles.length > 1 ? "fichiers sélectionnés" : "fichier sélectionné"}</p>
                  {!isUploading && (
                    <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setSelectedFiles([]); setUploadSummary(null); }}>
                      Tout retirer
                    </Button>
                  )}
                </div>

                <div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
                  {selectedFiles.map((selectedFile) => (
                    <article key={selectedFile.id} className={`rounded-lg border p-3 ${selectedFile.status === "error" ? "border-destructive/30 bg-destructive/5" : "bg-card"}`}>
                      <div className="flex items-start gap-3">
                        <FileText className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium" title={selectedFile.file.name}>{selectedFile.file.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{formatFileSize(selectedFile.file.size)}</p>
                        </div>
                        <Badge variant="outline" className={statusClasses[selectedFile.status]}>
                          {selectedFile.status === "uploading" && <Loader2 className="mr-1 h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                          {statusLabels[selectedFile.status]}
                        </Badge>
                        {!isUploading && selectedFile.status === "error" && selectedFile.retryable && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              updateSelectedFile(selectedFile.id, {
                                status: "pending",
                                progress: 0,
                                errorMessage: undefined,
                                retryable: false,
                              });
                              setUploadSummary(null);
                            }}
                          >
                            Réessayer
                          </Button>
                        )}
                        {!isUploading && selectedFile.status !== "done" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setSelectedFiles((current) => current.filter((item) => item.id !== selectedFile.id))}
                            aria-label={`Retirer ${selectedFile.file.name}`}
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                      {selectedFile.status === "uploading" && (
                        <Progress value={selectedFile.progress} className="mt-3 h-1.5" aria-label={`${selectedFile.file.name} : ${selectedFile.progress} %`} />
                      )}
                      {selectedFile.errorMessage && (
                        <p role="alert" className="mt-2 flex items-start gap-2 text-xs leading-5 text-destructive">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {selectedFile.errorMessage}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="grid gap-4 border-t pt-5 sm:grid-cols-2" aria-label="Métadonnées communes">
            <div className="space-y-2">
              <Label htmlFor="upload-department">Département propriétaire</Label>
              {user.role === "SUPERUSER" ? (
                departmentsQuery.isError ? (
                  <div className="rounded-md border border-destructive/30 p-3">
                    <p className="text-sm text-destructive">Impossible de charger les départements.</p>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void departmentsQuery.refetch()}>
                      Réessayer
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData((current) => ({ ...current, department: value }))}
                    disabled={isUploading || departmentsQuery.isLoading || noDepartments}
                  >
                    <SelectTrigger id="upload-department">
                      <SelectValue placeholder={departmentsQuery.isLoading ? "Chargement..." : "Sélectionner un département"} />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentsQuery.data?.map((department) => (
                        <SelectItem key={department.id} value={department.name}>{department.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              ) : (
                <Input id="upload-department" value={user.department ?? "Non attribué"} disabled />
              )}
              {noDepartments && <p className="text-sm text-warning">Créez d'abord un département avant de téléverser un document.</p>}
              {user.role !== "SUPERUSER" && !user.department && (
                <p className="text-sm text-warning">Votre compte n'est rattaché à aucun département.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-category">Catégorie <span className="font-normal text-muted-foreground">(facultatif)</span></Label>
              <Input
                id="upload-category"
                value={formData.category}
                onChange={(event) => setFormData((current) => ({ ...current, category: event.target.value }))}
                placeholder="Ex. Rapport, manuel, contrat"
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="upload-description">Description <span className="font-normal text-muted-foreground">(facultatif)</span></Label>
              <Textarea
                id="upload-description"
                value={formData.description}
                onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                placeholder="Contexte utile pour la validation et la recherche"
                rows={3}
                disabled={isUploading}
              />
              <p className="text-xs text-muted-foreground">La catégorie et la description s'appliquent à tous les fichiers de cette sélection.</p>
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={requestClose} disabled={isUploading}>
              {uploadedFiles.length > 0 && pendingFiles.length === 0 ? "Fermer" : "Annuler"}
            </Button>
            <Button
              type="submit"
              disabled={isUploading || pendingFiles.length === 0 || isMissingDepartment || departmentsUnavailable || noDepartments}
            >
              {isUploading
                ? `Téléversement… (${uploadProgress?.completed ?? 0}/${uploadProgress?.total ?? 0})`
                : pendingFiles.length > 0
                  ? `Téléverser ${pendingFiles.length} ${pendingFiles.length > 1 ? "documents" : "document"}`
                  : "Téléverser"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
