import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Loader2, Palette } from "lucide-react";

interface SitePresentation {
  title: string;
  subtitle: string;
  description: string;
  welcome_message: string;
  primary_color: string;
  show_features: boolean;
}

export function AdminPresentationSection() {
  const [presentation, setPresentation] = useState<SitePresentation>({
    title: "OmniAI Pro", subtitle: "IA ultra-puissante", description: "L'une des IA les plus avancées au monde.",
    welcome_message: "Bienvenue !", primary_color: "purple", show_features: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from("admin_settings").select("setting_value").eq("setting_key", "site_presentation").single();
    if (data?.setting_value) {
      const v = data.setting_value as unknown as SitePresentation;
      setPresentation({
        title: v.title || "OmniAI Pro", subtitle: v.subtitle || "IA ultra-puissante",
        description: v.description || "L'une des IA les plus avancées au monde.",
        welcome_message: v.welcome_message || "Bienvenue !",
        primary_color: v.primary_color || "purple", show_features: v.show_features !== false,
      });
    }
  };

  const save = async () => {
    setIsSaving(true);
    const { error } = await supabase.from("admin_settings").upsert({
      setting_key: "site_presentation",
      setting_value: JSON.parse(JSON.stringify(presentation)),
      updated_at: new Date().toISOString(),
    }, { onConflict: "setting_key" });
    if (!error) toast.success("Présentation sauvegardée !");
    else toast.error("Erreur");
    setIsSaving(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Présentation du Site</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5" />Personnalisation</CardTitle>
          <CardDescription>Personnalisez l'apparence et le contenu de la page d'accueil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Titre du site</Label>
              <Input value={presentation.title} onChange={(e) => setPresentation({ ...presentation, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Sous-titre</Label>
              <Input value={presentation.subtitle} onChange={(e) => setPresentation({ ...presentation, subtitle: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={presentation.description} onChange={(e) => setPresentation({ ...presentation, description: e.target.value })} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Message de bienvenue</Label>
            <Input value={presentation.welcome_message} onChange={(e) => setPresentation({ ...presentation, welcome_message: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Couleur principale</Label>
              <select className="w-full px-3 py-2 rounded-md border bg-background text-foreground" value={presentation.primary_color} onChange={(e) => setPresentation({ ...presentation, primary_color: e.target.value })}>
                <option value="purple">Violet</option>
                <option value="blue">Bleu</option>
                <option value="green">Vert</option>
                <option value="red">Rouge</option>
                <option value="orange">Orange</option>
                <option value="pink">Rose</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Afficher les fonctionnalités</Label>
              <div className="flex items-center gap-2 pt-2">
                <Switch checked={presentation.show_features} onCheckedChange={(checked) => setPresentation({ ...presentation, show_features: checked })} />
                <span className="text-sm text-muted-foreground">{presentation.show_features ? "Oui" : "Non"}</span>
              </div>
            </div>
          </div>
          <Button onClick={save} disabled={isSaving} className="w-full">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Sauvegarder
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
