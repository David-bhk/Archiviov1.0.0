import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { File } from "../types";
import { Button } from "../components/ui/button";

export default function PendingFiles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin" || user?.role === "superuser";

  // Récupère tous les fichiers en attente
  const { data: files, isLoading } = useQuery<File[]>({
    queryKey: ["/api/files/pending"],
    queryFn: async () => {
      const res = await fetch("/api/files");
      const all = await res.json();
      return all.filter((f: File) => f.status === "pending");
    },
    enabled: isAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/files/${id}/approve`, { method: "PATCH" });
      if (!res.ok) throw new Error("Erreur d'approbation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
    },
  });

  if (!isAdmin) return <div className="p-8 text-center">Accès réservé à l'administration.</div>;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Fichiers en attente d'approbation</h2>
      {isLoading ? (
        <div>Chargement...</div>
      ) : files && files.length === 0 ? (
        <div>Aucun fichier en attente.</div>
      ) : (
        <div className="space-y-4">
          {files?.map((file) => (
            <div key={file.id} className="border p-4 rounded flex items-center justify-between">
              <div>
                <div className="font-semibold">{file.originalName}</div>
                <div className="text-sm text-slate-500">Déposé par: {file.uploaderName || file.uploadedBy}</div>
                <div className="text-xs text-slate-400">Description: {file.description}</div>
              </div>
              <Button
                onClick={() => approveMutation.mutate(file.id)}
                disabled={approveMutation.isPending}
                className="ml-4"
              >
                Approuver
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
