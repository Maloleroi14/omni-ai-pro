import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ThumbsUp, ThumbsDown, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Proposal {
  id: string;
  title: string;
  description: string;
  category: string;
  created_at: string;
  yes_count: number;
  no_count: number;
  user_vote: boolean | null;
}

export default function Vote() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProposals();
  }, [user]);

  const loadProposals = async () => {
    const { data: props } = await supabase
      .from("update_proposals")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (!props) { setLoading(false); return; }

    // Get all votes
    const { data: allVotes } = await supabase
      .from("proposal_votes")
      .select("proposal_id, user_id, vote")
      .in("proposal_id", props.map(p => p.id));

    const enriched = props.map(p => {
      const votes = (allVotes || []).filter(v => v.proposal_id === p.id);
      const yes_count = votes.filter(v => v.vote === true).length;
      const no_count = votes.filter(v => v.vote === false).length;
      const userVote = user ? votes.find(v => v.user_id === user.id) : null;
      return { ...p, yes_count, no_count, user_vote: userVote ? userVote.vote : null };
    });

    setProposals(enriched);
    setLoading(false);
  };

  const handleVote = async (proposalId: string, vote: boolean) => {
    if (!user) { toast.error("Connectez-vous pour voter"); return; }

    const existing = proposals.find(p => p.id === proposalId);
    if (!existing) return;

    if (existing.user_vote === vote) {
      // Already voted same, do nothing
      return;
    }

    if (existing.user_vote !== null) {
      // Update vote
      await supabase
        .from("proposal_votes")
        .update({ vote })
        .eq("proposal_id", proposalId)
        .eq("user_id", user.id);
    } else {
      // Insert vote
      await supabase
        .from("proposal_votes")
        .insert({ proposal_id: proposalId, user_id: user.id, vote });
    }

    toast.success(vote ? "Vote : Je veux ! ✅" : "Vote : Je ne veux pas ❌");
    loadProposals();
  };

  const categoryColors: Record<string, string> = {
    feature: "bg-blue-500/10 text-blue-500",
    improvement: "bg-green-500/10 text-green-500",
    fix: "bg-amber-500/10 text-amber-500",
    design: "bg-purple-500/10 text-purple-500",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold flex-1">Vote</h1>
          <Button variant="outline" size="sm" onClick={() => navigate("/contact")} className="gap-2">
            <Lightbulb className="w-4 h-4" />
            Proposer
          </Button>
        </div>

        <p className="text-muted-foreground text-sm mb-6">
          Votez pour les prochaines fonctionnalités et améliorations d'Omni AI Pro.
        </p>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement...</div>
        ) : proposals.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Aucune proposition pour le moment.</div>
        ) : (
          <div className="space-y-4">
            {proposals.map(p => {
              const total = p.yes_count + p.no_count;
              const yesPercent = total > 0 ? Math.round((p.yes_count / total) * 100) : 0;
              return (
                <div key={p.id} className="border border-border rounded-xl p-4 bg-card">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", categoryColors[p.category] || "bg-muted text-muted-foreground")}>
                          {p.category}
                        </span>
                      </div>
                      <h3 className="font-semibold">{p.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                    </div>
                  </div>

                  {/* Vote bar */}
                  {total > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{p.yes_count} pour ({yesPercent}%)</span>
                        <span>{p.no_count} contre ({100 - yesPercent}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                        <div className="bg-green-500 transition-all" style={{ width: `${yesPercent}%` }} />
                        <div className="bg-red-500 transition-all" style={{ width: `${100 - yesPercent}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant={p.user_vote === true ? "default" : "outline"}
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => handleVote(p.id, true)}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Je veux
                    </Button>
                    <Button
                      variant={p.user_vote === false ? "destructive" : "outline"}
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => handleVote(p.id, false)}
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Je ne veux pas
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">{total} vote{total > 1 ? "s" : ""}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
