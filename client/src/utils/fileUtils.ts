import { File } from "../types";

// Fonction utilitaire pour obtenir le token d'authentification
export function getAuthToken(): string | null {
  return localStorage.getItem('archivio_token'); // Corrigé pour utiliser la bonne clé
}

// Fonction utilitaire pour télécharger un fichier
export async function downloadFile(file: File, toast: any): Promise<void> {
  try {
    const token = getAuthToken();
    if (!token) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour télécharger",
        variant: "destructive",
      });
      return;
    }

    // Afficher un toast de début de téléchargement
    toast({
      title: "Téléchargement en cours...",
      description: `Téléchargement de ${file.originalName}`,
    });

    const response = await fetch(`/api/files/${file.id}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Erreur ${response.status}: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.originalName || file.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Téléchargement réussi",
      description: `${file.originalName} a été téléchargé`,
    });
  } catch (error) {
    console.error("Erreur de téléchargement:", error);
    toast({
      title: "Erreur de téléchargement",
      description: error instanceof Error ? error.message : "Impossible de télécharger le fichier",
      variant: "destructive",
    });
  }
}

// Fonction utilitaire pour formater la taille des fichiers
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Fonction utilitaire pour formater les dates
export function formatDate(date: Date | string | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR");
}
