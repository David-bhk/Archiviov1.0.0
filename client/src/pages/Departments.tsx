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
  const [searchQuery, setSearchQuery] = useState("");
  const [newDepartment, setNewDepartment] = useState({
    name: "",
    description: "",
  });

  const { data: departments, isLoading } = useQuery<Department[]>({
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
      setNewDepartment({ name: "", description: "" });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer le département",
        variant: "destructive",
      });
    },
  });

  const handleCreateDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartment.name.trim()) return;
    createDepartmentMutation.mutate(newDepartment);
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
                        <span>0 utilisateurs</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FileText className="w-4 h-4" />
                        <span>0 fichiers</span>
                      </div>
                    </div>
                    {canManageDepartments() && (
                      <div className="mt-4 flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Modifier
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4 mr-1" />
                          Supprimer
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
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau département</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateDepartment} className="space-y-4">
              <div>
                <Label htmlFor="name">Nom du département *</Label>
                <Input
                  id="name"
                  value={newDepartment.name}
                  onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newDepartment.description}
                  onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createDepartmentMutation.isPending}>
                  {createDepartmentMutation.isPending ? "Création..." : "Créer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}