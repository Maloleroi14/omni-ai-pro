import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Shield } from "lucide-react";

interface BlockedFeature {
  id: string;
  feature_name: string;
  is_blocked: boolean;
}

interface DeviceBlock {
  id: string;
  device_id: string;
  user_email: string | null;
  blocked_word: string;
  blocked_at: string;
  blocked_until: string;
  unblocked_by_admin: boolean;
}

export function AdminBlockedSection({ isCreator }: { isCreator: boolean }) {
  const [blockedFeatures, setBlockedFeatures] = useState<BlockedFeature[]>([]);
  const [newFeature, setNewFeature] = useState("");
  const [blocks, setBlocks] = useState<DeviceBlock[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(true);

  useEffect(() => {
    loadBlockedFeatures();
    if (isCreator) loadBlocks();
  }, [isCreator]);

  const loadBlockedFeatures = async () => {
    const { data } = await supabase.from("blocked_features").select("*");
    if (data) setBlockedFeatures(data);
  };

  const loadBlocks = async () => {
    setLoadingBlocks(true);
    const { data } = await supabase.from("device_blocks").select("*").eq("unblocked_by_admin", false).order("blocked_at", { ascending: false });
    if (data) setBlocks(data as unknown as DeviceBlock[]);
    setLoadingBlocks(false);
  };

  const addBlockedFeature = async () => {
    if (!newFeature.trim()) return;
    const { error } = await supabase.from("blocked_features").insert({ feature_name: newFeature.trim(), is_blocked: true });
    if (!error) { loadBlockedFeatures(); setNewFeature(""); toast.success("Mot interdit ajouté !"); }
  };

  const toggleFeature = async (id: string, isBlocked: boolean) => {
    await supabase.from("blocked_features").update({ is_blocked: !isBlocked }).eq("id", id);
    loadBlockedFeatures();
  };

  const deleteFeature = async (id: string) => {
    await supabase.from("blocked_features").delete().eq("id", id);
    loadBlockedFeatures();
  };

  const unblockDevice = async (id: string) => {
    await supabase.from("device_blocks").update({ unblocked_by_admin: true }).eq("id", id);
    loadBlocks();
    toast.success("Appareil débloqué !");
  };

  const unblockAll = async () => {
    if (blocks.length === 0) return;
    await supabase.from("device_blocks").update({ unblocked_by_admin: true }).in("id", blocks.map(b => b.id));
    loadBlocks();
    toast.success("Tous les appareils ont été débloqués !");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Blocages</h2>
      <Card>
        <CardHeader>
          <CardTitle>Mots Interdits</CardTitle>
          <CardDescription>Si un utilisateur écrit un de ces mots, son appareil sera bloqué pendant 24h</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Ex: hacking, contenu adulte..." value={newFeature} onChange={(e) => setNewFeature(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addBlockedFeature()} />
            <Button onClick={addBlockedFeature}>Ajouter</Button>
          </div>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {blockedFeatures.map((feature) => (
                <div key={feature.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className={feature.is_blocked ? "" : "line-through text-muted-foreground"}>{feature.feature_name}</span>
                  <div className="flex items-center gap-2">
                    <Switch checked={feature.is_blocked} onCheckedChange={() => toggleFeature(feature.id, feature.is_blocked)} />
                    <Button variant="ghost" size="sm" onClick={() => deleteFeature(feature.id)}>×</Button>
                  </div>
                </div>
              ))}
              {blockedFeatures.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun mot interdit</p>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {isCreator && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Appareils Bloqués
                </CardTitle>
                <CardDescription>Déblocage auto après 24h.</CardDescription>
              </div>
              {blocks.length > 0 && (
                <Button variant="destructive" size="sm" onClick={unblockAll}>Tout débloquer</Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {loadingBlocks && <p className="text-center text-muted-foreground py-4">Chargement...</p>}
                {!loadingBlocks && blocks.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun appareil bloqué</p>}
                {blocks.map((block) => (
                  <div key={block.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{block.user_email || `Appareil ${block.device_id.slice(0, 8)}...`}</p>
                      <p className="text-xs text-muted-foreground">
                        Mot : <span className="font-medium text-destructive">{block.blocked_word}</span>{" · "}{new Date(block.blocked_at).toLocaleString("fr-FR")}
                      </p>
                      <p className="text-xs text-muted-foreground">Expire : {new Date(block.blocked_until).toLocaleString("fr-FR")}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => unblockDevice(block.id)}>Débloquer</Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
