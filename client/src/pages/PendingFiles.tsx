import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import type { File, PaginatedResponse } from "../types";
import { apiRequest } from "../lib/queryClient";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";

type ReviewInput = { id: number; decision: "approve" | "reject"; justification: string };

export default function PendingFiles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [justifications, setJustifications] = useState<Record<number, string>>({});
  const isReviewer = user?.role === "ADMIN" || user?.role === "SUPERUSER";

  const { data, isLoading, error } = useQuery<PaginatedResponse<File>>({
    queryKey: ["/api/files/pending"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/files/pending");
      return response.json();
    },
    enabled: isReviewer,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, decision, justification }: ReviewInput) => {
      const response = await apiRequest(
        "PATCH",
        `/api/files/${id}/${decision}`,
        { justification },
      );
      return response.json();
    },
    onSuccess: (_result, variables) => {
      setJustifications((current) => {
        const next = { ...current };
        delete next[variables.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/files/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
  });

  if (!isReviewer) {
    return <div className="p-8 text-center">Accès réservé aux personnes chargées de la validation.</div>;
  }

  const files = data?.data ?? [];

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Documents en attente</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chaque décision exige une justification qui sera conservée dans l’historique.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : error ? (
        <p className="text-destructive">Impossible de charger les documents en attente.</p>
      ) : files.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-muted-foreground">Aucun document en attente.</p>
      ) : (
        <div className="space-y-4">
          {files.map((file) => {
            const justification = justifications[file.id] ?? "";
            const canSubmit = justification.trim().length >= 3 && !reviewMutation.isPending;
            return (
              <section key={file.id} className="rounded-lg border bg-card p-4">
                <div className="mb-3">
                  <h2 className="font-semibold text-card-foreground">{file.originalName}</h2>
                  <p className="text-sm text-muted-foreground">
                    {file.uploaderName || "Auteur inconnu"} · {file.department || "Sans département"}
                  </p>
                  {file.description && <p className="mt-2 text-sm">{file.description}</p>}
                </div>
                <label htmlFor={`justification-${file.id}`} className="text-sm font-medium">
                  Justification de la décision
                </label>
                <Textarea
                  id={`justification-${file.id}`}
                  className="mt-1"
                  value={justification}
                  onChange={(event) => setJustifications((current) => ({
                    ...current,
                    [file.id]: event.target.value,
                  }))}
                  maxLength={1000}
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    disabled={!canSubmit}
                    onClick={() => reviewMutation.mutate({ id: file.id, decision: "reject", justification })}
                  >
                    Refuser
                  </Button>
                  <Button
                    disabled={!canSubmit}
                    onClick={() => reviewMutation.mutate({ id: file.id, decision: "approve", justification })}
                  >
                    Archiver
                  </Button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
