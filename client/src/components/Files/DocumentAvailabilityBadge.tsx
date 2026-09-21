import { Badge } from "@/components/ui/badge";

export default function DocumentAvailabilityBadge({ isAvailable }: { isAvailable: boolean }) {
  if (isAvailable) return null;

  return (
    <Badge variant="outline" className="w-fit rounded-sm border-warning bg-card font-medium text-warning">
      Contenu indisponible
    </Badge>
  );
}
