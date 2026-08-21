import { useQuery } from "@tanstack/react-query";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Department } from "../../types";

export interface DocumentFilters {
  type: string;
  department: string;
  date: string;
}

interface FiltersBarProps {
  filters: DocumentFilters;
  onFiltersChange: (filters: DocumentFilters) => void;
  totalFiles?: number;
  isLoading: boolean;
  showDepartmentFilter: boolean;
}

const DEFAULT_FILTERS: DocumentFilters = {
  type: "all",
  department: "all",
  date: "all",
};

export default function FiltersBar({
  filters,
  onFiltersChange,
  totalFiles,
  isLoading,
  showDepartmentFilter,
}: FiltersBarProps) {
  const departmentsQuery = useQuery<Department[]>({
    queryKey: ["/api/departments", "document-filters"],
    enabled: showDepartmentFilter,
    staleTime: 5 * 60 * 1000,
  });

  const setFilter = (key: keyof DocumentFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const activeFilterCount = [
    filters.type !== "all",
    showDepartmentFilter && filters.department !== "all",
    filters.date !== "all",
  ].filter(Boolean).length;

  return (
    <section className="rounded-lg border bg-card p-4" aria-labelledby="document-filters-title">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 id="document-filters-title" className="text-sm font-semibold">Filtrer les documents</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Affinez la liste avec les critères disponibles.
              </p>
            </div>
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Type de fichier</label>
              <Select value={filters.type} onValueChange={(value) => setFilter("type", value)}>
                <SelectTrigger className="min-h-10 bg-background" aria-label="Filtrer par type de fichier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="doc">Word (.doc)</SelectItem>
                  <SelectItem value="docx">Word (.docx)</SelectItem>
                  <SelectItem value="xls">Excel (.xls)</SelectItem>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="png">Image PNG</SelectItem>
                  <SelectItem value="jpg">Image JPG</SelectItem>
                  <SelectItem value="jpeg">Image JPEG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showDepartmentFilter && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Département</label>
                <Select
                  value={filters.department}
                  onValueChange={(value) => setFilter("department", value)}
                  disabled={departmentsQuery.isLoading || departmentsQuery.isError}
                >
                  <SelectTrigger className="min-h-10 bg-background" aria-label="Filtrer par département">
                    <SelectValue placeholder={departmentsQuery.isError ? "Indisponible" : "Tous les départements"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les départements</SelectItem>
                    {departmentsQuery.data?.map((department) => (
                      <SelectItem key={department.id} value={department.name}>{department.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Période d'entrée</label>
              <Select value={filters.date} onValueChange={(value) => setFilter("date", value)}>
                <SelectTrigger className="min-h-10 bg-background" aria-label="Filtrer par période">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toute la période</SelectItem>
                  <SelectItem value="7">7 derniers jours</SelectItem>
                  <SelectItem value="30">30 derniers jours</SelectItem>
                  <SelectItem value="90">3 derniers mois</SelectItem>
                  <SelectItem value="365">12 derniers mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex min-h-10 shrink-0 items-center justify-between gap-3 xl:justify-end">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {isLoading
              ? "Mise à jour…"
              : totalFiles === undefined
                ? "Prêt pour la recherche"
                : `${new Intl.NumberFormat("fr-FR").format(totalFiles)} document${totalFiles === 1 ? "" : "s"}`}
          </p>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onFiltersChange(DEFAULT_FILTERS)} className="min-h-10">
              <X className="mr-2 h-4 w-4" />
              Effacer ({activeFilterCount})
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
