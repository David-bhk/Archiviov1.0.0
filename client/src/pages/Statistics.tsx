import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, FileText, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import UploadModal from "../components/Files/UploadModal";
import Sidebar from "../components/Layout/Sidebar";
import TopBar from "../components/Layout/TopBar";
import UserManagementModal from "../components/Users/UserManagementModal";
import { useAuth } from "../contexts/AuthContext";
import { useRole } from "../contexts/RoleContext";
import { apiRequest } from "../lib/queryClient";
import type { Stats } from "../types";

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatFileSize(bytes: number) {
  if (bytes <= 0) return "0 octet";
  const units = ["octets", "Ko", "Mo", "Go", "To"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)} ${units[unitIndex]}`;
}

function formatFileType(type: string) {
  const normalized = type.replace(/^\./, "").trim();
  return normalized ? normalized.toUpperCase() : "AUTRE";
}

export default function Statistics() {
  const { user } = useAuth();
  const { canAccessUserManagement } = useRole();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const statsQuery = useQuery<Stats>({
    queryKey: ["/api/stats", "statistics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/stats");
      return response.json();
    },
    enabled: Boolean(user),
  });

  if (!user) return null;

  const openUserManagement = () => {
    if (canAccessUserManagement()) setShowUserModal(true);
  };

  const stats = statsQuery.data;
  const totalFiles = stats?.totalFiles ?? 0;
  const totalSize = stats?.totalSize ?? 0;
  const activeUsers = stats?.activeUsers ?? 0;
  const totalUsers = stats?.totalUsers ?? 0;
  const userFiles = stats?.userFiles ?? 0;
  const activeUserRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const personalFileRate = totalFiles > 0 ? Math.min(100, Math.round((userFiles / totalFiles) * 100)) : 0;
  const averageFileSize = totalFiles > 0 ? totalSize / totalFiles : 0;
  const fileTypes = Object.entries(stats?.fileTypes ?? {})
    .sort(([, firstCount], [, secondCount]) => secondCount - firstCount);
  const typedFileTotal = fileTypes.reduce((sum, [, count]) => sum + count, 0);
  const scopeLabel = user.role === "SUPERUSER"
    ? "Vue globale du système"
    : user.department || "Votre périmètre documentaire";

  const overviewCards = [
    {
      label: "Documents accessibles",
      value: formatNumber(totalFiles),
      detail: "Selon votre rôle et votre département",
    },
    {
      label: "Volume accessible",
      value: formatFileSize(totalSize),
      detail: `Moyenne : ${formatFileSize(averageFileSize)} par document`,
    },
    {
      label: "Mes documents",
      value: formatNumber(userFiles),
      detail: `${personalFileRate} % des documents accessibles`,
    },
    {
      label: "Départements",
      value: formatNumber(stats?.totalDepartments ?? 0),
      detail: "Départements enregistrés dans Archivio",
    },
  ];

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
          pageTitle="Statistiques"
          breadcrumb={scopeLabel}
        />

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <section className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Analyse documentaire</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Indicateurs du système</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Mesurez le volume documentaire et sa répartition dans le périmètre autorisé par votre compte.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => void statsQuery.refetch()}
              disabled={statsQuery.isFetching}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${statsQuery.isFetching ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </section>

          {statsQuery.isLoading ? (
            <div aria-label="Chargement des statistiques" className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-32 rounded-lg" />
                ))}
              </div>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                <Skeleton className="h-80 rounded-lg" />
                <Skeleton className="h-80 rounded-lg" />
              </div>
            </div>
          ) : statsQuery.isError ? (
            <section className="rounded-lg border border-destructive/30 bg-card p-8 text-center">
              <h2 className="font-semibold text-destructive">Impossible de charger les statistiques</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Vérifiez la connexion au serveur puis réessayez.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => void statsQuery.refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Réessayer
              </Button>
            </section>
          ) : (
            <>
              <section aria-label="Indicateurs principaux" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {overviewCards.map((card) => (
                  <article key={card.label} className="rounded-lg border bg-card p-5">
                    <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-card-foreground">{card.value}</p>
                    <p className="mt-2 text-sm leading-5 text-muted-foreground">{card.detail}</p>
                  </article>
                ))}
              </section>

              <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                <section className="rounded-lg border bg-card">
                  <div className="border-b px-5 py-4 sm:px-6">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
                      <h2 className="text-lg font-semibold">Répartition par type de fichier</h2>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Distribution des documents accessibles selon leur format enregistré.
                    </p>
                  </div>

                  {fileTypes.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <FileText className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                      <h3 className="mt-4 font-semibold">Aucun type de fichier disponible</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        La répartition apparaîtra lorsqu'un document sera accessible dans ce périmètre.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {fileTypes.map(([type, count]) => {
                        const percentage = typedFileTotal > 0 ? Math.round((count / typedFileTotal) * 100) : 0;
                        return (
                          <div key={type} className="px-5 py-4 sm:px-6">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex min-w-0 items-center gap-3">
                                <Badge variant="outline" className="min-w-14 justify-center rounded-sm font-mono">
                                  {formatFileType(type)}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {formatNumber(count)} {count > 1 ? "documents" : "document"}
                                </span>
                              </div>
                              <span className="shrink-0 text-sm font-semibold">{percentage} %</span>
                            </div>
                            <Progress
                              value={percentage}
                              className="mt-3 h-2"
                              aria-label={`${formatFileType(type)} : ${percentage} % des documents`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <aside className="space-y-6">
                  <section className="rounded-lg border bg-card p-5 sm:p-6">
                    <h2 className="text-lg font-semibold">Comptes utilisateurs</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      État des comptes enregistrés dans le système.
                    </p>
                    <div className="mt-6 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-3xl font-bold tracking-tight">{formatNumber(activeUsers)}</p>
                        <p className="mt-1 text-sm text-muted-foreground">utilisateurs actifs</p>
                      </div>
                      <Badge variant="outline" className="rounded-sm">
                        {activeUserRate} % actifs
                      </Badge>
                    </div>
                    <Progress
                      value={activeUserRate}
                      className="mt-4 h-2"
                      aria-label={`${activeUserRate} % des utilisateurs sont actifs`}
                    />
                    <p className="mt-3 text-sm text-muted-foreground">
                      {formatNumber(totalUsers)} {totalUsers > 1 ? "comptes enregistrés" : "compte enregistré"}
                    </p>
                  </section>

                  <section className="rounded-lg border bg-card p-5 sm:p-6">
                    <h2 className="text-lg font-semibold">Lecture du volume</h2>
                    <dl className="mt-5 space-y-4 text-sm">
                      <div className="flex items-center justify-between gap-4 border-b pb-4">
                        <dt className="text-muted-foreground">Volume total accessible</dt>
                        <dd className="font-semibold">{formatFileSize(totalSize)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-b pb-4">
                        <dt className="text-muted-foreground">Taille moyenne</dt>
                        <dd className="font-semibold">{formatFileSize(averageFileSize)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-muted-foreground">Formats représentés</dt>
                        <dd className="font-semibold">{formatNumber(fileTypes.length)}</dd>
                      </div>
                    </dl>
                    <p className="mt-5 text-xs leading-5 text-muted-foreground">
                      Aucun quota maximal n'est configuré ; seul le volume réellement enregistré est présenté.
                    </p>
                  </section>
                </aside>
              </div>
            </>
          )}
        </main>
      </div>

      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} />}
      {showUserModal && canAccessUserManagement() && (
        <UserManagementModal onClose={() => setShowUserModal(false)} />
      )}
    </div>
  );
}
