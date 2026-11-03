import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Shield, UserCheck } from "lucide-react";
import { toast } from "sonner";

const ALL_TABS = [
  { id: "stats", label: "Statistiques" },
  { id: "credits", label: "Crédits" },
  { id: "blocked", label: "Blocages" },
  { id: "capabilities", label: "Capacités" },
  { id: "presentation", label: "Présentation" },
  { id: "terms", label: "Conditions" },
  { id: "ai", label: "Assistant IA" },
  { id: "accounts", label: "Comptes" },
  { id: "browser", label: "Navigation" },
  { id: "sessions", label: "Sessions" },
];

export function AdminPermissionsSection() {
  const [coCreatorTabs, setCoCreatorTabs] = useState<string[]>([]);
  const [enqueteurTabs, setEnqueteurTabs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    const [coRes, enqRes] = await Promise.all([
      supabase.from("admin_settings").select("setting_value").eq("setting_key", "cocreator_allowed_tabs").maybeSingle(),
      supabase.from("admin_settings").select("setting_value").eq("setting_key", "enqueteur_allowed_tabs").maybeSingle(),
    ]);

    // Defaults
    const defaultCoTabs = ["stats", "credits", "blocked", "capabilities", "presentation"];
    const defaultEnqTabs = ["stats", "credits", "blocked", "capabilities", "presentation", "terms", "ai", "accounts", "browser"];

    setCoCreatorTabs((coRes.data?.setting_value as any)?.tabs || defaultCoTabs);
    setEnqueteurTabs((enqRes.data?.setting_value as any)?.tabs || defaultEnqTabs);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert co-creator tabs
      await supabase.from("admin_settings").upsert({
        setting_key: "cocreator_allowed_tabs",
        setting_value: { tabs: coCreatorTabs } as any,
      }, { onConflict: "setting_key" });

      // Upsert enqueteur tabs
      await supabase.from("admin_settings").upsert({
        setting_key: "enqueteur_allowed_tabs",
        setting_value: { tabs: enqueteurTabs } as any,
      }, { onConflict: "setting_key" });

      toast.success("Permissions sauvegardées");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const toggleTab = (role: "co" | "enq", tabId: string) => {
    if (role === "co") {
      setCoCreatorTabs(prev =>
        prev.includes(tabId) ? prev.filter(t => t !== tabId) : [...prev, tabId]
      );
    } else {
      setEnqueteurTabs(prev =>
        prev.includes(tabId) ? prev.filter(t => t !== tabId) : [...prev, tabId]
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Permissions des rôles</h2>
        <p className="text-sm text-muted-foreground">
          Choisissez les onglets accessibles pour chaque rôle
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4 text-emerald-500" />
            Co-créateurs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ALL_TABS.map(tab => (
            <div key={tab.id} className="flex items-center justify-between">
              <Label htmlFor={`co-${tab.id}`} className="cursor-pointer">{tab.label}</Label>
              <Switch
                id={`co-${tab.id}`}
                checked={coCreatorTabs.includes(tab.id)}
                onCheckedChange={() => toggleTab("co", tab.id)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="w-4 h-4 text-amber-500" />
            Enquêteurs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ALL_TABS.map(tab => (
            <div key={tab.id} className="flex items-center justify-between">
              <Label htmlFor={`enq-${tab.id}`} className="cursor-pointer">{tab.label}</Label>
              <Switch
                id={`enq-${tab.id}`}
                checked={enqueteurTabs.includes(tab.id)}
                onCheckedChange={() => toggleTab("enq", tab.id)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Sauvegarder les permissions
      </Button>
    </div>
  );
}
