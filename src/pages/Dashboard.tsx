import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageCircle, Globe, Clock, Coins, TrendingUp, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function Dashboard() {
  const { user, credits } = useAuthContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalConversations: 0,
    totalProjects: 0,
    publishedProjects: 0,
    memberSince: "",
    messagesPerDay: [] as { day: string; count: number }[],
  });

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }

    const load = async () => {
      const [convRes, projRes, msgRes, profileRes] = await Promise.all([
        supabase.from("conversations").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("user_projects").select("id, is_published", { count: "exact" }).eq("user_id", user.id),
        supabase.from("messages").select("created_at", { count: "exact" }).eq("user_id", user.id),
        supabase.from("profiles").select("created_at").eq("user_id", user.id).single(),
      ]);

      const published = projRes.data?.filter((p: any) => p.is_published).length || 0;
      const memberSince = profileRes.data?.created_at
        ? new Date(profileRes.data.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
        : "";

      // Messages per day (last 7 days)
      const days: { day: string; count: number }[] = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString("fr-FR", { weekday: "short" });
        const dayStart = new Date(d.setHours(0, 0, 0, 0)).toISOString();
        const dayEnd = new Date(d.setHours(23, 59, 59, 999)).toISOString();
        const count = (msgRes.data || []).filter(
          (m: any) => m.created_at >= dayStart && m.created_at <= dayEnd
        ).length;
        days.push({ day: label, count });
      }

      setStats({
        totalMessages: msgRes.count || 0,
        totalConversations: convRes.count || 0,
        totalProjects: projRes.count || 0,
        publishedProjects: published,
        memberSince,
        messagesPerDay: days,
      });
    };
    load();
  }, [user]);

  if (!user) return null;

  const statCards = [
    { label: "Messages envoyés", value: stats.totalMessages, icon: MessageCircle, color: "text-blue-500" },
    { label: "Conversations", value: stats.totalConversations, icon: TrendingUp, color: "text-green-500" },
    { label: "Projets créés", value: stats.totalProjects, icon: Globe, color: "text-purple-500" },
    { label: "Crédits restants", value: credits?.credits || 0, icon: Coins, color: "text-amber-500" },
  ];

  const pieData = [
    { name: "Publiés", value: stats.publishedProjects },
    { name: "Brouillons", value: Math.max(0, stats.totalProjects - stats.publishedProjects) },
  ];
  const COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground))"];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <p className="text-muted-foreground mb-8">
            Membre depuis {stats.memberSince} • Vue d'ensemble de ton activité
          </p>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="border-border/60">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold">{s.value.toLocaleString()}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-3 gap-4">
          <motion.div className="md:col-span-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base">Messages (7 derniers jours)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.messagesPerDay}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <Card className="border-border/60 h-full">
              <CardHeader>
                <CardTitle className="text-base">Projets</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                {stats.totalProjects > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm py-12">Aucun projet encore</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
