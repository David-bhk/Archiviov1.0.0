import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { useRole } from "../../contexts/RoleContext";
import type { User } from "../../types";

interface UserTableProps {
  users: User[];
  onRequestDelete: (user: User) => void;
}

const roleLabels: Record<User["role"], string> = {
  SUPERUSER: "Superutilisateur",
  ADMIN: "Administrateur",
  USER: "Utilisateur",
};

const roleBadgeClasses: Record<User["role"], string> = {
  SUPERUSER: "border-destructive/30 bg-destructive/10 text-destructive",
  ADMIN: "border-primary/30 bg-primary/10 text-primary",
  USER: "border-border bg-muted text-foreground",
};

function getInitials(user: User) {
  const initials = `${user.firstName?.slice(0, 1) ?? ""}${user.lastName?.slice(0, 1) ?? ""}`;
  return initials.toUpperCase() || user.username.slice(0, 2).toUpperCase();
}

function formatLastLogin(lastLogin: Date | string | null | undefined) {
  if (!lastLogin) return "Jamais";
  const date = new Date(lastLogin);
  if (Number.isNaN(date.getTime())) return "Date indisponible";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function UserTable({ users, onRequestDelete }: UserTableProps) {
  const { canDeleteUser } = useRole();

  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead>Utilisateur</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Département</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Dernière connexion</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((listedUser) => (
              <TableRow key={listedUser.id}>
                <TableCell>
                  <div className="flex min-w-52 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary" aria-hidden="true">
                      {getInitials(listedUser)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{listedUser.firstName} {listedUser.lastName}</p>
                      <p className="truncate text-xs text-muted-foreground">{listedUser.email}</p>
                      <p className="truncate text-xs text-muted-foreground">@{listedUser.username}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={roleBadgeClasses[listedUser.role]}>
                    {roleLabels[listedUser.role]}
                  </Badge>
                </TableCell>
                <TableCell>{listedUser.department || "Non attribué"}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={listedUser.isActive === false
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-success/30 bg-success/10 text-success"}
                  >
                    {listedUser.isActive === false ? "Inactif" : "Actif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatLastLogin(listedUser.lastLogin)}
                </TableCell>
                <TableCell className="text-right">
                  {canDeleteUser(listedUser) ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onRequestDelete(listedUser)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                      Supprimer
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Protégé</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {users.map((listedUser) => (
          <article key={listedUser.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary" aria-hidden="true">
                {getInitials(listedUser)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{listedUser.firstName} {listedUser.lastName}</p>
                <p className="truncate text-sm text-muted-foreground">{listedUser.email}</p>
                <p className="truncate text-xs text-muted-foreground">@{listedUser.username}</p>
              </div>
              <Badge
                variant="outline"
                className={listedUser.isActive === false
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-success/30 bg-success/10 text-success"}
              >
                {listedUser.isActive === false ? "Inactif" : "Actif"}
              </Badge>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Rôle</dt>
                <dd className="mt-1">
                  <Badge variant="outline" className={roleBadgeClasses[listedUser.role]}>
                    {roleLabels[listedUser.role]}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Département</dt>
                <dd className="mt-1 font-medium">{listedUser.department || "Non attribué"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Dernière connexion</dt>
                <dd className="mt-1">{formatLastLogin(listedUser.lastLogin)}</dd>
              </div>
            </dl>

            {canDeleteUser(listedUser) && (
              <Button
                variant="outline"
                className="mt-4 w-full text-destructive hover:text-destructive"
                onClick={() => onRequestDelete(listedUser)}
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Supprimer l'utilisateur
              </Button>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
