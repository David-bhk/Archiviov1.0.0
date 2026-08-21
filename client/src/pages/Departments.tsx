import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Edit3,
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
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
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import UploadModal from "../components/Files/UploadModal";
import Sidebar from "../components/Layout/Sidebar";
import TopBar from "../components/Layout/TopBar";
import UserManagementModal from "../components/Users/UserManagementModal";
import { useAuth } from "../contexts/AuthContext";
import { useRole } from "../contexts/RoleContext";
import { apiRequest } from "../lib/queryClient";
import type { Department } from "../types";

interface DepartmentForm {
  name: string;
  description: string;
}

const emptyDepartmentForm: DepartmentForm = {
  name: "",
  description: "",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default function Departments() {
  const { user } = useAuth();
  const { canAccessUserManagement, canManageDepartments } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [departmentForm, setDepartmentForm] = useState<DepartmentForm>(emptyDepartmentForm);

  const departmentsQuery = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    enabled: Boolean(user),
  });

  const closeDepartmentDialog = () => {
    setShowDepartmentDialog(false);
    setEditingDepartment(null);
    setDepartmentForm(emptyDepartmentForm);
  };

  const createDepartmentMutation = useMutation({
    mutationFn: (values: DepartmentForm) => apiRequest("POST", "/api/departments", values),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({
        title: "Département créé",
        description: "Le département est maintenant disponible dans le référentiel.",
      });
      closeDepartmentDialog();
    },
    onError: () => {
      toast({
        title: "Création impossible",
        description: "Vérifiez le nom du département puis réessayez.",
        variant: "destructive",
      });
    },
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: DepartmentForm }) =>
      apiRequest("PUT", `/api/departments/${id}`, values),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({
        title: "Département modifié",
        description: "Les informations du département ont été mises à jour.",
      });
      closeDepartmentDialog();
    },
    onError: () => {
      toast({
        title: "Modification impossible",
        description: "Vérifiez les informations puis réessayez.",
        variant: "destructive",
      });
    },
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/departments/${id}`),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({
        title: "Département supprimé",
        description: "Le département a été retiré du référentiel.",
      });
      setDepartmentToDelete(null);
    },
    onError: () => {
      toast({
        title: "Suppression impossible",
        description: "Ce département est peut-être encore lié à des utilisateurs ou à des documents.",
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  const canManage = canManageDepartments();
  const departments = departmentsQuery.data ?? [];
  const totalUsers = departments.reduce((sum, department) => sum + (department.userCount ?? 0), 0);
  const totalFiles = departments.reduce((sum, department) => sum + (department.fileCount ?? 0), 0);
  const isSaving = createDepartmentMutation.isPending || updateDepartmentMutation.isPending;

  const openCreateDialog = () => {
    setEditingDepartment(null);
    setDepartmentForm(emptyDepartmentForm);
    setShowDepartmentDialog(true);
  };

  const openEditDialog = (department: Department) => {
    setEditingDepartment(department);
    setDepartmentForm({
      name: department.name,
      description: department.description ?? "",
    });
    setShowDepartmentDialog(true);
  };

  const openUserManagement = () => {
    if (canAccessUserManagement()) setShowUserModal(true);
  };

  const submitDepartment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = {
      name: departmentForm.name.trim(),
      description: departmentForm.description.trim(),
    };
    if (!values.name) return;

    if (editingDepartment) {
      updateDepartmentMutation.mutate({ id: editingDepartment.id, values });
      return;
    }
    createDepartmentMutation.mutate(values);
  };

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
          pageTitle="Départements"
          breadcrumb="Structure de l'organisation"
        />

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <section className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Référentiel institutionnel</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Départements</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Consultez la structure de l'organisation et les volumes associés à chaque département.
              </p>
            </div>
            {canManage && (
              <Button onClick={openCreateDialog} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Nouveau département
              </Button>
            )}
          </section>

          {departmentsQuery.isLoading ? (
            <div aria-label="Chargement des départements" className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((item) => (
                  <Skeleton key={item} className="h-28 rounded-lg" />
                ))}
              </div>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((item) => (
                  <Skeleton key={item} className="h-60 rounded-lg" />
                ))}
              </div>
            </div>
          ) : departmentsQuery.isError ? (
            <section className="rounded-lg border border-destructive/30 bg-card p-8 text-center">
              <Building2 className="mx-auto h-9 w-9 text-destructive" aria-hidden="true" />
              <h2 className="mt-4 font-semibold text-destructive">Impossible de charger les départements</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Vérifiez la connexion au serveur puis réessayez.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => void departmentsQuery.refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Réessayer
              </Button>
            </section>
          ) : (
            <>
              <section aria-label="Synthèse des départements" className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-lg border bg-card p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-primary">
                      <Building2 className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm text-muted-foreground">Départements</p>
                      <p className="text-2xl font-bold">{formatNumber(departments.length)}</p>
                    </div>
                  </div>
                </article>
                <article className="rounded-lg border bg-card p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-foreground">
                      <Users className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm text-muted-foreground">Utilisateurs rattachés</p>
                      <p className="text-2xl font-bold">{formatNumber(totalUsers)}</p>
                    </div>
                  </div>
                </article>
                <article className="rounded-lg border bg-card p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-foreground">
                      <FileText className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm text-muted-foreground">Documents rattachés</p>
                      <p className="text-2xl font-bold">{formatNumber(totalFiles)}</p>
                    </div>
                  </div>
                </article>
              </section>

              <section className="mt-7" aria-labelledby="departments-list-title">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 id="departments-list-title" className="text-lg font-semibold">Structure enregistrée</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Les rattachements affichés proviennent des données actuellement enregistrées.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void departmentsQuery.refetch()}
                    disabled={departmentsQuery.isFetching}
                    aria-label="Actualiser les départements"
                  >
                    <RefreshCw className={`h-4 w-4 ${departmentsQuery.isFetching ? "animate-spin" : ""}`} />
                  </Button>
                </div>

                {departments.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
                    <Building2 className="mx-auto h-9 w-9 text-muted-foreground" aria-hidden="true" />
                    <h3 className="mt-4 font-semibold">Aucun département enregistré</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                      La structure apparaîtra ici dès qu'un département aura été créé.
                    </p>
                    {canManage && (
                      <Button className="mt-5" onClick={openCreateDialog}>
                        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                        Créer le premier département
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {departments.map((department) => (
                      <article key={department.id} className="flex min-h-56 flex-col rounded-lg border bg-card p-5">
                        <div className="flex items-start justify-between gap-4">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
                            <Building2 className="h-5 w-5" aria-hidden="true" />
                          </span>
                          {canManage && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(department)}
                                aria-label={`Modifier le département ${department.name}`}
                              >
                                <Edit3 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDepartmentToDelete(department)}
                                aria-label={`Supprimer le département ${department.name}`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex-1">
                          <h3 className="text-lg font-semibold leading-6">{department.name}</h3>
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                            {department.description || "Aucune description renseignée pour ce département."}
                          </p>
                        </div>

                        <dl className="mt-5 grid grid-cols-2 gap-3 border-t pt-4">
                          <div>
                            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Users className="h-3.5 w-3.5" aria-hidden="true" />
                              Utilisateurs
                            </dt>
                            <dd className="mt-1 text-sm font-semibold">{formatNumber(department.userCount ?? 0)}</dd>
                          </div>
                          <div>
                            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              Documents
                            </dt>
                            <dd className="mt-1 text-sm font-semibold">{formatNumber(department.fileCount ?? 0)}</dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} />}
      {showUserModal && canAccessUserManagement() && (
        <UserManagementModal onClose={() => setShowUserModal(false)} />
      )}

      <Dialog
        open={showDepartmentDialog}
        onOpenChange={(open) => {
          if (!open) closeDepartmentDialog();
          else setShowDepartmentDialog(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDepartment ? "Modifier le département" : "Nouveau département"}</DialogTitle>
            <DialogDescription>
              {editingDepartment
                ? "Mettez à jour le nom ou la description du département."
                : "Ajoutez une unité au référentiel institutionnel."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitDepartment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="department-name">Nom du département</Label>
              <Input
                id="department-name"
                value={departmentForm.name}
                onChange={(event) => setDepartmentForm((current) => ({ ...current, name: event.target.value }))}
                maxLength={120}
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department-description">Description</Label>
              <Textarea
                id="department-description"
                value={departmentForm.description}
                onChange={(event) => setDepartmentForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Mission ou périmètre du département"
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">Facultatif · 500 caractères maximum</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDepartmentDialog} disabled={isSaving}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSaving || !departmentForm.name.trim()}>
                {isSaving ? "Enregistrement..." : editingDepartment ? "Enregistrer" : "Créer le département"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(departmentToDelete)} onOpenChange={(open) => !open && setDepartmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce département ?</AlertDialogTitle>
            <AlertDialogDescription>
              {departmentToDelete
                ? `Le département « ${departmentToDelete.name} » sera supprimé. L'opération échouera s'il est encore lié à des utilisateurs ou à des documents.`
                : "Cette opération est irréversible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDepartmentMutation.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteDepartmentMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (departmentToDelete) deleteDepartmentMutation.mutate(departmentToDelete.id);
              }}
            >
              {deleteDepartmentMutation.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
