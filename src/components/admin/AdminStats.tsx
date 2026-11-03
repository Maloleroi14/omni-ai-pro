import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Users, MessageSquare, Activity, Clock, TrendingUp, Wifi } from "lucide-react";

interface StatsData {
  totalUsers: number;
  totalMessages: number;
  activeToday: number;
  totalConversations: number;
  newUsersToday: number;
  connectionsToday: number;
}

export function AdminStats() {
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    totalMessages: 0,
    activeToday: 0,
    totalConversations: 0,
    newUsersToday: 0,
    connectionsToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    // Refresh every 30 seconds for real-time feel
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [profilesRes, messagesRes, conversationsRes, newUsersRes, connectionsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id, created_at", { count: "exact", head: false }),
        supabase.from("conversations").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
        supabase.from("connection_logs").select("id", { count: "exact", head: true }).gte("logged_in_at", todayISO),
      ]);

      const totalUsers = profilesRes.count || 0;
      const totalMessages = messagesRes.count || 0;
      const totalConversations = conversationsRes.count || 0;
      const newUsersToday = newUsersRes.count || 0;
      const connectionsToday = connectionsRes.count || 0;

      const todayMessages = messagesRes.data?.filter(
        (m) => new Date(m.created_at) >= today
      ).length || 0;

      setStats({
        totalUsers,
        totalMessages,
        activeToday: todayMessages,
        totalConversations,
        newUsersToday,
        connectionsToday,
      });
    } catch (e) {
      console.error("Error loading stats:", e);
    }
    setLoading(false);
  };

  const statCards = [
    { label: "Utilisateurs", value: stats.totalUsers, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Messages total", value: stats.totalMessages, icon: MessageSquare, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Messages aujourd'hui", value: stats.activeToday, icon: Activity, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Conversations", value: stats.totalConversations, icon: Clock, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Nouveaux aujourd'hui", value: stats.newUsersToday, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Connexions aujourd'hui", value: stats.connectionsToday, icon: Wifi, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="overflow-hidden">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.bg}`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-none">
                  {loading ? "…" : s.value.toLocaleString("fr-FR")}
                </p>
                <p className="text-xs text-muted-foreground truncate">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Mise à jour automatique toutes les 30s
      </div>
    </div>
  );
}
