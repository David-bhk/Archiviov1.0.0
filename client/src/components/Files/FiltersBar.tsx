import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Grid, List, ArrowUpDown } from "lucide-react";
import { Department } from "../../types";

interface FiltersBarProps {
  filters: {
    type: string;
    department: string;
    date: string;
  };
  onFiltersChange: (filters: any) => void;
}

export default function FiltersBar({ filters, onFiltersChange }: FiltersBarProps) {
  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white border-b border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={filters.type} onValueChange={(value) => handleFilterChange("type", value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="docx">Word</SelectItem>
              <SelectItem value="xlsx">Excel</SelectItem>
              <SelectItem value="png">Images</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filters.department} onValueChange={(value) => handleFilterChange("department", value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tous les départements" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les départements</SelectItem>
              {departments?.map((dept) => (
                <SelectItem key={dept.id} value={dept.name}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filters.date} onValueChange={(value) => handleFilterChange("date", value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Derniers 30 jours" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Derniers 30 jours</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="ghost" className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filtres avancés</span>
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon">
            <Grid className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <List className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <ArrowUpDown className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
