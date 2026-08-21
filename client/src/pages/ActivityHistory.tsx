import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Ban,
  ClipboardList,
  FilePlus2,
  RefreshCw,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import type { ActivitySummary } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import UploadModal from "../components/Files/UploadModal";
import Sidebar from "../components/Layout/Sidebar";
import TopBar from "../components/Layout/TopBar";
import UserManagementModal from "../components/Users/UserManagementModal";
import { useAuth } from "../contexts/AuthContext";
import { useRole } from "../contexts/RoleContext";
import { apiRequest } from "../lib/queryClient";

interface ActivityPresentation {
  label: string;
  Icon: LucideIcon;
  badgeClassName: string;
  iconClassName: string;
}

const activityPresentations: Record<string, ActivityPresentation> = {
  document_uploaded: {
    label: "Document téléversé",
    Icon: FilePlus2,
    badgeClassName: "border-info bg-card text-info",
    iconClassName: "bg-muted text-info",
  },
  upload: {
    label: "Document téléversé",
    Icon: FilePlus2,
    badgeClassName: "border-info bg-card text-info",
    iconClassName: "bg-muted text-info",
  },
  document_archived: {
    label: "Document archivé",
    Icon: Archive,
    badgeClassName: "border-success bg-card text-success",
    iconClassName: "bg-muted text-success",
  },
  document_rejected: {
    label: "Document refusé",
    Icon: Ban,
    badgeClassName: "border-destructive bg-card text-destructive",
    iconClassName: "bg-muted text-destructive",
  },
  user_create: {
    label: "Utilisateur créé",
    Icon: UserPlus,
    badgeClassName: "border-primary bg-card text-primary",
    iconClassName: "bg-muted text-primary",
  },
};

const fallbackPresentation: ActivityPresentation = {
  label: "Activité enregistrée",
  Icon: ClipboardList,
  badgeClassName: "border-border bg-card text-foreground",
  iconClassName: "bg-muted text-muted-foreground",
};

function formatDate(value: Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function actorName(activity: ActivitySummary) {
  if (!activity.user) return "Acteur inconnu";
  const name = `${activity.user.firstName} ${activity.user.lastName}`.trim();
  return name || "Acteur inconnu";
}

function departmentName(activity: ActivitySummary) {
  return activity.file?.department || activity.user?.department || "Non attribué";
}

export default function ActivityHistory() {
  const { user } = useAuth();
  const { canAccessUserManagement } = useRole();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const canViewHistory = user?.role === "ADMIN" || user?.role === "SUPERUSER";

  const activitiesQuery = useQuery<ActivitySummary[]>({
    queryKey: ["/api/activities", "history", 50],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/activities?limit=50");
      return response.json();
    },
    enabled: canViewHistory,
  });

  if (!user) return null;

  const openUserManagement = () => {
    if (canAccessUserManagement()) setShowUserModal(true);
  };

  const activities = activitiesQuery.data ?? [];
  const roleScope = user.role === "SUPERUSER"
    ? "Supervision globale"
    : "Journal accessible à votre rôle";

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
          pageTitle="Historique des activités"
          breadcrumb={roleScope}
        />

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {!canViewHistory ? (
            <section className="flex min-h-[55vh] items-center justify-center">
              <div className="max-w-lg rounded-lg border bg-card p-8 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <ShieldAlert className="h-6 w-6" aria-hidden="true" />
                </span>
                <h1 className="mt-4 text-xl font-semibold">Accès réservé</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Seuls les administrateurs et le superutilisateur peuvent consulter l'historique des activités.
                </p>
              </div>
            </section>
          ) : (
            <>
              <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-primary">Traçabilité</p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Journal des activités</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Consultez les 50 événements les plus récents enregistrés par le système.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-sm px-3 py-1">
                    {activities.length} {activities.length > 1 ? "événements affichés" : "événement affiché"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void activitiesQuery.refetch()}
                    disabled={activitiesQuery.isFetching}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${activitiesQuery.isFetching ? "animate-spin" : ""}`} />
                    Actualiser
                  </Button>
                </div>
              </section>

              {activitiesQuery.isLoading ? (
                <div className="space-y-3" aria-label="Chargement de l'historique">
                  {[0, 1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : activitiesQuery.isError ? (
                <section className="rounded-lg border border-destructive/30 bg-card p-8 text-center">
                  <h2 className="font-semibold text-destructive">Impossible de charger l'historique</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Vérifiez la connexion au serveur puis réessayez.
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => void activitiesQuery.refetch()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Réessayer
                  </Button>
                </section>
              ) : activities.length === 0 ? (
                <section className="rounded-lg border bg-card p-10 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <ClipboardList className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 font-semibold">Aucune activité enregistrée</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Les prochains téléversements et décisions documentaires apparaîtront ici.
                  </p>
                </section>
              ) : (
                <section className="overflow-hidden rounded-lg border bg-card">
                  <div className="hidden lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableHead>Événement</TableHead>
                          <TableHead>Acteur</TableHead>
                          <TableHead>Document</TableHead>
                          <TableHead>Département</TableHead>
                          <TableHead>Date et heure</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activities.map((activity) => {
                          const presentation = activityPresentations[activity.type] ?? fallbackPresentation;
                          const Icon = presentation.Icon;
                          return (
                            <TableRow key={activity.id}>
                              <TableCell className="max-w-sm">
                                <div className="flex items-start gap-3">
                                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${presentation.iconClassName}`}>
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                  </span>
                                  <div className="min-w-0">
                                    <Badge variant="outline" className={`rounded-sm ${presentation.badgeClassName}`}>
                                      {presentation.label}
                                    </Badge>
                                    {activity.description && (
                                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground" title={activity.description}>
                                        {activity.description}
                                      </p>
                                    )}
                                    {!activityPresentations[activity.type] && (
                                      <p className="mt-1 font-mono text-xs text-muted-foreground">{activity.type}</p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="font-medium">{actorName(activity)}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">{activity.user?.role || "Rôle inconnu"}</p>
                              </TableCell>
                              <TableCell>
                                {activity.file ? (
                                  <div>
                                    <p className="max-w-xs truncate font-medium" title={activity.file.originalName}>
                                      {activity.file.originalName}
                                    </p>
                                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                      DOC-{String(activity.file.id).padStart(4, "0")}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Non associé</span>
                                )}
                              </TableCell>
                              <TableCell>{departmentName(activity)}</TableCell>
                              <TableCell className="whitespace-nowrap text-muted-foreground">
                                {formatDate(activity.createdAt)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="divide-y lg:hidden">
                    {activities.map((activity) => {
                      const presentation = activityPresentations[activity.type] ?? fallbackPresentation;
                      const Icon = presentation.Icon;
                      return (
                        <article key={activity.id} className="p-4 sm:p-5">
                          <div className="flex items-start gap-3">
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${presentation.iconClassName}`}>
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <Badge variant="outline" className={`rounded-sm ${presentation.badgeClassName}`}>
                                {presentation.label}
                              </Badge>
                              <p className="mt-2 text-sm font-medium">{actorName(activity)}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(activity.createdAt)}</p>
                            </div>
                          </div>
                          {activity.file && (
                            <div className="mt-4 rounded-md border bg-muted/30 p-3">
                              <p className="truncate text-sm font-medium" title={activity.file.originalName}>
                                {activity.file.originalName}
                              </p>
                              <p className="mt-1 font-mono text-xs text-muted-foreground">
                                DOC-{String(activity.file.id).padStart(4, "0")} · {departmentName(activity)}
                              </p>
                            </div>
                          )}
                          {activity.description && (
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">{activity.description}</p>
                          )}
                          {!activityPresentations[activity.type] && (
                            <p className="mt-2 font-mono text-xs text-muted-foreground">Type : {activity.type}</p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}
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
