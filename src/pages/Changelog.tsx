import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Rocket, Bug, Sparkles, Wrench, Clock, CheckCircle2, Circle, ArrowUpCircle } from "lucide-react";
import { motion } from "framer-motion";

type ChangelogEntry = {
  id: string;
  version: string;
  title: string;
  description: string;
  type: string;
  release_date: string;
};

type RoadmapItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  target_date: string | null;
  sort_order: number;
};

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  feature: { label: "Nouveauté", icon: Sparkles, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  fix: { label: "Correction", icon: Bug, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  improvement: { label: "Amélioration", icon: ArrowUpCircle, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  update: { label: "Mise à jour", icon: Wrench, color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
};

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  planned: { label: "Planifié", icon: Circle, color: "bg-muted text-muted-foreground" },
  in_progress: { label: "En cours", icon: Clock, color: "bg-blue-500/10 text-blue-600" },
  completed: { label: "Terminé", icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600" },
};

export default function Changelog() {
  const navigate = useNavigate();
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [tab, setTab] = useState<"changelog" | "roadmap">("changelog");

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: cl }, { data: rm }] = await Promise.all([
        supabase.from("changelog_entries").select("*").eq("is_published", true).order("release_date", { ascending: false }),
        supabase.from("roadmap_items").select("*").eq("is_published", true).order("sort_order"),
      ]);
      setChangelog((cl as any[]) || []);
      setRoadmap((rm as any[]) || []);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Rocket className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-lg">Changelog & Roadmap</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-8">
          <Button variant={tab === "changelog" ? "default" : "outline"} onClick={() => setTab("changelog")} size="sm">
            Mises à jour
          </Button>
          <Button variant={tab === "roadmap" ? "default" : "outline"} onClick={() => setTab("roadmap")} size="sm">
            Roadmap
          </Button>
        </div>

        {tab === "changelog" && (
          <div className="space-y-6">
            {changelog.length === 0 && <p className="text-muted-foreground text-center py-12">Aucune mise à jour pour le moment.</p>}
            {changelog.map((entry, i) => {
              const cfg = typeConfig[entry.type] || typeConfig.update;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative pl-8 border-l-2 border-border pb-6 last:pb-0"
                >
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="outline" className={cfg.color}>
                      <Icon className="w-3 h-3 mr-1" />
                      {cfg.label}
                    </Badge>
                    <Badge variant="secondary" className="font-mono text-xs">{entry.version}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.release_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{entry.title}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{entry.description}</p>
                </motion.div>
              );
            })}
          </div>
        )}

        {tab === "roadmap" && (
          <div className="space-y-4">
            {roadmap.length === 0 && <p className="text-muted-foreground text-center py-12">Aucun élément dans la roadmap.</p>}
            {roadmap.map((item, i) => {
              const sCfg = statusConfig[item.status] || statusConfig.planned;
              const SIcon = sCfg.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge className={sCfg.color}>
                      <SIcon className="w-3 h-3 mr-1" />
                      {sCfg.label}
                    </Badge>
                    {item.target_date && (
                      <span className="text-xs text-muted-foreground">Objectif : {item.target_date}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
