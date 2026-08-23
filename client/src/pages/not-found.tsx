import { Link } from "wouter";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg border-border shadow-sm">
        <CardHeader className="space-y-5 pb-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-accent text-primary">
            <FileQuestion className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-primary">Erreur 404</p>
            <CardTitle className="text-2xl">Page introuvable</CardTitle>
            <CardDescription className="text-sm leading-6">
              L’adresse demandée n’existe pas ou n’est plus disponible dans Archivio.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild className="min-h-10">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Retour au tableau de bord
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
