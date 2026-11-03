import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Megaphone, Plus, Trash2, Users, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Ad {
  id: string;
  content: string;
  target_user_id: string | null;
  target_email?: string;
  is_active: boolean;
  created_at: string;
}

export function AdminAdsSection() {
  const { user } = useAuthContext();
  const [ads, setAds] = useState<Ad[]>([]);
  const [newContent, setNewContent] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [isPersonalized, setIsPersonalized] = useState(false);

  useEffect(() => { loadAds(); }, []);

  const loadAds = async () => {
    const { data } = await supabase
      .from("user_ads")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) { setAds([]); return; }

    // Resolve target emails
    const adsWithEmails: Ad[] = [];
    for (const ad of data) {
      let targetEmail = "";
      if (ad.target_user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", ad.target_user_id)
          .single();
        targetEmail = profile?.email || "Inconnu";
      }
      adsWithEmails.push({ ...ad, target_email: targetEmail });
    }
    setAds(adsWithEmails);
  };

  const addAd = async () => {
    if (!newContent.trim() || !user) return;

    let targetUserId: string | null = null;

    if (isPersonalized && targetEmail.trim()) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", targetEmail.trim())
        .single();
      if (!profile) {
        toast.error("Utilisateur introuvable avec cet email");
        return;
      }
      targetUserId = profile.user_id;
    }

    const { error } = await supabase.from("user_ads").insert({
      created_by: user.id,
      content: newContent.trim(),
      target_user_id: targetUserId,
      is_active: true,
    });

    if (error) { toast.error("Erreur: " + error.message); return; }
    toast.success("Pub ajoutée !");
    setNewContent("");
    setTargetEmail("");
    setIsPersonalized(false);
    loadAds();
  };

  const toggleAd = async (id: string, active: boolean) => {
    await supabase.from("user_ads").update({ is_active: active }).eq("id", id);
    loadAds();
  };

  const deleteAd = async (id: string) => {
    await supabase.from("user_ads").delete().eq("id", id);
    loadAds();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            Gestion des Publicités
          </CardTitle>
          <CardDescription>
            Ajoutez des pubs visibles par les utilisateurs standards (pas les créateurs/enquêteurs). Elles s'affichent au-dessus des post-its.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new ad */}
          <div className="space-y-3 p-4 border rounded-lg">
            <h4 className="text-sm font-semibold">Nouvelle publicité</h4>
            <Textarea
              placeholder="Contenu de la pub..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <div className="flex items-center gap-3">
              <Switch
                checked={isPersonalized}
                onCheckedChange={setIsPersonalized}
                id="personalized"
              />
              <Label htmlFor="personalized" className="text-sm">Personnalisée (pour un utilisateur spécifique)</Label>
            </div>
            {isPersonalized && (
              <Input
                placeholder="Email de l'utilisateur ciblé..."
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
              />
            )}
            <Button onClick={addAd} disabled={!newContent.trim()} className="gap-2">
              <Plus className="w-4 h-4" /> Ajouter la pub
            </Button>
          </div>

          {/* Existing ads */}
          {ads.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune publicité pour le moment.</p>
          )}
          {ads.map((ad) => (
            <div key={ad.id} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {ad.target_user_id ? (
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {ad.target_email}</span>
                  ) : (
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Tous les utilisateurs</span>
                  )}
                  <span>•</span>
                  <span>{new Date(ad.created_at).toLocaleDateString("fr-FR")}</span>
                </div>
                <p className="text-sm">{ad.content}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={ad.is_active}
                  onCheckedChange={(v) => toggleAd(ad.id, v)}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteAd(ad.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
