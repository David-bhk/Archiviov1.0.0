import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest } from "../../lib/queryClient";
import type { DocumentStatus } from "@shared/schema";
import type { File, PaginatedResponse, Stats } from "../../types";

interface DashboardOverviewProps {
  searchQuery: string;
  onUpload: () => void;
}

const statusLabels: Record<DocumentStatus, string> = {
  pending: "En attente",
  archived: "Archivé",
  rejected: "Refusé",
};

const statusClasses: Record<DocumentStatus, string> = {
  pending: "border-warning bg-card text-warning",
  archived: "border-success bg-card text-success",
  rejected: "border-destructive bg-card text-destructive",
};

function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "0 octet";
  const units = ["octets", "Ko", "Mo", "Go", "To"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)} ${units[unitIndex]}`;
}

function formatDate(value?: Date): string {
  if (!value) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <Badge variant="outline" className={`rounded-sm font-medium ${statusClasses[status]}`}>
      {statusLabels[status]}
    </Badge>
  );
}

function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8" aria-label="Chargement du tableau de bord">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-32 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-lg" />
    </main>
  );
}

export default function DashboardOverview({ searchQuery, onUpload }: DashboardOverviewProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const canReview = user?.role === "ADMIN" || user?.role === "SUPERUSER";

  const statsQuery = useQuery<Stats>({
    queryKey: ["/api/stats", "dashboard"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/stats");
      return response.json();
    },
  });

  const recentDocumentsQuery = useQuery<PaginatedResponse<File>>({
    queryKey: ["/api/files", "dashboard-recent", searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", limit: "5" });
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const response = await apiRequest("GET", `/api/files?${params.toString()}`);
      return response.json();
    },
  });

  const pendingDocumentsQuery = useQuery<PaginatedResponse<File>>({
    queryKey: ["/api/files/pending", "dashboard-count", user?.role],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/files/pending?page=1&limit=1");
      return response.json();
    },
    enabled: canReview,
  });

  const hasError = statsQuery.isError || recentDocumentsQuery.isError || pendingDocumentsQuery.isError;
  const isLoading = statsQuery.isLoading || recentDocumentsQuery.isLoading || pendingDocumentsQuery.isLoading;

  if (isLoading) return <DashboardLoading />;

  if (hasError) {
    return (
      <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">
        <div className="rounded-lg border border-destructive bg-card p-6">
          <h1 className="text-xl font-semibold">Le tableau de bord n'a pas pu être chargé</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vérifiez la connexion au serveur, puis réessayez.
          </p>
          <Button
            variant="outline"
            className="mt-5 min-h-10"
            onClick={() => {
              void statsQuery.refetch();
              void recentDocumentsQuery.refetch();
              if (canReview) void pendingDocumentsQuery.refetch();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
        </div>
      </main>
    );
  }

  const stats = statsQuery.data;
  const recentDocuments = recentDocumentsQuery.data?.data ?? [];
  const overviewCards = [
    {
      label: "Documents accessibles",
      value: new Intl.NumberFormat("fr-FR").format(stats?.totalFiles ?? 0),
      detail: "Dans votre périmètre actuel",
    },
    canReview
      ? {
          label: "En attente de validation",
          value: new Intl.NumberFormat("fr-FR").format(pendingDocumentsQuery.data?.total ?? 0),
          detail: "Décisions à traiter",
          emphasis: "warning",
        }
      : {
          label: "Mes documents",
          value: new Intl.NumberFormat("fr-FR").format(stats?.userFiles ?? 0),
          detail: "Documents que vous avez ajoutés",
        },
    {
      label: "Espace documentaire",
      value: formatFileSize(stats?.totalSize ?? 0),
      detail: "Volume accessible",
    },
    {
      label: "Départements",
      value: new Intl.NumberFormat("fr-FR").format(stats?.totalDepartments ?? 0),
      detail: canReview
        ? `${new Intl.NumberFormat("fr-FR").format(stats?.activeUsers ?? 0)} utilisateurs actifs`
        : user?.department || "Sans département",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">
      <section className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Vue d'ensemble</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Aperçu du système</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Suivez les documents accessibles et les tâches qui relèvent de votre rôle.
          </p>
        </div>
        <Button onClick={onUpload} className="min-h-10 shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau document
        </Button>
      </section>

      <section aria-label="Indicateurs principaux" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <article key={card.label} className="relative overflow-hidden rounded-lg border bg-card p-5">
            <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
            <p className={`mt-3 text-3xl font-bold tracking-tight ${card.emphasis === "warning" ? "text-warning" : "text-card-foreground"}`}>
              {card.value}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{card.detail}</p>
            {card.emphasis === "warning" && <div className="absolute inset-x-0 bottom-0 h-1 bg-warning" />}
          </article>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              {searchQuery.trim() ? "Résultats récents" : "Documents récents"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery.trim()
                ? `Recherche pour « ${searchQuery.trim()} »`
                : "Les derniers documents visibles dans votre périmètre."}
            </p>
          </div>
          <Button variant="outline" className="min-h-10" onClick={() => navigate("/my-files")}>
            Voir tous les documents
          </Button>
        </div>

        {recentDocuments.length === 0 ? (
          <div className="rounded-lg border bg-card px-6 py-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">Aucun document trouvé</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {searchQuery.trim()
                ? "Modifiez votre recherche pour afficher d'autres documents."
                : "Ajoutez un premier document pour commencer son circuit de validation."}
            </p>
            {!searchQuery.trim() && (
              <Button onClick={onUpload} className="mt-5 min-h-10">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un document
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b bg-muted text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Référence</th>
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Département</th>
                    <th className="px-4 py-3">Auteur</th>
                    <th className="px-4 py-3">Date d'entrée</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentDocuments.map((document) => (
                    <tr key={document.id} className="transition-colors hover:bg-muted">
                      <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                        DOC-{String(document.id).padStart(4, "0")}
                      </td>
                      <td className="max-w-xs px-4 py-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                          <div className="min-w-0">
                            <p className="truncate font-medium" title={document.originalName}>{document.originalName}</p>
                            <p className="mt-0.5 text-xs uppercase text-muted-foreground">{document.fileType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4"><DocumentStatusBadge status={document.status} /></td>
                      <td className="px-4 py-4 text-muted-foreground">{document.department || "Non attribué"}</td>
                      <td className="px-4 py-4 text-muted-foreground">{document.uploaderName || "Auteur inconnu"}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">{formatDate(document.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y md:hidden">
              {recentDocuments.map((document) => (
                <article key={document.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-medium">{document.originalName}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        DOC-{String(document.id).padStart(4, "0")}
                      </p>
                    </div>
                    <DocumentStatusBadge status={document.status} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Département</dt>
                      <dd className="mt-1">{document.department || "Non attribué"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Date d'entrée</dt>
                      <dd className="mt-1">{formatDate(document.createdAt)}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
