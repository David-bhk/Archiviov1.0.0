import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  Database,
  FolderCog,
  History,
  LockKeyhole,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import UploadModal from "../components/Files/UploadModal";
import Sidebar from "../components/Layout/Sidebar";
import TopBar from "../components/Layout/TopBar";
import UserManagementModal from "../components/Users/UserManagementModal";
import { useAuth } from "../contexts/AuthContext";
import { useRole } from "../contexts/RoleContext";

const documentedConfiguration = [
  {
    title: "Identité et autorisations",
    description: "Authentification par jeton serveur et rôles canoniques SUPERUSER, ADMIN et USER.",
    Icon: ShieldCheck,
  },
  {
    title: "Métadonnées locales",
    description: "SQLite et Prisma assurent la persistance locale de cette première version.",
    Icon: Database,
  },
  {
    title: "Stockage documentaire",
    description: "Les fichiers sont conservés dans une racine locale configurée côté serveur.",
    Icon: FolderCog,
  },
  {
    title: "Hiérarchie en transition",
    description: "Les relations départementales sont migrées, mais les niveaux 1 à 4 ne sont pas encore activés.",
    Icon: LockKeyhole,
    pending: true,
  },
];

const unavailableSettings = [
  "Taille maximale et formats autorisés",
  "Sauvegardes automatiques",
  "Notifications par courriel",
  "Mode maintenance",
  "Durée des sessions",
  "Quotas par département",
];

export default function Configuration() {
  const { user } = useAuth();
  const { canAccessUserManagement } = useRole();
  const [, navigate] = useLocation();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const canConfigure = user?.role === "SUPERUSER";

  if (!user) return null;

  const openUserManagement = () => {
    if (canAccessUserManagement()) setShowUserModal(true);
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
          pageTitle="Configuration"
          breadcrumb="Supervision du système"
        />

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {!canConfigure ? (
            <section className="flex min-h-[55vh] items-center justify-center">
              <div className="max-w-lg rounded-lg border bg-card p-8 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <ShieldAlert className="h-6 w-6" aria-hidden="true" />
                </span>
                <h1 className="mt-4 text-xl font-semibold">Accès réservé</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Seul le superutilisateur peut consulter le centre de configuration du système.
                </p>
              </div>
            </section>
          ) : (
            <>
              <section className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-primary">Administration</p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Centre de configuration</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Consultez la configuration documentée et accédez aux fonctions d'administration réellement disponibles.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit rounded-sm border-warning bg-card px-3 py-1 text-warning">
                  Paramètres système en lecture seule
                </Badge>
              </section>

              <section className="rounded-lg border border-info/30 bg-card p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-info">
                    <Settings className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-semibold">Aucun contrat de modification n'est encore disponible</h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                      Archivio ne possède pas encore d'API pour enregistrer des paramètres généraux. Les anciens champs ont été retirés afin de ne pas laisser croire qu'une modification locale serait appliquée au serveur.
                    </p>
                  </div>
                </div>
              </section>

              <section className="mt-7">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Configuration documentée</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    État technique confirmé pour la version locale actuelle.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {documentedConfiguration.map(({ title, description, Icon, pending }) => (
                    <article key={title} className="rounded-lg border bg-card p-5 sm:p-6">
                      <div className="flex items-start gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted ${pending ? "text-warning" : "text-primary"}`}>
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{title}</h3>
                            <Badge
                              variant="outline"
                              className={`rounded-sm ${pending ? "border-warning text-warning" : "border-success text-success"}`}
                            >
                              {pending ? "En transition" : "Actif"}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
                <section className="rounded-lg border bg-card">
                  <div className="border-b px-5 py-4 sm:px-6">
                    <h2 className="text-lg font-semibold">Administration disponible</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ces actions utilisent les parcours déjà connectés au serveur.
                    </p>
                  </div>
                  <div className="divide-y">
                    <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div className="flex items-start gap-3">
                        <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                        <div>
                          <h3 className="font-medium">Utilisateurs et rôles</h3>
                          <p className="mt-1 text-sm text-muted-foreground">Créer et gérer les comptes selon les permissions serveur.</p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={openUserManagement}>Gérer les utilisateurs</Button>
                    </div>
                    <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div className="flex items-start gap-3">
                        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                        <div>
                          <h3 className="font-medium">Départements</h3>
                          <p className="mt-1 text-sm text-muted-foreground">Consulter la structure départementale actuelle.</p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => navigate("/departments")}>Voir les départements</Button>
                    </div>
                    <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div className="flex items-start gap-3">
                        <History className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                        <div>
                          <h3 className="font-medium">Journal d'activité</h3>
                          <p className="mt-1 text-sm text-muted-foreground">Consulter les événements documentaires enregistrés.</p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => navigate("/activity-history")}>Ouvrir l'historique</Button>
                    </div>
                  </div>
                </section>

                <aside className="rounded-lg border bg-card p-5 sm:p-6">
                  <h2 className="text-lg font-semibold">Réglages non configurables</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Ces règles exigent une décision produit et un contrat serveur avant d'être proposées dans l'interface.
                  </p>
                  <ul className="mt-5 space-y-3">
                    {unavailableSettings.map((setting) => (
                      <li key={setting} className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span>{setting}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 border-t pt-4 text-xs leading-5 text-muted-foreground">
                    Aucun bouton d'enregistrement n'est affiché tant que ces paramètres ne peuvent pas être persistés et appliqués par le serveur.
                  </p>
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
