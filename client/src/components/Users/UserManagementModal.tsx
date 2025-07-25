import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, X, UserPlus } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useRole } from "../../contexts/RoleContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";
import UserTable from "./UserTable";
import { User, Department } from "../../types";

interface UserManagementModalProps {
  onClose: () => void;
}

export default function UserManagementModal({ onClose }: UserManagementModalProps) {
  const { user } = useAuth();
  const { hasAccess } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "USER", // Utiliser majuscules pour correspondre à la DB
    department: "",
  });

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      const response = await res.json();
      return response.data || [];
    },
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/departments");
      const response = await res.json();
      return response.data || [];
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("POST", "/api/users", userData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Erreur inconnue');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Force a complete refetch of users data
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.refetchQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Utilisateur créé",
        description: "L'utilisateur a été créé avec succès",
      });
      setShowCreateForm(false);
      setNewUser({
        username: "",
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "USER",
        department: "",
      });
    },
    onError: (error: any) => {
      // Parse Zod validation errors if available
      let errorMessage = error.message || "Impossible de créer l'utilisateur";
      
      try {
        // Check if it's a Zod error with JSON format
        if (errorMessage.includes('"validation"') || errorMessage.includes('"code"')) {
          const jsonMatch = errorMessage.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const errorDetails = JSON.parse(jsonMatch[0]);
            if (Array.isArray(errorDetails) && errorDetails[0]) {
              const firstError = errorDetails[0];
              if (firstError.path && firstError.path[0] === 'email') {
                errorMessage = "Format d'email invalide. Veuillez utiliser un format valide (ex: utilisateur@domaine.com)";
              } else if (firstError.message) {
                errorMessage = firstError.message;
              }
            }
          }
        }
      } catch (parseError) {
        // Keep original error message if parsing fails
      }
      
      toast({
        title: "Erreur de création",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation détaillée
    const requiredFields = [
      { field: newUser.username, name: "Nom d'utilisateur" },
      { field: newUser.email, name: "Email" },
      { field: newUser.password, name: "Mot de passe" },
      { field: newUser.firstName, name: "Prénom" },
      { field: newUser.lastName, name: "Nom" },
      { field: newUser.department, name: "Département" }
    ];

    const missingFields = requiredFields.filter(({ field }) => !field || !field.trim());
    
    if (missingFields.length > 0) {
      toast({
        title: "Champs manquants",
        description: `Veuillez remplir: ${missingFields.map(f => f.name).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      toast({
        title: "Email invalide",
        description: "Veuillez entrer une adresse email valide (ex: utilisateur@domaine.com)",
        variant: "destructive",
      });
      return;
    }

    if (newUser.password.length < 6) {
      toast({
        title: "Mot de passe trop court",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive",
      });
      return;
    }

    console.log("Tentative de création d'utilisateur:", newUser);
    createUserMutation.mutate(newUser);
  };

  const filteredUsers = Array.isArray(users) ? users.filter((u) => {
    const matchesSearch = 
      u.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    
    // Admin can only see users from their department, SUPERUSER can see all
    const matchesDepartment = 
      user?.role?.toUpperCase() === "SUPERUSER" || 
      u.department === user?.department;
    
    return matchesSearch && matchesRole && matchesDepartment;
  }) : [];

  if (!hasAccess(["superuser", "admin"])) {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Gestion des utilisateurs</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-80 pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tous les rôles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="SUPERUSER">SuperUser</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="USER">Utilisateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Ajouter un utilisateur</span>
          </Button>
        </div>

        {showCreateForm && (
          <div className="bg-slate-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-4">Créer un nouvel utilisateur</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input
                    id="firstName"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input
                    id="lastName"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="username">Nom d'utilisateur *</Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="utilisateur@domaine.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Mot de passe *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rôle *</Label>
                  <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">Utilisateur</SelectItem>
                      <SelectItem value="ADMIN">Administrateur</SelectItem>
                      {user?.role === "SUPERUSER" && (
                        <SelectItem value="SUPERUSER">Super Utilisateur</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="department">Département *</Label>
                  <Select value={newUser.department} onValueChange={(value) => setNewUser({ ...newUser, department: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un département" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments?.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? "Création..." : "Créer l'utilisateur"}
                </Button>
              </div>
            </form>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <UserTable users={filteredUsers} />
        )}
      </DialogContent>
    </Dialog>
  );
}
