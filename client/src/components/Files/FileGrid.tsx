import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FileText, Plus, RefreshCw, Search } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "../../contexts/AuthContext";
import { useRole } from "../../contexts/RoleContext";
import { useDebounce } from "../../hooks/useDebounce";
import { apiRequest } from "../../lib/queryClient";
import type { File, PaginatedResponse } from "../../types";
import { useToast } from "@/hooks/use-toast";
import FileTable from "./FileTable";
import FiltersBar, { type DocumentFilters } from "./FiltersBar";

interface FileGridProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onUpload?: () => void;
  variant?: "library" | "search";
}

const PAGE_SIZE = 15;
const DEFAULT_FILTERS: DocumentFilters = {
  type: "all",
  department: "all",
  date: "all",
};

export default function FileGrid({ searchQuery, onSearchChange, onUpload, variant = "library" }: FileGridProps) {
  const { user } = useAuth();
  const { canDeleteFile, canDownloadFile, canUploadFiles } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const debouncedSearchQuery = useDebounce(searchQuery.trim(), 300);
  const [filters, setFilters] = useState<DocumentFilters>(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [documentToDelete, setDocumentToDelete] = useState<File | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const isSearchMode = variant === "search";
  const hasActiveCriteria = Boolean(
    debouncedSearchQuery ||
    filters.type !== "all" ||
    filters.date !== "all" ||
    (user?.role === "SUPERUSER" && filters.department !== "all"),
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, filters.type, filters.department, filters.date]);

  const documentsQuery = useQuery<PaginatedResponse<File>>({
    queryKey: ["/api/files", variant, debouncedSearchQuery, filters, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(PAGE_SIZE),
      });
      if (debouncedSearchQuery) params.set("search", debouncedSearchQuery);
      if (filters.type !== "all") params.set("type", filters.type);
      if (filters.date !== "all") params.set("date", filters.date);
      if (user?.role === "SUPERUSER" && filters.department !== "all") {
        params.set("department", filters.department);
      }

      const response = await apiRequest("GET", `/api/files?${params.toString()}`);
      return response.json();
    },
    enabled: Boolean(user) && (!isSearchMode || hasActiveCriteria),
    staleTime: 2 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: number) => apiRequest("DELETE", `/api/files/${documentId}`),
    onSuccess: async () => {
      setDocumentToDelete(null);
      if ((documentsQuery.data?.data.length ?? 0) === 1 && currentPage > 1) {
        setCurrentPage((page) => page - 1);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "Document retiré",
        description: "Le document n'est plus visible dans la bibliothèque.",
      });
    },
    onError: () => {
      toast({
        title: "Suppression impossible",
        description: "Le document n'a pas pu être retiré. Vérifiez vos autorisations puis réessayez.",
        variant: "destructive",
      });
    },
  });

  const handleDownload = async (file: File) => {
    const token = localStorage.getItem("archivio_token");
    if (!token) {
      toast({
        title: "Session requise",
        description: "Reconnectez-vous avant de télécharger un document.",
        variant: "destructive",
      });
      return;
    }

    setDownloadingId(file.id);
    try {
      const response = await fetch(`/api/files/${file.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("download_failed");

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = file.originalName || file.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);

      toast({
        title: "Téléchargement prêt",
        description: `${file.originalName} a été téléchargé.`,
      });
    } catch {
      toast({
        title: "Téléchargement impossible",
        description: "Le document est indisponible ou votre compte ne peut pas le télécharger.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  if (!user) return null;

  const files = documentsQuery.data?.data ?? [];
  const totalFiles = documentsQuery.data?.total ?? 0;
  const totalPages = Math.max(documentsQuery.data?.totalPages ?? 1, 1);
  const scopeDescription = isSearchMode
    ? "Recherchez dans les noms et descriptions des documents accessibles à votre compte."
    : user.role === "SUPERUSER"
      ? "Consultez les documents de l'ensemble de l'organisation."
      : user.role === "ADMIN"
        ? `Consultez les documents du département ${user.department || "non attribué"}.`
        : "Retrouvez vos documents et les archives accessibles dans votre département.";

  return (
    <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">{isSearchMode ? "Recherche" : "Espace documentaire"}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {isSearchMode
              ? "Recherche documentaire"
              : user.role === "USER"
                ? "Mes documents"
                : "Bibliothèque documentaire"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{scopeDescription}</p>
        </div>
        {!isSearchMode && canUploadFiles() && onUpload && (
          <Button onClick={onUpload} className="min-h-10 shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau document
          </Button>
        )}
      </section>

      <FiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        totalFiles={isSearchMode && !hasActiveCriteria ? undefined : totalFiles}
        isLoading={documentsQuery.isFetching}
        showDepartmentFilter={user.role === "SUPERUSER"}
      />

      <section className="mt-5" aria-label="Liste des documents">
        {isSearchMode && !hasActiveCriteria ? (
          <div className="rounded-lg border bg-card px-6 py-12 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold">Commencez votre recherche</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Saisissez un mot dans la barre de recherche ou choisissez au moins un filtre.
            </p>
          </div>
        ) : documentsQuery.isLoading ? (
          <div className="space-y-3" aria-label="Chargement des documents">
            {[1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-20 rounded-lg" />)}
          </div>
        ) : documentsQuery.isError ? (
          <div className="rounded-lg border border-destructive bg-card p-6">
            <h2 className="text-lg font-semibold">
              {isSearchMode ? "La recherche n'a pas pu être effectuée" : "La bibliothèque n'a pas pu être chargée"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Vérifiez la connexion au serveur, puis réessayez.
            </p>
            <Button variant="outline" className="mt-5 min-h-10" onClick={() => void documentsQuery.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </div>
        ) : files.length === 0 ? (
          <div className="rounded-lg border bg-card px-6 py-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold">{isSearchMode ? "Aucun résultat" : "Aucun document trouvé"}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {isSearchMode
                ? "Aucun document accessible ne correspond à ces critères."
                : hasActiveCriteria
                ? "Modifiez la recherche ou effacez les filtres pour afficher d'autres documents."
                : "Ajoutez un premier document pour commencer son circuit de validation."}
            </p>
            {hasActiveCriteria ? (
              <Button
                variant="outline"
                className="mt-5 min-h-10"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  onSearchChange("");
                }}
              >
                Effacer la recherche et les filtres
              </Button>
            ) : canUploadFiles() && onUpload ? (
              <Button className="mt-5 min-h-10" onClick={onUpload}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un document
              </Button>
            ) : null}
          </div>
        ) : (
          <FileTable
            files={files}
            downloadingId={downloadingId}
            canDownload={canDownloadFile}
            canDelete={canDeleteFile}
            onDownload={(file) => void handleDownload(file)}
            onRequestDelete={setDocumentToDelete}
          />
        )}
      </section>

      {totalPages > 1 && (
        <nav className="mt-5 flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Pagination des documents">
          <p className="text-center text-sm text-muted-foreground sm:text-left">
            Page {currentPage} sur {totalPages} · {new Intl.NumberFormat("fr-FR").format(totalFiles)} documents
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              className="min-h-10"
              disabled={currentPage <= 1 || documentsQuery.isFetching}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Précédent
            </Button>
            <Button
              variant="outline"
              className="min-h-10"
              disabled={currentPage >= totalPages || documentsQuery.isFetching}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              Suivant
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </nav>
      )}

      <AlertDialog open={Boolean(documentToDelete)} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce document de la bibliothèque&nbsp;?</AlertDialogTitle>
            <AlertDialogDescription>
              {documentToDelete
                ? `« ${documentToDelete.originalName} » ne sera plus visible dans les listes documentaires. Son contenu n'est pas détruit immédiatement.`
                : "Le document ne sera plus visible dans les listes documentaires."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive"
              disabled={deleteMutation.isPending || !documentToDelete}
              onClick={(event) => {
                event.preventDefault();
                if (documentToDelete) deleteMutation.mutate(documentToDelete.id);
              }}
            >
              {deleteMutation.isPending ? "Suppression…" : "Retirer le document"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
