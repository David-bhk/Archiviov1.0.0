import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Ban,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import UploadModal from "../components/Files/UploadModal";
import Sidebar from "../components/Layout/Sidebar";
import TopBar from "../components/Layout/TopBar";
import UserManagementModal from "../components/Users/UserManagementModal";
import { useAuth } from "../contexts/AuthContext";
import { useRole } from "../contexts/RoleContext";
import { apiRequest } from "../lib/queryClient";
import type { File, PaginatedResponse } from "../types";

type ReviewDecision = "approve" | "reject";
type ReviewInput = { id: number; decision: ReviewDecision; justification: string };
type ReviewTarget = { file: File; decision: ReviewDecision };

const PAGE_SIZE = 20;

function formatDate(value?: Date) {
  if (!value) return "Date inconnue";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function documentType(file: File) {
  const extension = file.originalName.split(".").pop()?.trim();
  return (extension || file.fileType || "Fichier").toUpperCase();
}

export default function PendingFiles() {
  const { user } = useAuth();
  const { canAccessUserManagement } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [justification, setJustification] = useState("");
  const [showValidationError, setShowValidationError] = useState(false);
  const isReviewer = user?.role === "ADMIN" || user?.role === "SUPERUSER";

  const pendingQuery = useQuery<PaginatedResponse<File>>({
    queryKey: ["/api/files/pending", page, PAGE_SIZE],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      const response = await apiRequest("GET", `/api/files/pending?${params.toString()}`);
      return response.json();
    },
    enabled: isReviewer,
  });

  const closeReviewDialog = () => {
    if (reviewMutation.isPending) return;
    setReviewTarget(null);
    setJustification("");
    setShowValidationError(false);
  };

  const reviewMutation = useMutation({
    mutationFn: async ({ id, decision, justification: comment }: ReviewInput) => {
      const response = await apiRequest("PATCH", `/api/files/${id}/${decision}`, {
        justification: comment,
      });
      return response.json();
    },
    onSuccess: (_result, variables) => {
      setReviewTarget(null);
      setJustification("");
      setShowValidationError(false);
      void queryClient.invalidateQueries({ queryKey: ["/api/files/pending"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: variables.decision === "approve" ? "Document archivé" : "Document refusé",
        description: "La décision et sa justification ont été enregistrées dans l'historique.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Décision non enregistrée",
        description: error.message || "Une erreur est survenue. Réessayez.",
      });
    },
  });

  if (!user) return null;

  const openUserManagement = () => {
    if (canAccessUserManagement()) setShowUserModal(true);
  };

  const openReviewDialog = (file: File, decision: ReviewDecision) => {
    setReviewTarget({ file, decision });
    setJustification("");
    setShowValidationError(false);
  };

  const submitReview = () => {
    const comment = justification.trim();
    if (!reviewTarget || comment.length < 3) {
      setShowValidationError(true);
      return;
    }
    reviewMutation.mutate({
      id: reviewTarget.file.id,
      decision: reviewTarget.decision,
      justification: comment,
    });
  };

  const files = pendingQuery.data?.data ?? [];
  const total = pendingQuery.data?.total ?? 0;
  const totalPages = pendingQuery.data?.totalPages ?? 0;
  const roleScope = user.role === "SUPERUSER"
    ? "Tous les départements"
    : user.department || "Votre département";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] lg:block">
        <Sidebar
          onUpload={() => setShowUploadModal(true)}
          onUserManagement={openUserManagement}
        />
      </aside>

      <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
        <SheetContent side="left" className="w-[280px] p-0 [&>button]:hidden">
          <SheetTitle className="sr-only">Navigation principale</SheetTitle>
          <SheetDescription className="sr-only">
            Accédez aux différentes sections d'Archivio.
          </SheetDescription>
          <Sidebar
            onClose={() => setShowMobileMenu(false)}
            onUpload={() => {
              setShowMobileMenu(false);
              setShowUploadModal(true);
            }}
            onUserManagement={() => {
              setShowMobileMenu(false);
              openUserManagement();
            }}
          />
        </SheetContent>
      </Sheet>

      <div className="min-h-screen lg:ml-[280px]">
        <TopBar
          searchQuery=""
          onSearchChange={() => undefined}
          onUpload={() => setShowUploadModal(true)}
          onMenuToggle={() => setShowMobileMenu(true)}
          showSearch={false}
          pageTitle="Validation des documents"
          breadcrumb={roleScope}
        />

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {!isReviewer ? (
            <section className="flex min-h-[55vh] items-center justify-center">
              <div className="max-w-lg rounded-xl border bg-card p-8 text-center shadow-sm">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <ShieldAlert className="h-6 w-6" aria-hidden="true" />
                </span>
                <h1 className="mt-4 text-xl font-semibold">Accès réservé</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Seuls les administrateurs et le superutilisateur peuvent examiner les documents en attente.
                </p>
              </div>
            </section>
          ) : (
            <>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                    <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                    Circuit de validation
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Documents en attente</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Examinez chaque dépôt puis motivez votre décision. La justification est conservée dans l'historique.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit border-warning bg-card px-3 py-1 text-warning">
                  {total} {total > 1 ? "documents à traiter" : "document à traiter"}
                </Badge>
              </div>

              {pendingQuery.isLoading ? (
                <div className="space-y-3" aria-label="Chargement des documents en attente">
                  {[0, 1, 2].map((item) => (
                    <Skeleton key={item} className="h-24 w-full rounded-xl" />
                  ))}
                </div>
              ) : pendingQuery.isError ? (
                <section className="rounded-xl border border-destructive/30 bg-card p-8 text-center">
                  <h2 className="font-semibold text-destructive">Impossible de charger la file de validation</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Vérifiez la connexion au serveur puis réessayez.
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => void pendingQuery.refetch()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Réessayer
                  </Button>
                </section>
              ) : files.length === 0 ? (
                <section className="rounded-xl border bg-card p-10 text-center shadow-sm">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <ClipboardCheck className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 font-semibold">Aucun document en attente</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    La file de validation est à jour pour votre périmètre.
                  </p>
                </section>
              ) : (
                <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                  <div className="hidden lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead>Document</TableHead>
                          <TableHead>Département</TableHead>
                          <TableHead>Déposé par</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Décision</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {files.map((file) => (
                          <TableRow key={file.id}>
                            <TableCell>
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                                  <FileText className="h-5 w-5" aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                  <p className="max-w-xs truncate font-medium" title={file.originalName}>{file.originalName}</p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    Réf. {file.id} · {documentType(file)}{file.category ? ` · ${file.category}` : ""}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{file.department || "Sans département"}</TableCell>
                            <TableCell>{file.uploaderName || "Auteur inconnu"}</TableCell>
                            <TableCell>{formatDate(file.createdAt)}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => openReviewDialog(file, "reject")}>
                                  <Ban className="mr-2 h-4 w-4" />
                                  Refuser
                                </Button>
                                <Button size="sm" onClick={() => openReviewDialog(file, "approve")}>
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archiver
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="divide-y lg:hidden">
                    {files.map((file) => (
                      <article key={file.id} className="p-4 sm:p-5">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                            <FileText className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <h2 className="truncate font-medium" title={file.originalName}>{file.originalName}</h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Réf. {file.id} · {documentType(file)}{file.category ? ` · ${file.category}` : ""}
                            </p>
                          </div>
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                          <div>
                            <dt className="text-xs text-muted-foreground">Département</dt>
                            <dd className="mt-0.5 truncate font-medium">{file.department || "Sans département"}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Date de dépôt</dt>
                            <dd className="mt-0.5 font-medium">{formatDate(file.createdAt)}</dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="text-xs text-muted-foreground">Déposé par</dt>
                            <dd className="mt-0.5 truncate font-medium">{file.uploaderName || "Auteur inconnu"}</dd>
                          </div>
                        </dl>
                        {file.description && (
                          <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{file.description}</p>
                        )}
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <Button variant="outline" onClick={() => openReviewDialog(file, "reject")}>
                            <Ban className="mr-2 h-4 w-4" />
                            Refuser
                          </Button>
                          <Button onClick={() => openReviewDialog(file, "approve")}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archiver
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {totalPages > 1 && (
                <nav className="mt-5 flex items-center justify-between gap-4" aria-label="Pagination de la file de validation">
                  <p className="text-sm text-muted-foreground">
                    Page {pendingQuery.data?.page ?? page} sur {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pendingQuery.data?.hasPrevPage || pendingQuery.isFetching}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pendingQuery.data?.hasNextPage || pendingQuery.isFetching}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Suivant
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </nav>
              )}
            </>
          )}
        </main>
      </div>

      <Dialog open={Boolean(reviewTarget)} onOpenChange={(open) => { if (!open) closeReviewDialog(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {reviewTarget && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {reviewTarget.decision === "approve" ? "Archiver le document" : "Refuser le document"}
                </DialogTitle>
                <DialogDescription>
                  Cette décision sera enregistrée avec votre identité, la date et votre justification.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="truncate font-medium" title={reviewTarget.file.originalName}>{reviewTarget.file.originalName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Réf. {reviewTarget.file.id} · {reviewTarget.file.department || "Sans département"} · {reviewTarget.file.uploaderName || "Auteur inconnu"}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="review-justification">Justification de la décision</Label>
                  <span className="text-xs text-muted-foreground">{justification.length}/1000</span>
                </div>
                <Textarea
                  id="review-justification"
                  value={justification}
                  onChange={(event) => {
                    setJustification(event.target.value);
                    if (event.target.value.trim().length >= 3) setShowValidationError(false);
                  }}
                  placeholder={reviewTarget.decision === "approve"
                    ? "Précisez les éléments vérifiés..."
                    : "Expliquez le motif du refus..."}
                  minLength={3}
                  maxLength={1000}
                  rows={5}
                  required
                  aria-invalid={showValidationError}
                  aria-describedby="review-justification-help"
                  disabled={reviewMutation.isPending}
                />
                <p
                  id="review-justification-help"
                  className={showValidationError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}
                >
                  {showValidationError
                    ? "Saisissez une justification d'au moins 3 caractères."
                    : "Obligatoire · 3 à 1 000 caractères."}
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={closeReviewDialog} disabled={reviewMutation.isPending}>
                  Annuler
                </Button>
                <Button
                  variant={reviewTarget.decision === "reject" ? "destructive" : "default"}
                  onClick={submitReview}
                  disabled={reviewMutation.isPending}
                >
                  {reviewMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : reviewTarget.decision === "approve" ? (
                    <Archive className="mr-2 h-4 w-4" />
                  ) : (
                    <Ban className="mr-2 h-4 w-4" />
                  )}
                  {reviewMutation.isPending
                    ? "Enregistrement..."
                    : reviewTarget.decision === "approve"
                      ? "Confirmer l'archivage"
                      : "Confirmer le refus"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} />}
      {showUserModal && canAccessUserManagement() && (
        <UserManagementModal onClose={() => setShowUserModal(false)} />
      )}
    </div>
  );
}
