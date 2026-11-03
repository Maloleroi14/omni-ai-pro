import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, RefreshCw, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

export function AdminAnalyticsSection() {
  const [messagesPerDay, setMessagesPerDay] = useState<any[]>([]);
  const [signupsPerDay, setSignupsPerDay] = useState<any[]>([]);
  const [creditDistribution, setCreditDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30).toISOString();

    const [messagesRes, profilesRes, creditsRes] = await Promise.all([
      supabase.from("messages").select("created_at").gte("created_at", thirtyDaysAgo),
      supabase.from("profiles").select("created_at").gte("created_at", thirtyDaysAgo),
      supabase.from("user_credits").select("credits"),
    ]);

    // Messages per day
    const msgsByDay = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(now, i), "dd/MM");
      msgsByDay.set(d, 0);
    }
    (messagesRes.data || []).forEach((m) => {
      const d = format(new Date(m.created_at), "dd/MM");
      msgsByDay.set(d, (msgsByDay.get(d) || 0) + 1);
    });
    setMessagesPerDay(Array.from(msgsByDay.entries()).map(([date, count]) => ({ date, count })));

    // Signups per day
    const signupsByDay = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(now, i), "dd/MM");
      signupsByDay.set(d, 0);
    }
    (profilesRes.data || []).forEach((p) => {
      const d = format(new Date(p.created_at), "dd/MM");
      signupsByDay.set(d, (signupsByDay.get(d) || 0) + 1);
    });
    setSignupsPerDay(Array.from(signupsByDay.entries()).map(([date, count]) => ({ date, count })));

    // Credit distribution
    const credits = creditsRes.data || [];
    const unlimited = credits.filter(c => c.credits >= 999999).length;
    const high = credits.filter(c => c.credits >= 50 && c.credits < 999999).length;
    const medium = credits.filter(c => c.credits >= 10 && c.credits < 50).length;
    const low = credits.filter(c => c.credits > 0 && c.credits < 10).length;
    const zero = credits.filter(c => c.credits <= 0).length;
    setCreditDistribution([
      { name: "Illimités", value: unlimited, color: "hsl(var(--primary))" },
      { name: "50+", value: high, color: "hsl(142, 76%, 36%)" },
      { name: "10-49", value: medium, color: "hsl(48, 96%, 53%)" },
      { name: "1-9", value: low, color: "hsl(25, 95%, 53%)" },
      { name: "0", value: zero, color: "hsl(0, 84%, 60%)" },
    ].filter(d => d.value > 0));

    setLoading(false);
  };

  useEffect(() => { loadAnalytics(); }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Analytiques avancées
        </h2>
        <Button variant="ghost" size="icon" onClick={loadAnalytics}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Messages / jour (30j)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={messagesPerDay}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Inscriptions / jour (30j)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={signupsPerDay}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Distribution des crédits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={creditDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {creditDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1">
              {creditDistribution.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span>{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
