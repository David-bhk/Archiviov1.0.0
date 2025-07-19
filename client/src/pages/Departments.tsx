import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRole } from "../contexts/RoleContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building, Users, FileText, Plus, Edit, Trash2 } from "lucide-react";
import Sidebar from "../components/Layout/Sidebar";
import TopBar from "../components/Layout/TopBar";
import RightPanel from "../components/Layout/RightPanel";
import UploadModal from "../components/Files/UploadModal";
import UserManagementModal from "../components/Users/UserManagementModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { Department } from "../types";

export default function Departments() {
  const { user } = useAuth();
  const { canManageDepartments } = useRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    description: "",
  });

  const { data: departments, isLoading, isError, error } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const createDepartmentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/departments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({
        title: "Département créé",
        description: "Le département a été créé avec succès",
      });
      setShowAddModal(false);
      setEditingDepartment(null);
      setDepartmentForm({ name: "", description: "" });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer le département",
        variant: "destructive",
      });
    },
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: (data: { id: number; values: any }) =>
      apiRequest("PUT", `/api/departments/${data.id}`, data.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({
        title: "Département modifié",
        description: "Le département a été modifié avec succès",
      });
      setShowAddModal(false);
      setEditingDepartment(null);
      setDepartmentForm({ name: "", description: "" });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le département",
        variant: "destructive",
      });
    },
  });
  const deleteDepartmentMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/departments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({
        title: "Département supprimé",
        description: "Le département a été supprimé avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le département",
        variant: "destructive",
      });
    },
  });


  const handleDepartmentForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentForm.name.trim()) return;
    if (editingDepartment) {
      updateDepartmentMutation.mutate({ id: editingDepartment.id, values: departmentForm });
    } else {
      createDepartmentMutation.mutate(departmentForm);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar onUserManagement={() => setShowUserModal(true)} />
      
      <div className="flex-1 flex flex-col">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onUpload={() => setShowUploadModal(true)}
        />
        
        <div className="bg-white border-b border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Départements</h2>
              <p className="text-slate-600">Gérez les départements de votre organisation</p>
            </div>
            {canManageDepartments() && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau département
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-red-600 font-semibold">Erreur lors du chargement des départements.</p>
              <p className="text-slate-500 text-sm mt-2">{error instanceof Error ? error.message : "Veuillez réessayer plus tard."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departments?.map((department) => (
                <Card key={department.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Building className="w-5 h-5 text-primary" />
                      <span>{department.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-4">{department.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-slate-500">
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{department.userCount || 0} utilisateurs</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FileText className="w-4 h-4" />
                        <span>{department.fileCount || 0} fichiers</span>
                      </div>
                    </div>
                    {canManageDepartments() && (
                      <div className="mt-4 flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingDepartment(department);
                            setDepartmentForm({
                              name: department.name,
                              description: department.description || "",
                            });
                            setShowAddModal(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteDepartmentMutation.mutate(department.id)}
                          disabled={deleteDepartmentMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          {deleteDepartmentMutation.isPending ? "Suppression..." : "Supprimer"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <RightPanel />
      
      {showUploadModal && (
        <UploadModal onClose={() => setShowUploadModal(false)} />
      )}
      
      {showUserModal && (
        <UserManagementModal onClose={() => setShowUserModal(false)} />
      )}

      {showAddModal && (
        <Dialog open={showAddModal} onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) {
            setEditingDepartment(null);
            setDepartmentForm({ name: "", description: "" });
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDepartment ? "Modifier le département" : "Nouveau département"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleDepartmentForm} className="space-y-4">
              <div>
                <Label htmlFor="name">Nom du département *</Label>
                <Input
                  id="name"
                  value={departmentForm.name}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={departmentForm.description}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => {
                  setShowAddModal(false);
                  setEditingDepartment(null);
                  setDepartmentForm({ name: "", description: "" });
                }}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={createDepartmentMutation.isPending || updateDepartmentMutation.isPending}
                >
                  {editingDepartment
                    ? updateDepartmentMutation.isPending
                      ? "Modification..."
                      : "Modifier"
                    : createDepartmentMutation.isPending
                      ? "Création..."
                      : "Créer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}