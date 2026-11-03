import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Mail, Send, RefreshCw, Loader2, Users, Eye, EyeOff, UserPlus, Plus, X } from "lucide-react";

type EmailLog = {
  id: string;
  to_email: string;
  subject: string;
  status: string;
  template_name: string;
  created_at: string;
  message_id: string;
};

type UserProfile = {
  user_id: string;
  email: string;
  display_name: string | null;
  last_visit: string | null;
};

export function AdminEmailsSection() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"logs" | "send" | "invite">("logs");
  const [showPreview, setShowPreview] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [inviteName, setInviteName] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  // Templates
  const templates = [
    {
      id: "rappel",
      label: "📩 Rappel",
      subject: "Tu nous manques sur Omni AI Pro ! ✨",
      title: "Salut {name} 👋",
      body: "Ça fait quelques jours qu'on ne t'a pas vu sur Omni AI Pro ! Ton assistant IA t'attend avec de nouvelles capacités.",
      cta: "Revenir sur Omni AI Pro →",
    },
    {
      id: "promo",
      label: "🎁 Promotion",
      subject: "{name}, une offre spéciale t'attend sur Omni AI Pro !",
      title: "Offre exclusive pour toi {name} 🎉",
      body: "Pour te remercier de ta fidélité, on t'offre une surprise sur Omni AI Pro. Connecte-toi vite pour en profiter avant qu'il ne soit trop tard !",
      cta: "Découvrir mon offre →",
    },
    {
      id: "update",
      label: "🚀 Mise à jour",
      subject: "Nouveautés sur Omni AI Pro — {name}, découvre ce qui a changé !",
      title: "Du nouveau sur Omni AI Pro 🚀",
      body: "On a travaillé dur pour t'offrir de nouvelles fonctionnalités ! Viens découvrir les dernières améliorations et dis-nous ce que tu en penses.",
      cta: "Voir les nouveautés →",
    },
  ];

  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].id);
  const [emailSubject, setEmailSubject] = useState(templates[0].subject);
  const [emailTitle, setEmailTitle] = useState(templates[0].title);
  const [emailBody, setEmailBody] = useState(templates[0].body);
  const [emailCta, setEmailCta] = useState(templates[0].cta);

  const applyTemplate = (id: string) => {
    const t = templates.find(t => t.id === id);
    if (!t) return;
    setSelectedTemplate(id);
    setEmailSubject(t.subject);
    setEmailTitle(t.title);
    setEmailBody(t.body);
    setEmailCta(t.cta);
  };

  const loadData = async () => {
    setLoading(true);
    const [logsRes, usersRes] = await Promise.all([
      supabase
        .from("email_send_log")
        .select("id, to_email, subject, status, template_name, created_at, message_id")
        .eq("template_name", "reengagement")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("profiles").select("user_id, email, display_name"),
    ]);

    setLogs((logsRes.data as any[]) || []);

    const profiles = usersRes.data || [];
    const enriched: UserProfile[] = [];
    for (const p of profiles) {
      const { data: cl } = await supabase
        .from("connection_logs")
        .select("logged_in_at")
        .eq("user_id", p.user_id)
        .order("logged_in_at", { ascending: false })
        .limit(1);
      enriched.push({
        ...p,
        last_visit: cl?.[0]?.logged_in_at || null,
      });
    }
    setUsers(enriched);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.user_id)));
    }
  };

  const addInviteEmail = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@(gmail\.com|hotmail\.com|outlook\.com|lfizurich\.ch)$/i.test(email)) {
      toast.error("Seuls les domaines @gmail.com, @hotmail.com, @outlook.com et @lfizurich.ch sont autorisés");
      return;
    }
    if (users.some(u => u.email.toLowerCase() === email)) {
      toast.error("Cet utilisateur est déjà inscrit ! Utilise l'onglet 'Envoyer manuellement'");
      return;
    }
    if (inviteEmails.includes(email)) {
      toast.error("Cette adresse est déjà dans la liste");
      return;
    }
    setInviteEmails(prev => [...prev, email]);
    setInviteEmail("");
  };

  const removeInviteEmail = (email: string) => {
    setInviteEmails(prev => prev.filter(e => e !== email));
  };

  const sendInvites = async () => {
    if (inviteEmails.length === 0) {
      toast.error("Ajoute au moins une adresse email");
      return;
    }
    setSendingInvite(true);
    try {
      for (const email of inviteEmails) {
        const name = inviteName.trim() || email.split("@")[0];
        const html = buildInviteEmailHtml(name);
        const { error } = await supabase.functions.invoke("send-brevo-email", {
          body: {
            to: email,
            toName: name,
            subject: `${name}, découvre Omni AI Pro — Ton assistant IA ultime ! 🚀`,
            html,
            senderName: "Omni AI Pro",
            templateName: "admin_invite",
          },
        });
        if (error) console.error(`Erreur pour ${email}:`, error);
      }
      toast.success(`${inviteEmails.length} invitation(s) envoyée(s) avec succès ✅`);
      setInviteEmails([]);
      setInviteName("");
      setTimeout(loadData, 2000);
    } catch {
      toast.error("Erreur lors de l'envoi des invitations");
    } finally {
      setSendingInvite(false);
    }
  };

  const sanitize = (text: string) => {
    return text.replace(/[<>]/g, "").slice(0, 1000);
  };

  const sendToSelected = async () => {
    if (selectedUsers.size === 0) {
      toast.error("Sélectionne au moins un utilisateur");
      return;
    }
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Le sujet et le contenu sont obligatoires");
      return;
    }

    setSending(true);
    try {
      const selectedProfiles = users.filter(u => selectedUsers.has(u.user_id));

      for (const profile of selectedProfiles) {
        const name = profile.display_name || "utilisateur";
        const personalizedTitle = sanitize(emailTitle.replace(/\{name\}/g, name));
        const personalizedSubject = sanitize(emailSubject.replace(/\{name\}/g, name));
        const personalizedBody = sanitize(emailBody.replace(/\{name\}/g, name));
        const personalizedCta = sanitize(emailCta.replace(/\{name\}/g, name));

        const html = buildCustomEmailHtml(personalizedTitle, personalizedBody, personalizedCta);

        const { error } = await supabase.functions.invoke("send-brevo-email", {
          body: {
            to: profile.email,
            toName: name,
            subject: personalizedSubject,
            html,
            senderName: "Omni AI Pro",
            templateName: "admin_manual",
          },
        });

        if (error) {
          console.error(`Erreur pour ${profile.email}:`, error);
        }
      }

      toast.success(`${selectedProfiles.length} email(s) envoyé(s) avec succès ✅`);
      setSelectedUsers(new Set());
      setTimeout(loadData, 2000);
    } catch (err) {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "En attente", variant: "outline" },
      sent: { label: "Envoyé", variant: "default" },
      failed: { label: "Échoué", variant: "destructive" },
      dlq: { label: "Échec final", variant: "destructive" },
    };
    const info = map[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  };

  const daysSince = (date: string | null) => {
    if (!date) return "Jamais";
    const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Hier";
    return `Il y a ${days}j`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Emails de rappel</h1>
            <p className="text-sm text-muted-foreground">Gestion des emails de ré-engagement</p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "logs" ? "default" : "outline"} size="sm" onClick={() => setTab("logs")}>
          <Mail className="w-4 h-4 mr-2" />
          Historique ({logs.length})
        </Button>
        <Button variant={tab === "send" ? "default" : "outline"} size="sm" onClick={() => setTab("send")}>
          <Users className="w-4 h-4 mr-2" />
          Envoyer manuellement
        </Button>
        <Button variant={tab === "invite" ? "default" : "outline"} size="sm" onClick={() => setTab("invite")}>
          <UserPlus className="w-4 h-4 mr-2" />
          Inviter quelqu'un
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : tab === "logs" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Emails envoyés</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun email de rappel envoyé pour le moment
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Destinataire</TableHead>
                      <TableHead>Sujet</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium text-sm">{log.to_email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{log.subject}</TableCell>
                        <TableCell>{statusBadge(log.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : tab === "send" ? (
        <div className="space-y-4">
          {/* Email composer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">✏️ Composer l'email</CardTitle>
              <p className="text-xs text-muted-foreground">Utilise <code className="bg-muted px-1 rounded">{"{name}"}</code> pour insérer le prénom de l'utilisateur</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template selector */}
              <div className="space-y-2">
                <Label>Template</Label>
                <div className="flex gap-2 flex-wrap">
                  {templates.map((t) => (
                    <Button
                      key={t.id}
                      variant={selectedTemplate === t.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => applyTemplate(t.id)}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sujet de l'email</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Ex: Tu nous manques sur Omni AI Pro !"
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label>Titre (dans l'email)</Label>
                <Input
                  value={emailTitle}
                  onChange={(e) => setEmailTitle(e.target.value)}
                  placeholder="Ex: Salut {name} 👋"
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label>Contenu du message</Label>
                <Textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Écris ton message ici..."
                  className="min-h-[100px]"
                  maxLength={1000}
                />
              </div>
              <div className="space-y-2">
                <Label>Texte du bouton</Label>
                <Input
                  value={emailCta}
                  onChange={(e) => setEmailCta(e.target.value)}
                  placeholder="Ex: Revenir sur Omni AI Pro →"
                  maxLength={100}
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showPreview ? "Masquer l'aperçu" : "Aperçu"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live preview */}
          {showPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">👁️ Aperçu en temps réel</CardTitle>
                <p className="text-xs text-muted-foreground">Sujet : {emailSubject.replace(/\{name\}/g, "Jean")}</p>
              </CardHeader>
              <CardContent>
                <div className="border rounded-xl overflow-hidden bg-muted/30">
                  <iframe
                    srcDoc={buildCustomEmailHtml(
                      emailTitle.replace(/\{name\}/g, "Jean"),
                      emailBody.replace(/\{name\}/g, "Jean"),
                      emailCta.replace(/\{name\}/g, "Jean")
                    )}
                    className="w-full border-0"
                    style={{ height: "500px" }}
                    title="Aperçu email"
                    sandbox=""
                  />
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Sélectionner des utilisateurs</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    {selectedUsers.size === users.length ? "Tout désélectionner" : "Tout sélectionner"}
                  </Button>
                  <Button size="sm" onClick={sendToSelected} disabled={sending || selectedUsers.size === 0}>
                    {sending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Envoyer ({selectedUsers.size})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Dernière visite</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow
                        key={u.user_id}
                        className="cursor-pointer"
                        onClick={() => toggleUser(u.user_id)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(u.user_id)}
                            onCheckedChange={() => toggleUser(u.user_id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {u.display_name || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.email}
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant={u.last_visit ? "secondary" : "outline"}>
                            {daysSince(u.last_visit)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : tab === "invite" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🎯 Inviter un nouveau utilisateur</CardTitle>
              <p className="text-xs text-muted-foreground">Envoie un email promotionnel à quelqu'un qui n'est pas encore inscrit</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nom (optionnel)</Label>
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ex: Jean, Marie..."
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Adresse email</Label>
                <div className="flex gap-2">
                  <Input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="exemple@gmail.com"
                    maxLength={200}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInviteEmail())}
                  />
                  <Button variant="outline" size="icon" onClick={addInviteEmail}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Domaines autorisés : @gmail.com, @hotmail.com, @outlook.com, @lfizurich.ch</p>
              </div>

              {inviteEmails.length > 0 && (
                <div className="space-y-2">
                  <Label>Destinataires ({inviteEmails.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {inviteEmails.map((email) => (
                      <Badge key={email} variant="secondary" className="flex items-center gap-1 py-1 px-3">
                        {email}
                        <button onClick={() => removeInviteEmail(email)} className="ml-1 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button onClick={sendInvites} disabled={sendingInvite || inviteEmails.length === 0}>
                  {sendingInvite ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Envoyer {inviteEmails.length > 0 ? `(${inviteEmails.length})` : ""}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Invite preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">👁️ Aperçu de l'invitation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-xl overflow-hidden bg-muted/30">
                <iframe
                  srcDoc={buildInviteEmailHtml(inviteName.trim() || "Ami")}
                  className="w-full border-0"
                  style={{ height: "550px" }}
                  title="Aperçu invitation"
                  sandbox=""
                />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function buildCustomEmailHtml(title: string, body: string, cta: string): string {
  // Escape HTML entities for safety
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeTitle = esc(title);
  const safeBody = esc(body).replace(/\n/g, "<br>");
  const safeCta = esc(cta);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f0f1f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f1f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#6c3bfa,#8b5cf6);padding:40px 32px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;">✨ Omni AI Pro</h1>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">Ton assistant IA intelligent</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="margin:0 0 16px;font-size:22px;color:#1e1b3a;font-weight:700;">${safeTitle}</h2>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#4a4568;">
                ${safeBody}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:16px 0 8px;">
                    <a href="https://www.omni-ai-pro.com"
                       style="display:inline-block;background:linear-gradient(135deg,#6c3bfa,#8b5cf6);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:600;">
                      ${safeCta}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background:#f8f7ff;text-align:center;border-top:1px solid #e9e5f5;">
              <p style="margin:0;font-size:12px;color:#9b95b0;">© ${new Date().getFullYear()} Omni AI Pro — Tous droits réservés</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildInviteEmailHtml(name: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeName = esc(name);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f0f1f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f1f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#6c3bfa,#8b5cf6);padding:40px 32px;text-align:center;">
              <h1 style="margin:0;font-size:32px;font-weight:800;color:#ffffff;">✨ Omni AI Pro</h1>
              <p style="margin:8px 0 0;font-size:15px;color:rgba(255,255,255,0.9);">L'assistant IA le plus puissant</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="margin:0 0 16px;font-size:24px;color:#1e1b3a;font-weight:700;">Salut ${safeName} 👋</h2>
              <p style="margin:0 0 12px;font-size:16px;line-height:1.7;color:#4a4568;">
                On a pensé à toi ! <strong>Omni AI Pro</strong> est un assistant IA révolutionnaire qui peut t'aider dans toutes tes tâches quotidiennes :
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 24px;">
                <tr>
                  <td style="padding:8px 0;font-size:15px;color:#4a4568;">🤖 <strong>Chat IA intelligent</strong> — Pose n'importe quelle question</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:15px;color:#4a4568;">🌐 <strong>Création de sites web</strong> — Génère des sites en un clic</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:15px;color:#4a4568;">🎨 <strong>Personnalisation totale</strong> — Thèmes, personas et plus</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:15px;color:#4a4568;">🔒 <strong>100% sécurisé</strong> — Tes données restent privées</td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#4a4568;">
                Rejoins notre communauté et profite de <strong>crédits gratuits</strong> dès ton inscription ! 🎁
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0;">
                    <a href="https://www.omni-ai-pro.com"
                       style="display:inline-block;background:linear-gradient(135deg,#6c3bfa,#8b5cf6);color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:12px;font-size:17px;font-weight:700;box-shadow:0 4px 16px rgba(108,59,250,0.3);">
                      🚀 Créer mon compte gratuitement
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background:#f8f7ff;text-align:center;border-top:1px solid #e9e5f5;">
              <p style="margin:0 0 4px;font-size:13px;color:#6c3bfa;font-weight:600;">Omni AI Pro — Ton assistant IA intelligent</p>
              <p style="margin:0;font-size:11px;color:#9b95b0;">© ${new Date().getFullYear()} Omni AI Pro — Tous droits réservés</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
