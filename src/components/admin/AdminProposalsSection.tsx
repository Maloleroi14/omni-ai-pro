import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Eye, EyeOff, ThumbsUp, ThumbsDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Proposal {
  id: string;
  title: string;
  description: string;
  category: string;
  is_published: boolean;
  created_at: string;
  yes_count: number;
  no_count: number;
}

export function AdminProposalsSection() {
  const { user } = useAuthContext();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("feature");
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: props } = await supabase
      .from("update_proposals")
      .select("*")
      .order("created_at", { ascending: false });
    if (!props) return;

    const { data: votes } = await supabase
      .from("proposal_votes")
      .select("proposal_id, vote")
      .in("proposal_id", props.map(p => p.id));

    const enriched = props.map(p => {
      const pVotes = (votes || []).filter(v => v.proposal_id === p.id);
      return {
        ...p,
        yes_count: pVotes.filter(v => v.vote === true).length,
        no_count: pVotes.filter(v => v.vote === false).length,
      };
    });
    setProposals(enriched);
  };

  const create = async () => {
    if (!title.trim() || !description.trim() || !user) return;
    const { error } = await supabase.from("update_proposals").insert({
      title: title.trim(),
      description: description.trim(),
      category,
      created_by: user.id,
    });
    if (error) { toast.error("Erreur"); return; }
    toast.success("Proposition créée");
    setTitle(""); setDescription(""); setShowForm(false);
    load();
  };

  const togglePublish = async (id: string, current: boolean) => {
    await supabase.from("update_proposals").update({ is_published: !current }).eq("id", id);
    toast.success(!current ? "Publiée" : "Dépubliée");
    load();
  };

  const deleteProposal = async (id: string) => {
    await supabase.from("update_proposals").delete().eq("id", id);
    toast.success("Supprimée");
    if (selectedId === id) setSelectedId(null);
    load();
  };

  const selected = proposals.find(p => p.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Propositions de vote</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Titre de la proposition" value={title} onChange={e => setTitle(e.target.value)} />
            <Textarea placeholder="Description détaillée..." value={description} onChange={e => setDescription(e.target.value)} />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="feature">Fonctionnalité</SelectItem>
                <SelectItem value="improvement">Amélioration</SelectItem>
                <SelectItem value="fix">Correction</SelectItem>
                <SelectItem value="design">Design</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={create} disabled={!title.trim() || !description.trim()}>Créer</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {proposals.map(p => {
          const total = p.yes_count + p.no_count;
          const yesPercent = total > 0 ? Math.round((p.yes_count / total) * 100) : 0;
          const isSelected = selectedId === p.id;

          return (
            <Card key={p.id} className={cn("cursor-pointer transition-colors", isSelected && "ring-2 ring-primary")}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1" onClick={() => setSelectedId(isSelected ? null : p.id)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        p.is_published ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
                      )}>
                        {p.is_published ? "Publiée" : "Brouillon"}
                      </span>
                      <span className="text-xs text-muted-foreground">{p.category}</span>
                    </div>
                    <h3 className="font-semibold">{p.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => togglePublish(p.id, p.is_published)}>
                      {p.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteProposal(p.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Results */}
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-500">
                      <ThumbsUp className="w-3.5 h-3.5" /> {p.yes_count}
                    </span>
                    <span className="flex items-center gap-1 text-red-500">
                      <ThumbsDown className="w-3.5 h-3.5" /> {p.no_count}
                    </span>
                    <span className="text-muted-foreground">{total} votes</span>
                    {total > 0 && <span className="text-muted-foreground">({yesPercent}% pour)</span>}
                  </div>
                  {total > 0 && (
                    <div className="h-2 rounded-full bg-muted overflow-hidden flex mt-2">
                      <div className="bg-green-500 transition-all" style={{ width: `${yesPercent}%` }} />
                      <div className="bg-red-500 transition-all" style={{ width: `${100 - yesPercent}%` }} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
