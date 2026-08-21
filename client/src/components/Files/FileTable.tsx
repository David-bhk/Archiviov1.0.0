import { Download, FileText, MoreHorizontal, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocumentStatus } from "@shared/schema";
import type { File } from "../../types";

interface FileTableProps {
  files: File[];
  downloadingId: number | null;
  canDownload: (file: File) => boolean;
  canDelete: (file: File) => boolean;
  onDownload: (file: File) => void;
  onRequestDelete: (file: File) => void;
}

const statusLabels: Record<DocumentStatus, string> = {
  pending: "En attente",
  archived: "Archivé",
  rejected: "Refusé",
};

const statusClasses: Record<DocumentStatus, string> = {
  pending: "border-warning bg-card text-warning",
  archived: "border-success bg-card text-success",
  rejected: "border-destructive bg-card text-destructive",
};

function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "0 octet";
  const units = ["octets", "Ko", "Mo", "Go", "To"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)} ${units[unitIndex]}`;
}

function formatDate(value?: Date): string {
  if (!value) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <Badge variant="outline" className={`rounded-sm font-medium ${statusClasses[status]}`}>
      {statusLabels[status]}
    </Badge>
  );
}

function DocumentActions({
  file,
  downloadingId,
  canDownload,
  canDelete,
  onDownload,
  onRequestDelete,
}: FileTableProps & { file: File }) {
  const downloadAllowed = canDownload(file);
  const deleteAllowed = canDelete(file);

  if (!downloadAllowed && !deleteAllowed) {
    return <span className="text-xs text-muted-foreground">Indisponible</span>;
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {downloadAllowed && (
        <Button
          variant="outline"
          size="sm"
          className="min-h-10"
          onClick={() => onDownload(file)}
          disabled={downloadingId === file.id}
        >
          <Download className="mr-2 h-4 w-4" />
          {downloadingId === file.id ? "Préparation…" : "Télécharger"}
        </Button>
      )}
      {deleteAllowed && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="min-h-10 min-w-10" aria-label={`Actions pour ${file.originalName}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => onRequestDelete(file)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Retirer de la bibliothèque
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export default function FileTable(props: FileTableProps) {
  const { files } = props;

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b bg-muted text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Référence</th>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Département</th>
              <th className="px-4 py-3">Auteur</th>
              <th className="px-4 py-3">Date d'entrée</th>
              <th className="px-4 py-3">Taille</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {files.map((file) => (
              <tr key={file.id} className="transition-colors hover:bg-muted">
                <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-muted-foreground">
                  DOC-{String(file.id).padStart(4, "0")}
                </td>
                <td className="max-w-xs px-4 py-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate font-medium" title={file.originalName}>{file.originalName}</p>
                      <p className="mt-0.5 text-xs uppercase text-muted-foreground">{file.fileType}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4"><StatusBadge status={file.status} /></td>
                <td className="px-4 py-4 text-muted-foreground">{file.department || "Non attribué"}</td>
                <td className="px-4 py-4 text-muted-foreground">{file.uploaderName || "Auteur inconnu"}</td>
                <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">{formatDate(file.createdAt)}</td>
                <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">{formatFileSize(file.fileSize)}</td>
                <td className="px-4 py-4">
                  <DocumentActions {...props} file={file} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y lg:hidden">
        {files.map((file) => (
          <article key={file.id} className="p-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{file.originalName}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  DOC-{String(file.id).padStart(4, "0")} · {file.fileType.toUpperCase()}
                </p>
              </div>
              <StatusBadge status={file.status} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Département</dt>
                <dd className="mt-1 break-words">{file.department || "Non attribué"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Date d'entrée</dt>
                <dd className="mt-1">{formatDate(file.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Auteur</dt>
                <dd className="mt-1 break-words">{file.uploaderName || "Auteur inconnu"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Taille</dt>
                <dd className="mt-1">{formatFileSize(file.fileSize)}</dd>
              </div>
            </dl>

            <div className="mt-4 border-t pt-4">
              <DocumentActions {...props} file={file} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
