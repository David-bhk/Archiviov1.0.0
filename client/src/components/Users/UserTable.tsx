import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useRole } from "../../contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";
import { User } from "../../types";

interface UserTableProps {
  users: User[];
}

export default function UserTable({ users }: UserTableProps) {
  const { user: currentUser } = useAuth();
  const { hasAccess } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Utilisateur supprimé",
        description: "L'utilisateur a été supprimé avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'utilisateur",
        variant: "destructive",
      });
    },
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  const getRoleColor = (role: string) => {
    switch (role.toUpperCase()) {
      case "SUPERUSER":
        return "bg-red-100 text-red-800";
      case "ADMIN":
        return "bg-blue-100 text-blue-800";
      case "USER":
        return "bg-slate-100 text-slate-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role.toUpperCase()) {
      case "SUPERUSER":
        return "SuperUser";
      case "ADMIN":
        return "Admin";
      case "USER":
        return "Utilisateur";
      default:
        return role;
    }
  };

  const formatLastLogin = (lastLogin: Date | string | null | undefined) => {
    if (!lastLogin) return "Jamais";
    
    const date = new Date(lastLogin);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Maintenant";
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInHours < 48) return "Hier";
    return date.toLocaleDateString("fr-FR");
  };

  const canDeleteUser = (user: User) => {
    if (currentUser?.id === user.id) return false; // Can't delete self
    if (currentUser?.role === "superuser") return true;
    if (currentUser?.role === "admin" && user.role === "user") return true;
    return false;
  };

  const handleDelete = (user: User) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${user.firstName} ${user.lastName} ?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  return (
    <div className="bg-slate-50 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-100">
            <TableHead className="font-medium text-slate-700">Utilisateur</TableHead>
            <TableHead className="font-medium text-slate-700">Rôle</TableHead>
            <TableHead className="font-medium text-slate-700">Département</TableHead>
            <TableHead className="font-medium text-slate-700">Dernière connexion</TableHead>
            <TableHead className="font-medium text-slate-700">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="bg-white hover:bg-slate-50">
              <TableCell>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                    {getInitials(user.firstName, user.lastName)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getRoleColor(user.role)}>
                  {getRoleLabel(user.role)}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-slate-700">{user.department}</span>
              </TableCell>
              <TableCell>
                <span className="text-slate-600">{formatLastLogin(user.lastLogin)}</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  {canDeleteUser(user) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(user)}
                      disabled={deleteUserMutation.isPending}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
