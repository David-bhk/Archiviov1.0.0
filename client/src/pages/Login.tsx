import { useState, type FormEvent } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Landmark,
  Loader2,
} from "lucide-react";
import { LoginError, useAuth } from "../contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface FieldErrors {
  username?: string;
  password?: string;
}

const loginErrorMessages: Record<LoginError["reason"], string> = {
  invalidCredentials: "Le nom d’utilisateur ou le mot de passe est incorrect.",
  network: "Le serveur Archivio est inaccessible. Vérifiez votre connexion au réseau local puis réessayez.",
  unexpected: "La connexion n’a pas pu aboutir. Réessayez dans quelques instants.",
};

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const updateCredential = (field: "username" | "password", value: string) => {
    setCredentials((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setSubmissionError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    if (!credentials.username) nextErrors.username = "Saisissez votre nom d’utilisateur.";
    if (!credentials.password) nextErrors.password = "Saisissez votre mot de passe.";

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setSubmissionError("Renseignez les deux champs pour continuer.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      await login(credentials.username, credentials.password);
      toast({
        title: "Connexion réussie",
        description: "Bienvenue dans Archivio.",
      });
    } catch (error) {
      const message = error instanceof LoginError
        ? loginErrorMessages[error.reason]
        : loginErrorMessages.unexpected;
      setSubmissionError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(26rem,0.95fr)]">
      <section
        className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-primary px-10 py-9 text-primary-foreground lg:flex xl:px-16 xl:py-12"
        aria-label="Présentation d’Archivio"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md border border-primary-foreground/20 bg-primary-foreground/10">
            <Landmark className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-xl font-bold tracking-tight">Archivio</span>
            <span className="block text-sm text-primary-foreground/75">Gestion documentaire</span>
          </span>
        </div>

        <div className="max-w-xl py-12">
          <p className="mb-4 text-sm font-semibold tracking-wide text-primary-foreground/75">
            ARCHIVAGE INSTITUTIONNEL
          </p>
          <h1 className="max-w-lg text-4xl font-bold leading-tight tracking-tight xl:text-5xl xl:leading-tight">
            Vos documents sensibles, organisés avec précision.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-primary-foreground/80">
            Centralisez, retrouvez et suivez les archives de votre organisation depuis un espace local conçu pour la clarté et la traçabilité.
          </p>

          <div className="mt-10 grid max-w-lg grid-cols-3 border-y border-primary-foreground/20 py-5">
            <div className="pr-4">
              <p className="text-sm font-semibold">Accès contrôlé</p>
              <p className="mt-1 text-sm leading-5 text-primary-foreground/70">Selon votre rôle</p>
            </div>
            <div className="border-x border-primary-foreground/20 px-4">
              <p className="text-sm font-semibold">Suivi clair</p>
              <p className="mt-1 text-sm leading-5 text-primary-foreground/70">Statuts explicites</p>
            </div>
            <div className="pl-4">
              <p className="text-sm font-semibold">Usage local</p>
              <p className="mt-1 text-sm leading-5 text-primary-foreground/70">Réseau interne</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-primary-foreground/65">
          Accès réservé aux comptes autorisés par votre organisation.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-primary">
              <Landmark className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-xl font-bold tracking-tight text-primary">Archivio</span>
              <span className="block text-xs font-medium text-muted-foreground">Gestion documentaire</span>
            </span>
          </div>

          <Card className="border-border shadow-sm">
            <CardHeader className="space-y-2 pb-5">
              <CardTitle className="text-2xl">Connexion</CardTitle>
              <CardDescription className="text-sm leading-6">
                Utilisez les identifiants fournis par l’administrateur de votre organisation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {submissionError && (
                  <Alert variant="destructive" aria-live="assertive">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    <AlertTitle>Connexion impossible</AlertTitle>
                    <AlertDescription>{submissionError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username">Nom d’utilisateur</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    value={credentials.username}
                    onChange={(event) => updateCredential("username", event.target.value)}
                    placeholder="Ex. dkamana"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.username)}
                    aria-describedby={fieldErrors.username ? "username-error" : undefined}
                    autoFocus
                  />
                  {fieldErrors.username && (
                    <p id="username-error" className="text-sm text-destructive">
                      {fieldErrors.username}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={credentials.password}
                      onChange={(event) => updateCredential("password", event.target.value)}
                      placeholder="Saisissez votre mot de passe"
                      autoComplete="current-password"
                      disabled={isSubmitting}
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={fieldErrors.password ? "password-error" : undefined}
                      className="pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => setShowPassword((current) => !current)}
                      disabled={isSubmitting}
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                  {fieldErrors.password && (
                    <p id="password-error" className="text-sm text-destructive">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <Button type="submit" className="min-h-11 w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      Connexion en cours…
                    </>
                  ) : (
                    "Se connecter"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-5 text-center text-sm leading-6 text-muted-foreground">
            En cas de problème d’accès, contactez l’administrateur Archivio de votre organisation.
          </p>
        </div>
      </section>
    </main>
  );
}
