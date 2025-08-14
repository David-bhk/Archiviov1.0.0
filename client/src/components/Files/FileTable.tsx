import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, Download, Eye, Trash2, Grid, List } from "lucide-react";
import { File } from "../../types";
import { useRole } from "../../contexts/RoleContext";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface FileTableProps {
  files: File[];
  onDownload: (file: File) => void;
  onDelete: (file: File) => void;
}

export default function FileTable({ files, onDownload, onDelete }: FileTableProps) {
  const { canDeleteFile } = useRole();

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "pdf": return <FileText className="w-4 h-4 text-red-500" />;
      case "docx": case "doc": return <FileText className="w-4 h-4 text-blue-500" />;
      case "xlsx": case "xls": return <FileText className="w-4 h-4 text-green-500" />;
      case "png": case "jpg": case "jpeg": return <Image className="w-4 h-4 text-purple-500" />;
      default: return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    return formatDistanceToNow(d, { addSuffix: true, locale: fr });
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      {/* Version responsive avec actions fixes */}
      <div className="overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-8 sticky left-0 bg-slate-50 z-10"></TableHead>
              <TableHead className="font-semibold min-w-[200px] sticky left-8 bg-slate-50 z-10">
                Nom du fichier
              </TableHead>
              <TableHead className="font-semibold w-20">Type</TableHead>
              <TableHead className="font-semibold w-24">Taille</TableHead>
              <TableHead className="font-semibold w-32 hidden sm:table-cell">Téléchargé par</TableHead>
              <TableHead className="font-semibold w-28 hidden md:table-cell">Date</TableHead>
              <TableHead className="font-semibold w-32 hidden lg:table-cell">Département</TableHead>
              <TableHead className="w-32 sticky right-0 bg-slate-50 z-10">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id} className="hover:bg-slate-50 transition-colors">
                <TableCell className="py-3 sticky left-0 bg-white z-10">
                  {getFileIcon(file.fileType)}
                </TableCell>
                <TableCell className="py-3 sticky left-8 bg-white z-10">
                  <div className="flex flex-col min-w-[200px]">
                    <span className="font-medium text-slate-900 truncate" title={file.originalName}>
                      {file.originalName}
                    </span>
                    {file.description && (
                      <span className="text-xs text-slate-500 truncate">
                        {file.description}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <Badge variant="secondary" className="text-xs font-medium">
                    {file.fileType.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 text-sm font-medium text-slate-700">
                  {formatFileSize(file.fileSize)}
                </TableCell>
                <TableCell className="py-3 hidden sm:table-cell">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-white">
                        {file.uploaderName ? file.uploaderName.charAt(0).toUpperCase() : 'U'}
                      </span>
                    </div>
                    <span className="text-sm text-slate-700 truncate max-w-20">
                      {file.uploaderName || "Inconnu"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3 text-sm text-slate-600 hidden md:table-cell">
                  {formatDate(file.createdAt)}
                </TableCell>
                <TableCell className="py-3 hidden lg:table-cell">
                  {file.department && (
                    <Badge variant="outline" className="text-xs">
                      {file.department}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="py-3 sticky right-0 bg-white z-10">
                  <div className="flex items-center space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 hover:bg-slate-100"
                      title="Aperçu"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDownload(file)}
                      className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                      title="Télécharger"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {canDeleteFile(file) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(file)}
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
