import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function ActivityHistory() {
  const [location, navigate] = useLocation();
  const { data: activities, isLoading } = useQuery({
    queryKey: ["/api/activities", "all"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/activities?limit=50");
      return res.json();
    },
  });

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800">Historique des activités</h2>
        <Button variant="outline" onClick={() => navigate("/")}>Retour</Button>
      </div>
      {isLoading ? (
        <div className="text-slate-500">Chargement...</div>
      ) : Array.isArray(activities) && activities.length > 0 ? (
        <ul className="space-y-2">
          {activities.map((act, idx) => (
            <li key={act.id || idx} className="bg-white border rounded-lg p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  {act.type === "upload" && act.file?.originalName ? (
                    <span>Fichier <span className="font-semibold">{act.file.originalName}</span> ajouté par <span className="font-semibold">{act.user?.firstName} {act.user?.lastName}</span></span>
                  ) : act.type === "user_create" && act.user ? (
                    <span>Nouvel utilisateur <span className="font-semibold">{act.user.firstName} {act.user.lastName}</span></span>
                  ) : (
                    <span>{act.description || act.type}</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 ml-4">{new Date(act.createdAt).toLocaleString()}</div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-slate-500">Aucune activité trouvée.</div>
      )}
    </div>
  );
}
