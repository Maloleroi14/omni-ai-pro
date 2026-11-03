import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Monitor, Smartphone, Tablet, Globe, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConnectionLog {
  id: string;
  user_email: string;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string;
  logged_in_at: string;
}

export function AdminConnectionLogsSection() {
  const [logs, setLogs] = useState<ConnectionLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("connection_logs")
      .select("*")
      .order("logged_in_at", { ascending: false })
      .limit(200);
    setLogs((data as any[]) || []);
    setLoading(false);
  };

  const clearLogs = async () => {
    await supabase.from("connection_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    toast.success("Logs effacés");
    loadLogs();
  };

  const deviceIcon = (type: string) => {
    if (type === "mobile") return <Smartphone className="w-4 h-4 text-blue-500" />;
    if (type === "tablet") return <Tablet className="w-4 h-4 text-purple-500" />;
    return <Monitor className="w-4 h-4 text-green-500" />;
  };

  const filtered = logs.filter(l => 
    !search || l.user_email?.toLowerCase().includes(search.toLowerCase()) || l.ip_address?.includes(search)
  );

  const uniqueUsers = new Set(logs.map(l => l.user_email)).size;
  const todayCount = logs.filter(l => {
    const d = new Date(l.logged_in_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{logs.length}</p>
            <p className="text-xs text-muted-foreground">Connexions totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{uniqueUsers}</p>
            <p className="text-xs text-muted-foreground">Utilisateurs uniques</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{todayCount}</p>
            <p className="text-xs text-muted-foreground">Aujourd'hui</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Logs de connexion
            </CardTitle>
            <Button variant="outline" size="sm" onClick={clearLogs}>
              <Trash2 className="w-3 h-3 mr-1" />
              Effacer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Rechercher par email ou IP..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Chargement...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun log</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filtered.map(l => (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg border text-sm">
                  {deviceIcon(l.device_type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{l.user_email || "Inconnu"}</p>
                    <p className="text-xs text-muted-foreground truncate">{l.user_agent?.substring(0, 80) || "N/A"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {l.ip_address && <Badge variant="outline" className="text-xs mb-1">{l.ip_address}</Badge>}
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(l.logged_in_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
