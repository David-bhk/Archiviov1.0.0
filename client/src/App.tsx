import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { RoleProvider } from "./contexts/RoleContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MyFiles from "./pages/MyFiles";
import Departments from "./pages/Departments";
import Statistics from "./pages/Statistics";
import Search from "./pages/Search";
import Configuration from "./pages/Configuration";
import NotFound from "@/pages/not-found";
import PendingFiles from "./pages/PendingFiles";
import ActivityHistory from "./pages/ActivityHistory";
import { Landmark, Loader2 } from "lucide-react";

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center bg-background px-4"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-accent text-primary">
            <Landmark className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="mt-5 flex items-center gap-2 text-sm font-medium text-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
            Vérification de la session…
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Archivio prépare votre espace documentaire.</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <RoleProvider>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/my-files" component={MyFiles} />
        <Route path="/departments" component={Departments} />
        <Route path="/statistics" component={Statistics} />
        <Route path="/search" component={Search} />
        <Route path="/configuration" component={Configuration} />
        <Route path="/pending-files" component={PendingFiles} />
        <Route path="/activity-history" component={ActivityHistory} />
        <Route component={NotFound} />
      </Switch>
    </RoleProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
