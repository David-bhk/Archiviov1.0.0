import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Users } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Role } from "@shared/schema";
import { useAuth } from "../../contexts/AuthContext";
import { useRole } from "../../contexts/RoleContext";
import { apiRequest } from "../../lib/queryClient";
import type { Department, User } from "../../types";
import UserTable from "./UserTable";

interface UserManagementModalProps {
  onClose: () => void;
}

interface UserListResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface NewUserForm {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  department: string;
}

const PAGE_SIZE = 10;

function createEmptyForm(currentUser: User): NewUserForm {
  return {
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "USER",
    department: currentUser.role === "ADMIN" ? currentUser.department ?? "" : "",
  };
}

function validateUserForm(form: NewUserForm) {
  if (!form.firstName.trim() || !form.lastName.trim() || !form.username.trim() || !form.department.trim()) {
    return "Renseignez tous les champs obligatoires.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return "Saisissez une adresse e-mail valide.";
  }
  if (form.password.length < 6) {
    return "Le mot de passe doit contenir au moins 6 caractères.";
  }
  return null;
}

export default function UserManagementModal({ onClose }: UserManagementModalProps) {
  const { user } = useAuth();
  const { hasAccess } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<NewUserForm>(() =>
    user ? createEmptyForm(user) : {
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      role: "USER",
      department: "",
    },
  );

  const canManageUsers = Boolean(user && hasAccess(["SUPERUSER", "ADMIN"]));

  const usersQuery = useQuery<UserListResponse>({
    queryKey: ["/api/users", "management", page],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/users?page=${page}&limit=${PAGE_SIZE}`);
      return response.json();
    },
    enabled: canManageUsers,
  });

  const departmentsQuery = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/departments");
      return response.json();
    },
    enabled: canManageUsers && user?.role === "SUPERUSER",
  });

  const closeCreateDialog = () => {
    setShowCreateDialog(false);
    setFormError(null);
    if (user) setNewUser(createEmptyForm(user));
  };

  const createUserMutation = useMutation({
    mutationFn: (values: NewUserForm) => apiRequest("POST", "/api/users", values),
    retry: false,
    onSuccess: async () => {
      setPage(1);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/users"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/departments"] }),
      ]);
      toast({
        title: "Utilisateur créé",
        description: "Le compte est maintenant disponible dans le périmètre autorisé.",
      });
      closeCreateDialog();
    },
    onError: (error: Error) => {
      const message = error.message.startsWith("403:")
        ? "Votre compte n'est pas autorisé à créer cet utilisateur."
        : "Les informations sont invalides ou déjà utilisées par un autre compte.";
      setFormError(message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/users/${id}`),
    retry: false,
    onSuccess: async () => {
      const shouldMoveBack = (usersQuery.data?.data.length ?? 0) === 1 && page > 1;
      if (shouldMoveBack) setPage((current) => Math.max(1, current - 1));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/users"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/departments"] }),
      ]);
      toast({
        title: "Utilisateur supprimé",
        description: "Le compte a été supprimé du système.",
      });
      setUserToDelete(null);
    },
    onError: () => {
      toast({
        title: "Suppression impossible",
        description: "Ce compte est protégé, hors de votre périmètre ou encore lié à des données.",
        variant: "destructive",
      });
    },
  });

  if (!user || !canManageUsers) return null;

  const users = usersQuery.data?.data ?? [];
  const totalPages = Math.max(usersQuery.data?.totalPages ?? 1, 1);
  const totalUsers = usersQuery.data?.total ?? 0;
  const isAdminWithoutDepartment = user.role === "ADMIN" && !user.department;
  const superuserHasDepartments = user.role !== "SUPERUSER" || (departmentsQuery.data?.length ?? 0) > 0;
  const canSubmit = !isAdminWithoutDepartment && superuserHasDepartments && !departmentsQuery.isError;
  const scopeDescription = user.role === "SUPERUSER"
    ? "Tous les comptes enregistrés dans l'organisation."
    : `Comptes rattachés au département ${user.department || "non attribué"}.`;

  const openCreateDialog = () => {
    setNewUser(createEmptyForm(user));
    setFormError(null);
    setShowCreateDialog(true);
  };

  const submitUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateUserForm(newUser);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    createUserMutation.mutate({
      ...newUser,
      username: newUser.username.trim(),
      email: newUser.email.trim(),
      firstName: newUser.firstName.trim(),
      lastName: newUser.lastName.trim(),
      department: newUser.department.trim(),
    });
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-6xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-5 pr-12 sm:px-6">
            <DialogTitle>Gestion des utilisateurs</DialogTitle>
            <DialogDescription>{scopeDescription}</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-4 border-b px-5 py-4 sm:px-6">
            <div>
              <p className="text-sm font-medium">
                {new Intl.NumberFormat("fr-FR").format(totalUsers)} {totalUsers > 1 ? "comptes" : "compte"}
              </p>
              <p className="text-xs text-muted-foreground">Les rôles et départements déterminent le périmètre visible.</p>
            </div>
            <Button onClick={openCreateDialog} disabled={isAdminWithoutDepartment}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Ajouter un utilisateur</span>
              <span className="sm:hidden">Ajouter</span>
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {isAdminWithoutDepartment ? (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-5">
                <h3 className="font-semibold text-warning">Département requis</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Votre compte administrateur doit être rattaché à un département avant de pouvoir créer des utilisateurs.
                </p>
              </div>
            ) : usersQuery.isLoading ? (
              <div aria-label="Chargement des utilisateurs" className="space-y-3">
                {[0, 1, 2, 3, 4].map((item) => (
                  <Skeleton key={item} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : usersQuery.isError ? (
              <div className="rounded-lg border border-destructive/30 bg-card px-6 py-10 text-center">
                <Users className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
                <h3 className="mt-4 font-semibold text-destructive">Impossible de charger les utilisateurs</h3>
                <p className="mt-2 text-sm text-muted-foreground">Vérifiez la connexion au serveur puis réessayez.</p>
                <Button variant="outline" className="mt-4" onClick={() => void usersQuery.refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Réessayer
                </Button>
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-card px-6 py-10 text-center">
                <Users className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <h3 className="mt-4 font-semibold">Aucun utilisateur dans ce périmètre</h3>
                <p className="mt-2 text-sm text-muted-foreground">Ajoutez un premier compte pour ce périmètre autorisé.</p>
              </div>
            ) : (
              <UserTable users={users} onRequestDelete={setUserToDelete} />
            )}
          </div>

          {totalPages > 1 && (
            <nav className="flex flex-col gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6" aria-label="Pagination des utilisateurs">
              <p className="text-center text-sm text-muted-foreground sm:text-left">
                Page {usersQuery.data?.page ?? page} sur {totalPages}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || usersQuery.isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || usersQuery.isFetching}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Suivant
                  <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </nav>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          if (!open) closeCreateDialog();
          else setShowCreateDialog(true);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer un utilisateur</DialogTitle>
            <DialogDescription>
              {user.role === "ADMIN"
                ? `Vous pouvez créer uniquement un utilisateur simple dans le département ${user.department}.`
                : "Attribuez le rôle et le département du nouveau compte."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submitUser} className="space-y-5">
            {formError && (
              <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-user-first-name">Prénom</Label>
                <Input
                  id="new-user-first-name"
                  value={newUser.firstName}
                  onChange={(event) => setNewUser((current) => ({ ...current, firstName: event.target.value }))}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-last-name">Nom</Label>
                <Input
                  id="new-user-last-name"
                  value={newUser.lastName}
                  onChange={(event) => setNewUser((current) => ({ ...current, lastName: event.target.value }))}
                  autoComplete="family-name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-username">Nom d'utilisateur</Label>
                <Input
                  id="new-user-username"
                  value={newUser.username}
                  onChange={(event) => setNewUser((current) => ({ ...current, username: event.target.value }))}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-email">Adresse e-mail</Label>
                <Input
                  id="new-user-email"
                  type="email"
                  value={newUser.email}
                  onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-password">Mot de passe temporaire</Label>
                <Input
                  id="new-user-password"
                  type="password"
                  value={newUser.password}
                  onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                <p className="text-xs text-muted-foreground">6 caractères minimum.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-role">Rôle</Label>
                {user.role === "ADMIN" ? (
                  <Input id="new-user-role" value="Utilisateur" disabled />
                ) : (
                  <Select
                    value={newUser.role}
                    onValueChange={(value: Role) => setNewUser((current) => ({ ...current, role: value }))}
                  >
                    <SelectTrigger id="new-user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">Utilisateur</SelectItem>
                      <SelectItem value="ADMIN">Administrateur</SelectItem>
                      <SelectItem value="SUPERUSER">Superutilisateur</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="new-user-department">Département</Label>
                {user.role === "ADMIN" ? (
                  <Input id="new-user-department" value={user.department ?? "Non attribué"} disabled />
                ) : departmentsQuery.isError ? (
                  <div className="rounded-md border border-destructive/30 p-3">
                    <p className="text-sm text-destructive">Impossible de charger les départements.</p>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void departmentsQuery.refetch()}>
                      Réessayer
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={newUser.department}
                    onValueChange={(value) => setNewUser((current) => ({ ...current, department: value }))}
                    disabled={departmentsQuery.isLoading || !superuserHasDepartments}
                  >
                    <SelectTrigger id="new-user-department">
                      <SelectValue placeholder={departmentsQuery.isLoading ? "Chargement..." : "Sélectionner un département"} />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentsQuery.data?.map((department) => (
                        <SelectItem key={department.id} value={department.name}>{department.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {user.role === "SUPERUSER" && !departmentsQuery.isLoading && !departmentsQuery.isError && !superuserHasDepartments && (
                  <p className="text-sm text-warning">Créez d'abord un département avant d'ajouter un utilisateur.</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreateDialog} disabled={createUserMutation.isPending}>
                Annuler
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending || !canSubmit}>
                {createUserMutation.isPending ? "Création..." : "Créer l'utilisateur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(userToDelete)} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement ce compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              {userToDelete
                ? `Le compte de ${userToDelete.firstName} ${userToDelete.lastName} sera supprimé. Cette version ne propose pas encore de désactivation ni de restauration.`
                : "Cette opération est irréversible."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUserMutation.isPending || !userToDelete}
              onClick={(event) => {
                event.preventDefault();
                if (userToDelete) deleteUserMutation.mutate(userToDelete.id);
              }}
            >
              {deleteUserMutation.isPending ? "Suppression..." : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
