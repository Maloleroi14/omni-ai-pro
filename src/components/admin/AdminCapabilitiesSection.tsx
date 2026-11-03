import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Brain, Plus, Trash2, Loader2 } from "lucide-react";

interface LearnedCapability {
  id: string;
  capability_name: string;
  trigger_pattern: string;
  instructions: string;
  usage_count: number;
  created_at: string;
}

export function AdminCapabilitiesSection() {
  const [capabilities, setCapabilities] = useState<LearnedCapability[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCap, setNewCap] = useState({ capability_name: "", trigger_pattern: "", instructions: "", example_response: "" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from("learned_capabilities").select("*").order("created_at", { ascending: false });
    if (data) setCapabilities(data);
  };

  const create = async () => {
    if (!newCap.capability_name.trim() || !newCap.trigger_pattern.trim() || !newCap.instructions.trim()) {
      toast.error("Remplissez tous les champs obligatoires"); return;
    }
    setIsCreating(true);
    const { error } = await supabase.from("learned_capabilities").insert({
      capability_name: newCap.capability_name.trim(),
      trigger_pattern: newCap.trigger_pattern.trim(),
      instructions: newCap.instructions.trim(),
      example_response: newCap.example_response.trim() || null,
      usage_count: 0,
    });
    if (!error) {
      load();
      setNewCap({ capability_name: "", trigger_pattern: "", instructions: "", example_response: "" });
      setIsDialogOpen(false);
      toast.success("Capacité créée !");
    } else { toast.error("Erreur"); }
    setIsCreating(false);
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("learned_capabilities").delete().eq("id", id);
    if (!error) { load(); toast.success("Supprimée !"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Capacités Apprises</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />Nouvelle</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Nouvelle capacité</DialogTitle>
              <DialogDescription>Définissez une compétence que l'IA pourra utiliser</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input placeholder="Ex: Humanisation de texte" value={newCap.capability_name} onChange={(e) => setNewCap({ ...newCap, capability_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Motif de déclenchement *</Label>
                <Input placeholder="Ex: humanise|rend plus humain" value={newCap.trigger_pattern} onChange={(e) => setNewCap({ ...newCap, trigger_pattern: e.target.value })} />
                <p className="text-xs text-muted-foreground">Mots-clés séparés par | (regex supporté)</p>
              </div>
              <div className="space-y-2">
                <Label>Instructions *</Label>
                <Textarea placeholder="Décrivez ce que l'IA doit faire..." value={newCap.instructions} onChange={(e) => setNewCap({ ...newCap, instructions: e.target.value })} rows={4} />
              </div>
              <div className="space-y-2">
                <Label>Exemple (optionnel)</Label>
                <Textarea placeholder="Exemple de réponse attendue..." value={newCap.example_response} onChange={(e) => setNewCap({ ...newCap, example_response: e.target.value })} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
              <Button onClick={create} disabled={isCreating}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {capabilities.map((cap) => (
                <div key={cap.id} className="p-4 rounded-lg bg-muted space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{cap.capability_name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">Déclencheur : <code className="bg-background px-1 rounded">{cap.trigger_pattern}</code></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{cap.usage_count} usage{cap.usage_count > 1 ? "s" : ""}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => del(cap.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{cap.instructions}</p>
                  <p className="text-xs text-muted-foreground">Ajouté le {new Date(cap.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
              ))}
              {capabilities.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune capacité. Cliquez sur "Nouvelle" pour en créer.</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
