import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRole } from "../contexts/RoleContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Cog, Shield, Database, Users, FileText, Globe } from "lucide-react";
import Sidebar from "../components/Layout/Sidebar";
import TopBar from "../components/Layout/TopBar";
import RightPanel from "../components/Layout/RightPanel";
import UploadModal from "../components/Files/UploadModal";
import UserManagementModal from "../components/Users/UserManagementModal";

export default function Configuration() {
  const { user } = useAuth();
  const { hasAccess } = useRole();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [settings, setSettings] = useState({
    maxFileSize: "10",
    allowedTypes: "pdf,docx,xlsx,png,jpg,jpeg",
    autoBackup: true,
    emailNotifications: true,
    maintenanceMode: false,
    maxUsersPerDepartment: "50",
    sessionTimeout: "30",
  });

  if (!user || !hasAccess(["superuser"])) {
    return (
      <div className="min-h-screen flex bg-slate-50">
        <Sidebar onUserManagement={() => setShowUserModal(true)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Accès refusé</h2>
            <p className="text-slate-600">
              Seuls les SuperUtilisateurs peuvent accéder à la configuration
            </p>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center space-x-2">
            <Cog className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-slate-800">Configuration</h2>
          </div>
          <p className="text-slate-600">Gérez les paramètres système</p>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>État du système</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">En ligne</div>
                    <p className="text-sm text-slate-600">Statut du serveur</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">SQLite</div>
                    <p className="text-sm text-slate-600">Base de données</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">v1.0.0</div>
                    <p className="text-sm text-slate-600">Version</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* File Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Paramètres des fichiers</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxFileSize">Taille maximale des fichiers (MB)</Label>
                    <Input
                      id="maxFileSize"
                      type="number"
                      value={settings.maxFileSize}
                      onChange={(e) => setSettings({ ...settings, maxFileSize: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="allowedTypes">Types de fichiers autorisés</Label>
                    <Input
                      id="allowedTypes"
                      value={settings.allowedTypes}
                      onChange={(e) => setSettings({ ...settings, allowedTypes: e.target.value })}
                      placeholder="pdf,docx,xlsx,png,jpg"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoBackup"
                    checked={settings.autoBackup}
                    onCheckedChange={(checked) => setSettings({ ...settings, autoBackup: checked })}
                  />
                  <Label htmlFor="autoBackup">Sauvegarde automatique</Label>
                </div>
              </CardContent>
            </Card>

            {/* User Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Gestion des utilisateurs</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxUsers">Utilisateurs max par département</Label>
                    <Input
                      id="maxUsers"
                      type="number"
                      value={settings.maxUsersPerDepartment}
                      onChange={(e) => setSettings({ ...settings, maxUsersPerDepartment: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sessionTimeout">Timeout de session (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="emailNotifications"
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                  />
                  <Label htmlFor="emailNotifications">Notifications par email</Label>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Sécurité</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="maintenanceMode">Mode maintenance</Label>
                    <p className="text-sm text-slate-600">Empêche les connexions utilisateur</p>
                  </div>
                  <Switch
                    id="maintenanceMode"
                    checked={settings.maintenanceMode}
                    onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
                  />
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-2">Rôles et permissions</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-red-50">SuperUser</Badge>
                      <span className="text-sm">Accès complet au système</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-blue-50">Admin</Badge>
                      <span className="text-sm">Gestion des utilisateurs et départements</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-slate-50">User</Badge>
                      <span className="text-sm">Accès limité à son département</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Network Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>Réseau</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Adresse du serveur</Label>
                  <Input value="localhost:5000" disabled />
                  <p className="text-sm text-slate-600 mt-1">
                    Accessible sur le réseau local
                  </p>
                </div>
                
                <div>
                  <Label>Base de données</Label>
                  <Input value="SQLite (dev.db)" disabled />
                  <p className="text-sm text-slate-600 mt-1">
                    Migration PostgreSQL disponible
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button size="lg">
                Enregistrer les modifications
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <RightPanel />
      
      {showUploadModal && (
        <UploadModal onClose={() => setShowUploadModal(false)} />
      )}
      
      {showUserModal && (
        <UserManagementModal onClose={() => setShowUserModal(false)} />
      )}
    </div>
  );
}