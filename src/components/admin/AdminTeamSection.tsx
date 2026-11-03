import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Loader2, Sparkles, Plus, Trash2, Search as SearchIcon, Crown } from "lucide-react";

export function AdminTeamSection() {
  const [adminEmailsText, setAdminEmailsText] = useState("");
  const [coCreatorEmails, setCoCreatorEmails] = useState<string[]>([]);
  const [newCoCreatorEmail, setNewCoCreatorEmail] = useState("");
  const [vpEmails, setVpEmails] = useState<string[]>([]);
  const [newVpEmail, setNewVpEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingCoCreator, setIsSavingCoCreator] = useState(false);
  const [isSavingVP, setIsSavingVP] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [adminRes, coCreatorRes, vpRes] = await Promise.all([
      supabase.from("admin_settings").select("setting_value").eq("setting_key", "admin_emails").single(),
      supabase.from("admin_settings").select("setting_value").eq("setting_key", "co_creator_email").single(),
      supabase.from("admin_settings").select("setting_value").eq("setting_key", "vice_president_emails").single(),
    ]);
    if (adminRes.data?.setting_value) {
      setAdminEmailsText((adminRes.data.setting_value as unknown as string[]).join("\n"));
    }
    if (coCreatorRes.data?.setting_value) {
      setCoCreatorEmails((coCreatorRes.data.setting_value as any)?.emails || []);
    }
    if (vpRes.data?.setting_value) {
      setVpEmails((vpRes.data.setting_value as any)?.emails || []);
    }
  };

  const saveAdminEmails = async () => {
    setIsSaving(true);
    const emails = adminEmailsText.split("\n").map(e => e.trim()).filter(e => e);
    await supabase.from("admin_settings").update({ setting_value: JSON.parse(JSON.stringify(emails)) }).eq("setting_key", "admin_emails");
    setIsSaving(false);
    toast.success("Emails sauvegardés !");
  };

  const saveCoCreators = async (emails: string[]) => {
    setIsSavingCoCreator(true);
    const { error } = await supabase.from("admin_settings").upsert({
      setting_key: "co_creator_email",
      setting_value: JSON.parse(JSON.stringify({ emails })),
      updated_at: new Date().toISOString(),
    }, { onConflict: "setting_key" });
    if (!error) {
      setCoCreatorEmails(emails);
      toast.success("Co-créateurs sauvegardés !");
    } else {
      toast.error("Erreur lors de la sauvegarde");
    }
    setIsSavingCoCreator(false);
  };

  const addCoCreator = () => {
    const email = newCoCreatorEmail.trim().toLowerCase();
    if (!email) return;
    if (coCreatorEmails.includes(email)) { toast.error("Déjà ajouté"); return; }
    saveCoCreators([...coCreatorEmails, email]);
    setNewCoCreatorEmail("");
  };

  const saveVPs = async (emails: string[]) => {
    setIsSavingVP(true);
    const { error } = await supabase.from("admin_settings").upsert({
      setting_key: "vice_president_emails",
      setting_value: JSON.parse(JSON.stringify({ emails })),
      updated_at: new Date().toISOString(),
    }, { onConflict: "setting_key" });
    if (!error) {
      setVpEmails(emails);
      toast.success("Vice-Présidents sauvegardés !");
    } else {
      toast.error("Erreur lors de la sauvegarde");
    }
    setIsSavingVP(false);
  };

  const addVP = () => {
    const email = newVpEmail.trim().toLowerCase();
    if (!email) return;
    if (vpEmails.includes(email)) { toast.error("Déjà ajouté"); return; }
    saveVPs([...vpEmails, email]);
    setNewVpEmail("");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Gestion de l'Équipe</h2>
      <Card>
        <CardHeader>
          <CardTitle>Emails Administrateurs</CardTitle>
          <CardDescription>Ces emails recevront automatiquement le rôle admin à l'inscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea placeholder="Un email par ligne" value={adminEmailsText} onChange={(e) => setAdminEmailsText(e.target.value)} rows={5} />
          <Button onClick={saveAdminEmails} disabled={isSaving} className="w-full">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Sauvegarder
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Co-créateurs
          </CardTitle>
          <CardDescription>Ils auront accès à la section Blocages du panel admin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="exemple@gmail.com"
              value={newCoCreatorEmail}
              onChange={(e) => setNewCoCreatorEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCoCreator()}
            />
            <Button onClick={addCoCreator} disabled={isSavingCoCreator} size="icon">
              {isSavingCoCreator ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
          {coCreatorEmails.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun co-créateur ajouté</p>
          ) : (
            <div className="space-y-2">
              {coCreatorEmails.map((email) => (
                <div key={email} className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
                  <span className="text-sm">{email}</span>
                  <Button variant="ghost" size="icon" onClick={() => saveCoCreators(coCreatorEmails.filter(e => e !== email))} className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-purple-500" />
            Vice-Présidents
          </CardTitle>
          <CardDescription>
            Même accès que les enquêteurs + crédits illimités. Si le créateur ne se connecte pas avant 8h30, ils obtiennent temporairement tous les pouvoirs du créateur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="vicepresident@gmail.com"
              value={newVpEmail}
              onChange={(e) => setNewVpEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addVP()}
            />
            <Button onClick={addVP} disabled={isSavingVP} size="icon">
              {isSavingVP ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
          {vpEmails.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun vice-président ajouté</p>
          ) : (
            <div className="space-y-2">
              {vpEmails.map((email) => (
                <div key={email} className="flex items-center justify-between p-2 rounded-lg border bg-purple-500/10">
                  <span className="text-sm">{email}</span>
                  <Button variant="ghost" size="icon" onClick={() => saveVPs(vpEmails.filter(e => e !== email))} className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
