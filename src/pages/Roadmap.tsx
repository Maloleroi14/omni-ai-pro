import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Bot, ArrowLeft, ThumbsUp, Clock, CheckCircle2, Rocket, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: string;
  category: string;
  target_date: string | null;
  votes?: number;
  voted?: boolean;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  planned: { label: "Planifié", icon: Lightbulb, color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  in_progress: { label: "En cours", icon: Clock, color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  completed: { label: "Terminé", icon: CheckCircle2, color: "text-green-500 bg-green-500/10 border-green-500/30" },
  launched: { label: "Lancé", icon: Rocket, color: "text-primary bg-primary/10 border-primary/30" },
};

export default function Roadmap() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadItems();
    loadVotes();
  }, [user]);

  const loadItems = async () => {
    const { data } = await supabase.from("roadmap_items").select("*").eq("is_published", true).order("sort_order");
    if (data) setItems(data);
  };

  const loadVotes = async () => {
    const { data } = await supabase.from("admin_settings").select("setting_value").eq("setting_key", "roadmap_votes").maybeSingle();
    if (data?.setting_value) {
      const v = data.setting_value as any;
      setVotes(v.votes || {});
      if (user) {
        const uv = v.user_votes?.[user.id] || [];
        setUserVotes(new Set(uv));
      }
    }
  };

  const handleVote = async (itemId: string) => {
    if (!user) { toast.error("Connectez-vous pour voter"); return; }
    const hasVoted = userVotes.has(itemId);
    const newVotes = { ...votes };
    const newUserVotes = new Set(userVotes);

    if (hasVoted) {
      newVotes[itemId] = Math.max(0, (newVotes[itemId] || 0) - 1);
      newUserVotes.delete(itemId);
    } else {
      newVotes[itemId] = (newVotes[itemId] || 0) + 1;
      newUserVotes.add(itemId);
    }

    setVotes(newVotes);
    setUserVotes(newUserVotes);

    // Persist
    const { data: existing } = await supabase.from("admin_settings").select("setting_value").eq("setting_key", "roadmap_votes").maybeSingle();
    const current = (existing?.setting_value as any) || { votes: {}, user_votes: {} };
    current.votes = newVotes;
    current.user_votes = current.user_votes || {};
    current.user_votes[user.id] = Array.from(newUserVotes);

    await supabase.from("admin_settings").upsert({
      setting_key: "roadmap_votes",
      setting_value: current as any,
      updated_at: new Date().toISOString(),
    }, { onConflict: "setting_key" });

    toast.success(hasVoted ? "Vote retiré" : "Vote enregistré !");
  };

  const filtered = filter === "all" ? items : items.filter(i => i.status === filter);

  return (
    <div className="min-h-screen bg-background grain-overlay">
      <nav className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-2xl">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4" /></Button>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold font-display">Roadmap</span>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold font-display mb-3">Roadmap publique</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">Découvrez les fonctionnalités à venir et votez pour celles qui vous intéressent le plus.</p>
        </motion.div>

        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {[
            { id: "all", label: "Tout" },
            { id: "planned", label: "Planifié" },
            { id: "in_progress", label: "En cours" },
            { id: "completed", label: "Terminé" },
            { id: "launched", label: "Lancé" },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={cn(
              "px-4 py-2 rounded-full text-xs font-medium border transition-all",
              filter === f.id ? "bg-primary text-primary-foreground border-primary" : "bg-card/60 border-border/60 hover:border-primary/40"
            )}>{f.label}</button>
          ))}
        </div>

        <div className="space-y-4">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">Aucun élément dans cette catégorie.</div>
          )}
          {filtered.map((item, i) => {
            const cfg = statusConfig[item.status] || statusConfig.planned;
            const Icon = cfg.icon;
            const voteCount = votes[item.id] || 0;
            const hasVoted = userVotes.has(item.id);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-5 sm:p-6 hover:border-primary/20 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => handleVote(item.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all shrink-0",
                      hasVoted
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-card border-border/60 hover:border-primary/30 text-muted-foreground hover:text-primary"
                    )}
                  >
                    <ThumbsUp className={cn("w-4 h-4", hasVoted && "fill-current")} />
                    <span className="text-xs font-bold">{voteCount}</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-bold text-sm sm:text-base">{item.title}</h3>
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border", cfg.color)}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{item.category}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                    {item.target_date && (
                      <p className="text-[11px] text-muted-foreground mt-2">📅 Objectif : {item.target_date}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
