import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Construction, Loader2, Search, Users, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const CREATOR_EMAIL = "omniaiproultime@gmail.com";

type MaintenanceTarget = "all" | "specific";

interface MemberProfile {
  user_id: string;
  email: string;
  display_name: string | null;
}

export function AdminMaintenanceSection() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("Le site est en maintenance. Revenez bientôt !");
  const [showCountdown, setShowCountdown] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [target, setTarget] = useState<MaintenanceTarget>("all");
  const [targetEmails, setTargetEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [vpEmails, setVpEmails] = useState<string[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (target === "specific" && members.length === 0) {
      loadMembers();
    }
  }, [target]);

  const loadMembers = async () => {
    setMembersLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, email, display_name")
      .order("email");
    setMembers(data || []);
    setMembersLoading(false);
  };

  const loadSettings = async () => {
    const [mainRes, vpRes] = await Promise.all([
      supabase.from("admin_settings").select("setting_value").eq("setting_key", "maintenance_mode").maybeSingle(),
      supabase.from("admin_settings").select("setting_value").eq("setting_key", "vice_president_emails").maybeSingle(),
    ]);
    
    const vpList: string[] = (vpRes.data?.setting_value as any)?.emails || [];
    setVpEmails(vpList);
    
    if (mainRes.data?.setting_value) {
      const val = mainRes.data.setting_value as any;
      setEnabled(val.enabled || false);
      setMessage(val.message || "Le site est en maintenance. Revenez bientôt !");
      setShowCountdown(val.show_countdown || false);
      setEndDate(val.end_date || "");
      setTarget(val.target || "all");
      setTargetEmails(val.target_emails || []);
    }
    setLoading(false);
  };

  const toggleEmail = (email: string) => {
    setTargetEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const selectAll = () => {
    const filtered = filteredMembers.map((m) => m.email);
    setTargetEmails((prev) => [...new Set([...prev, ...filtered])]);
  };

  const deselectAll = () => {
    const filtered = new Set(filteredMembers.map((m) => m.email));
    setTargetEmails((prev) => prev.filter((e) => !filtered.has(e)));
  };

  const protectedEmails = [CREATOR_EMAIL, ...vpEmails];
  
  const filteredMembers = members.filter((m) => {
    // Never show protected users (creator + VPs)
    if (protectedEmails.includes(m.email)) return false;
    const q = memberSearch.toLowerCase();
    if (!q) return true;
    return m.email.toLowerCase().includes(q) || (m.display_name?.toLowerCase().includes(q) ?? false);
  });

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("admin_settings").upsert({
      setting_key: "maintenance_mode",
      setting_value: {
        enabled,
        message,
        show_countdown: showCountdown,
        end_date: showCountdown ? endDate : null,
        target,
        target_emails: target === "specific" ? targetEmails : [],
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: "setting_key" } as any);
    
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      const desc = target === "specific" 
        ? `Maintenance pour ${targetEmails.length} utilisateur(s)` 
        : (enabled ? "Mode maintenance activé pour tous" : "Mode maintenance désactivé");
      toast.success(desc);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Construction className="w-5 h-5" />
          Mode Maintenance
        </CardTitle>
        <CardDescription>
          Bloquer l'accès au site avec un message personnalisé
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="maintenance-toggle" className="font-medium">
            {enabled ? "🔴 Maintenance activée" : "🟢 Site en ligne"}
          </Label>
          <Switch
            id="maintenance-toggle"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && (
          <div className="space-y-4 p-3 rounded-lg border bg-muted/30">
            <div className="space-y-2">
              <Label className="font-medium">🎯 Cible du verrouillage</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={target === "all" ? "default" : "outline"}
                  onClick={() => setTarget("all")}
                >
                  Tout le monde
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={target === "specific" ? "default" : "outline"}
                  onClick={() => setTarget("specific")}
                >
                  Utilisateurs spécifiques
                </Button>
              </div>
            </div>

            {target === "specific" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    Membres ({targetEmails.length} sélectionné{targetEmails.length > 1 ? "s" : ""})
                  </Label>
                  <div className="flex gap-1.5">
                    <Button type="button" size="sm" variant="ghost" onClick={selectAll} className="text-xs h-7">
                      Tout cocher
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={deselectAll} className="text-xs h-7">
                      Tout décocher
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un membre..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>

                {membersLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="h-56 rounded-md border">
                    <div className="p-2 space-y-0.5">
                      {filteredMembers.map((m) => (
                        <label
                          key={m.user_id}
                          className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={targetEmails.includes(m.email)}
                            onCheckedChange={() => toggleEmail(m.email)}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {m.display_name || m.email}
                            </p>
                            {m.display_name && (
                              <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                            )}
                          </div>
                        </label>
                      ))}
                      {filteredMembers.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">Aucun membre trouvé</p>
                      )}
                    </div>
                  </ScrollArea>
                )}

                {targetEmails.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {targetEmails.map((email) => (
                      <Badge key={email} variant="secondary" className="text-xs">
                        {email}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Message affiché aux visiteurs</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Message de maintenance..."
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="countdown-toggle" className="font-medium">
            ⏱️ Afficher un compte à rebours
          </Label>
          <Switch
            id="countdown-toggle"
            checked={showCountdown}
            onCheckedChange={setShowCountdown}
          />
        </div>

        {showCountdown && (
          <div className="space-y-2">
            <Label>Date et heure estimée de fin</Label>
            <Input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        )}

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Sauvegarder
        </Button>

        {enabled && target === "specific" && targetEmails.length > 0 && (
          <div className="mt-4 space-y-2">
            <Label className="font-medium">🔒 Utilisateurs actuellement en maintenance</Label>
            <div className="rounded-md border divide-y">
              {targetEmails.map((email) => (
                <div key={email} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm">{email}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-7 text-xs"
                    onClick={async () => {
                      const newEmails = targetEmails.filter((e) => e !== email);
                      setTargetEmails(newEmails);
                      // Auto-save immediately
                      await supabase.from("admin_settings").upsert({
                        setting_key: "maintenance_mode",
                        setting_value: {
                          enabled,
                          message,
                          show_countdown: showCountdown,
                          end_date: showCountdown ? endDate : null,
                          target,
                          target_emails: newEmails,
                        },
                        updated_at: new Date().toISOString(),
                      }, { onConflict: "setting_key" } as any);
                      toast.success(`Maintenance retirée pour ${email}`);
                    }}
                  >
                    Retirer
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
