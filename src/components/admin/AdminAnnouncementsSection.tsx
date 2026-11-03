import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Trash2, Users, User, Send, Pencil, X, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Announcement {
  id: string; title: string; content: string; type: string; priority: string;
  target: string; target_emails: string[]; is_active: boolean; created_at: string; expires_at: string | null;
}

interface MemberProfile { user_id: string; email: string; display_name: string | null; }

const typeOptions = [
  { value: "info", label: "ℹ️ Information" },
  { value: "warning", label: "⚠️ Avertissement" },
  { value: "success", label: "✅ Succès" },
  { value: "urgent", label: "🔴 Urgent" },
  { value: "update", label: "🔄 Mise à jour" },
];
const priorityOptions = [
  { value: "low", label: "Basse" },
  { value: "normal", label: "Normale" },
  { value: "high", label: "Haute" },
];

export function AdminAnnouncementsSection() {
  const { user } = useAuthContext();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("info");
  const [priority, setPriority] = useState("normal");
  const [target, setTarget] = useState("all");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => { loadAnnouncements(); }, []);
  useEffect(() => { if (target === "specific") loadMembers(); }, [target]);

  const loadMembers = async () => {
    setLoadingMembers(true);
    const { data } = await supabase.from("profiles").select("user_id, email, display_name").order("email");
    setMembers((data as MemberProfile[]) || []);
    setLoadingMembers(false);
  };

  const loadAnnouncements = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setAnnouncements((data as any[]) || []);
  };

  const resetForm = () => {
    setTitle(""); setContent(""); setType("info"); setPriority("normal");
    setTarget("all"); setSelectedEmails([]); setScheduledAt(""); setEditingId(null); setMemberSearch("");
  };

  const startEdit = (a: Announcement) => {
    setEditingId(a.id); setTitle(a.title); setContent(a.content); setType(a.type);
    setPriority(a.priority); setTarget(a.target); setSelectedEmails(a.target_emails || []); setScheduledAt("");
    if (a.target === "specific") loadMembers();
  };

  const sendUpdateEmailToAllUsers = async (announcementTitle: string, announcementContent: string, announcementType: string = "update") => {
    try {
      const { data: allProfiles } = await supabase.from("profiles").select("email, display_name, preferred_language");
      if (!allProfiles || allProfiles.length === 0) return;

      let sent = 0;
      let failed = 0;
      for (const profile of allProfiles) {
        const lang = (profile as any).preferred_language || "fr";
        const name = profile.display_name || emailLabels[lang as keyof typeof emailLabels]?.user || "utilisateur";
        const labels = emailLabels[lang as keyof typeof emailLabels] || emailLabels.fr;
        const isUrgent = announcementType === "urgent";
        const subjectPrefix = isUrgent ? labels.urgent : labels.update;
        const templateName = isUrgent ? "urgent_announcement" : "update_announcement";

        const html = buildUpdateEmailHtml(name, announcementTitle, announcementContent, announcementType, lang);
        const { error } = await supabase.functions.invoke("send-brevo-email", {
          body: {
            to: profile.email,
            toName: name,
            subject: `${subjectPrefix} — ${announcementTitle}`,
            html,
            senderName: "Omni AI Pro",
            templateName,
          },
        });
        if (error) { failed++; console.error(`Email failed for ${profile.email}:`, error); }
        else { sent++; }
      }
      if (sent > 0) toast.success(`📧 ${sent} email(s) envoyé(s)`);
      if (failed > 0) toast.error(`${failed} email(s) échoué(s)`);
    } catch (err) {
      console.error("Error sending emails:", err);
      toast.error("Erreur lors de l'envoi des emails");
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) { toast.error("Titre et contenu requis"); return; }
    const emails = target === "specific" ? selectedEmails : [];
    if (target === "specific" && emails.length === 0) { toast.error("Sélectionnez au moins un membre"); return; }

    if (editingId) {
      const { error } = await supabase.from("announcements").update({
        title, content, type, priority, target, target_emails: emails,
      } as any).eq("id", editingId);
      if (error) toast.error("Erreur: " + error.message);
      else { toast.success("Annonce modifiée !"); resetForm(); loadAnnouncements(); }
    } else {
      const { error } = await supabase.from("announcements").insert({
        title, content, type, priority, target, target_emails: emails,
        created_by: user!.id, scheduled_at: scheduledAt || null, is_active: !scheduledAt,
      } as any);
      if (error) {
        toast.error("Erreur: " + error.message);
      } else {
        toast.success("Annonce envoyée !");
        // Auto-send email to all users for every new announcement
        sendUpdateEmailToAllUsers(title, content, type);
        resetForm();
        loadAnnouncements();
      }
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("announcements").update({ is_active: !active } as any).eq("id", id);
    loadAnnouncements();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    loadAnnouncements(); toast.success("Annonce supprimée");
    if (editingId === id) resetForm();
  };

  const toggleEmail = (email: string) => {
    setSelectedEmails(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  const filteredMembers = members.filter(m =>
    m.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
    (m.display_name || "").toLowerCase().includes(memberSearch.toLowerCase())
  );

  const getTypeBadge = (t: string) => typeOptions.find(o => o.value === t)?.label || t;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {editingId ? "Modifier l'annonce" : "Nouvelle annonce"}
          </CardTitle>
          <CardDescription>
            {editingId ? "Modifiez le contenu puis sauvegardez" : "Envoyez une notification à tous ou à des membres spécifiques"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input placeholder="Ex: Mise à jour importante..." value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea placeholder="Contenu de l'annonce..." value={content} onChange={e => setContent(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{typeOptions.map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{priorityOptions.map(o => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cible</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all"><span className="flex items-center gap-2"><Users className="w-4 h-4" /> Tout le monde</span></SelectItem>
                <SelectItem value="specific"><span className="flex items-center gap-2"><User className="w-4 h-4" /> Personnalisé</span></SelectItem>
              </SelectContent>
            </Select>
          </div>

          {target === "specific" && (
            <div className="space-y-3 border rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input placeholder="Rechercher un membre..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} className="h-8" />
              </div>
              {selectedEmails.length > 0 && (
                <p className="text-xs text-primary font-medium">{selectedEmails.length} membre(s) sélectionné(s)</p>
              )}
              {loadingMembers ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <ScrollArea className="h-48">
                  <div className="space-y-1">
                    {filteredMembers.map(m => (
                      <label key={m.user_id} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer transition-colors">
                        <Checkbox checked={selectedEmails.includes(m.email)} onCheckedChange={() => toggleEmail(m.email)} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{m.display_name || m.email.split("@")[0]}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                        </div>
                      </label>
                    ))}
                    {filteredMembers.length === 0 && <p className="text-sm text-muted-foreground text-center py-3">Aucun membre trouvé</p>}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {!editingId && (
            <div className="space-y-2">
              <Label>Planifier (optionnel)</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1">
              {editingId ? <Pencil className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {editingId ? "Sauvegarder" : "Envoyer"}
            </Button>
            {editingId && <Button variant="outline" onClick={resetForm}><X className="w-4 h-4 mr-2" /> Annuler</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Annonces envoyées ({announcements.length})</CardTitle></CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune annonce</p>
          ) : (
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className={`p-4 rounded-lg border ${a.is_active ? "bg-card" : "bg-muted/50 opacity-60"} ${editingId === a.id ? "ring-2 ring-primary" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm">{a.title}</h4>
                        <Badge variant="outline" className="text-xs">{getTypeBadge(a.type)}</Badge>
                        {a.priority === "high" && <Badge variant="destructive" className="text-xs">Haute priorité</Badge>}
                        <Badge variant={a.target === "all" ? "default" : "secondary"} className="text-xs">
                          {a.target === "all" ? "Tous" : `${a.target_emails?.length || 0} ciblé(s)`}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                      {a.target === "specific" && a.target_emails?.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1">→ {a.target_emails.join(", ")}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(a)}><Pencil className="w-4 h-4 text-muted-foreground" /></Button>
                      <Switch checked={a.is_active} onCheckedChange={() => handleToggle(a.id, a.is_active)} />
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const emailLabels = {
  fr: { urgent: "🔴 Urgent", update: "🚀 Mise à jour", greeting: "Salut", cta: "Découvrir les nouveautés →", rights: "Tous droits réservés", user: "utilisateur" },
  en: { urgent: "🔴 Urgent", update: "🚀 Update", greeting: "Hi", cta: "Discover what's new →", rights: "All rights reserved", user: "user" },
  es: { urgent: "🔴 Urgente", update: "🚀 Actualización", greeting: "Hola", cta: "Descubre las novedades →", rights: "Todos los derechos reservados", user: "usuario" },
  ar: { urgent: "🔴 عاجل", update: "🚀 تحديث", greeting: "مرحباً", cta: "اكتشف الجديد ←", rights: "جميع الحقوق محفوظة", user: "مستخدم" },
};

function buildUpdateEmailHtml(name: string, title: string, content: string, type: string = "update", lang: string = "fr"): string {
  const isUrgent = type === "urgent";
  const labels = emailLabels[lang as keyof typeof emailLabels] || emailLabels.fr;
  const headerEmoji = isUrgent ? labels.urgent : labels.update;
  const headerGradient = isUrgent ? "linear-gradient(135deg,#dc2626,#ef4444)" : "linear-gradient(135deg,#6c3bfa,#8b5cf6)";
  const titleColor = isUrgent ? "#dc2626" : "#6c3bfa";
  const dir = lang === "ar" ? "rtl" : "ltr";
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeName = esc(name);
  const safeTitle = esc(title);
  const safeContent = esc(content).replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f0f1f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;direction:${dir};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f1f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:${headerGradient};padding:40px 32px;text-align:center;">
          <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;">${headerEmoji}</h1>
          <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">Omni AI Pro</p>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <h2 style="margin:0 0 16px;font-size:22px;color:#1e1b3a;font-weight:700;">${labels.greeting} ${safeName} 👋</h2>
          <h3 style="margin:0 0 12px;font-size:18px;color:${titleColor};font-weight:600;">${safeTitle}</h3>
          <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#4a4568;">${safeContent}</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:16px 0 8px;">
              <a href="https://www.omni-ai-pro.com" style="display:inline-block;background:linear-gradient(135deg,#6c3bfa,#8b5cf6);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:600;">
                ${labels.cta}
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 32px;background:#f8f7ff;text-align:center;border-top:1px solid #e9e5f5;">
          <p style="margin:0;font-size:12px;color:#9b95b0;">© ${new Date().getFullYear()} Omni AI Pro — ${labels.rights}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
