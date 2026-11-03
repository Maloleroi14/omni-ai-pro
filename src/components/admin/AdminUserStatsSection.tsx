import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search, Loader2, User, Coins, Shield, Brain, FolderCode,
  MessageSquare, Calendar, Mail, Clock, Gift, RefreshCw,
  Ban, ShieldAlert, Key, Pencil, Check, X, ChevronRight,
  Image, BarChart3, ArrowLeft
} from "lucide-react";

interface UserListItem {
  user_id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  credits: number;
  isBanned: boolean;
  roles: string[];
}

export function AdminUserStatsSection() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [profilesRes, creditsRes, rolesRes, bannedRes] = await Promise.all([
        supabase.from("profiles").select("user_id, email, display_name, created_at"),
        supabase.from("user_credits").select("user_id, credits"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("banned_users").select("user_id"),
      ]);

      const creditsMap = new Map((creditsRes.data || []).map(c => [c.user_id, c.credits]));
      const bannedSet = new Set((bannedRes.data || []).map(b => b.user_id));
      const rolesMap = new Map<string, string[]>();
      (rolesRes.data || []).forEach(r => {
        const existing = rolesMap.get(r.user_id) || [];
        existing.push(r.role);
        rolesMap.set(r.user_id, existing);
      });

      const list: UserListItem[] = (profilesRes.data || []).map(p => ({
        user_id: p.user_id,
        email: p.email,
        display_name: p.display_name,
        created_at: p.created_at,
        credits: creditsMap.get(p.user_id) ?? 0,
        isBanned: bannedSet.has(p.user_id),
        roles: rolesMap.get(p.user_id) || [],
      }));

      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setUsers(list);
    } catch {
      toast.error("Erreur lors du chargement");
    }
    setLoading(false);
  };

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (roles: string[]) => {
    if (roles.includes("admin")) return <Badge variant="destructive" className="text-[10px] h-5">Admin</Badge>;
    if (roles.includes("vice_president")) return <Badge className="text-[10px] h-5 bg-emerald-600">VP</Badge>;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedUserId) {
    return (
      <UserDetailPanel
        userId={selectedUserId}
        onBack={() => { setSelectedUserId(null); loadUsers(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Utilisateurs
          </h2>
          <p className="text-sm text-muted-foreground">{users.length} compte{users.length > 1 ? "s" : ""}</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadUsers} className="gap-1">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un utilisateur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-1">
          {filtered.map(u => (
            <button
              key={u.user_id}
              onClick={() => setSelectedUserId(u.user_id)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{u.display_name || u.email.split("@")[0]}</p>
                  {getRoleBadge(u.roles)}
                  {u.isBanned && <Badge variant="destructive" className="text-[10px] h-5">Banni</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <div className="text-right shrink-0 hidden sm:block">
                <p className="text-sm font-medium">{u.credits >= 999999 ? "∞" : u.credits}</p>
                <p className="text-[10px] text-muted-foreground">crédits</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Aucun utilisateur trouvé</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── User Detail Panel ────────────────────────────────

interface UserDetailPanelProps {
  userId: string;
  onBack: () => void;
}

function UserDetailPanel({ userId, onBack }: UserDetailPanelProps) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [credits, setCredits] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [isBanned, setIsBanned] = useState(false);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);
  const [storedPassword, setStoredPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [creditsToAdd, setCreditsToAdd] = useState(10);
  const [addingCredits, setAddingCredits] = useState(false);

  // Inline editing
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, creditsRes, rolesRes, memoriesRes, projectsRes, convsRes, bannedRes, userInfoRes, passwordRes] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", userId).single(),
          supabase.from("user_credits").select("*").eq("user_id", userId).single(),
          supabase.from("user_roles").select("*").eq("user_id", userId),
          supabase.from("user_memories").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
          supabase.from("user_projects").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
          supabase.from("conversations").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
          supabase.from("banned_users").select("user_id").eq("user_id", userId).maybeSingle(),
          (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const { data } = await supabase.functions.invoke("impersonate-user", {
              body: { action: "get_user_info", target_user_id: userId },
              headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            return data;
          })(),
          supabase.from("user_passwords" as any).select("password_plain").eq("user_id", userId).maybeSingle(),
        ]);

      if (profileRes.data) { setProfile(profileRes.data); setNewEmail(profileRes.data.email); }
      if (creditsRes.data) setCredits(creditsRes.data);
      if (rolesRes.data) setRoles(rolesRes.data);
      if (memoriesRes.data) setMemories(memoriesRes.data);
      if (projectsRes.data) setProjects(projectsRes.data);
      if (convsRes.data) setConversations(convsRes.data);
      setIsBanned(!!bannedRes.data);
      if (userInfoRes?.last_sign_in_at) setLastSignIn(userInfoRes.last_sign_in_at);
      setStoredPassword((passwordRes as any)?.data?.password_plain || null);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const addCredits = async () => {
    if (!credits || creditsToAdd <= 0) return;
    setAddingCredits(true);
    const newCreds = credits.credits + creditsToAdd;
    const { error } = await supabase.from("user_credits").update({ credits: newCreds }).eq("user_id", userId);
    if (!error) {
      setCredits({ ...credits, credits: newCreds });
      toast.success(`${creditsToAdd} crédits ajoutés`);
    } else toast.error("Erreur");
    setAddingCredits(false);
  };

  const saveEmail = async () => {
    if (!newEmail.trim() || newEmail === profile?.email) { setEditingEmail(false); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("impersonate-user", {
        body: { action: "update_email", target_user_id: userId, new_email: newEmail.trim() },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error || data?.error) throw new Error(data?.error || "Erreur");
      setProfile({ ...profile, email: newEmail.trim() });
      toast.success("Email mis à jour");
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
    setSaving(false);
    setEditingEmail(false);
  };

  const savePassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      toast.error("Le mot de passe doit faire au moins 6 caractères");
      return;
    }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("impersonate-user", {
        body: { action: "update_password", target_user_id: userId, new_password: newPassword },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error || data?.error) throw new Error(data?.error || "Erreur");
      toast.success("Mot de passe mis à jour");
      setStoredPassword(newPassword);
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
    setSaving(false);
    setEditingPassword(false);
    setNewPassword("");
  };

  const handleBan = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (isBanned) {
      await supabase.from("banned_users").delete().eq("user_id", userId);
      setIsBanned(false);
      toast.success("Utilisateur débanni");
    } else {
      await supabase.from("banned_users").upsert(
        { user_id: userId, banned_by: session?.user?.id || "", reason: "Banni par l'administrateur" } as any,
        { onConflict: "user_id" }
      );
      setIsBanned(true);
      toast.success("Utilisateur banni");
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return <p className="text-center text-muted-foreground py-8">Profil non trouvé</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold">{profile.display_name || profile.email}</h2>
          {isBanned && <Badge variant="destructive" className="text-xs">Banni</Badge>}
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="gap-1">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-250px)]">
        <div className="space-y-4 pr-2">
          {/* Profile Info with inline editing */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4" /> Profil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {/* Email - double tap to edit */}
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                {editingEmail ? (
                  <div className="flex-1 flex items-center gap-1">
                    <Input
                      ref={emailRef}
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="h-7 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && saveEmail()}
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={saveEmail} disabled={saving} className="h-7 w-7 p-0">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-green-500" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingEmail(false); setNewEmail(profile.email); }} className="h-7 w-7 p-0">
                      <X className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <span
                    className="font-medium cursor-pointer hover:text-primary transition-colors flex items-center gap-1"
                    onDoubleClick={() => setEditingEmail(true)}
                    title="Double-cliquez pour modifier"
                  >
                    {profile.email}
                    <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </span>
                )}
              </div>

              {/* Password - double tap to edit */}
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                {editingPassword ? (
                  <div className="flex-1 flex items-center gap-1">
                    <Input
                      ref={passwordRef}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nouveau mot de passe"
                      type="text"
                      className="h-7 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && savePassword()}
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={savePassword} disabled={saving} className="h-7 w-7 p-0">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-green-500" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingPassword(false); setNewPassword(""); }} className="h-7 w-7 p-0">
                      <X className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className="text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                      onDoubleClick={() => setEditingPassword(true)}
                      title="Double-cliquez pour modifier le mot de passe"
                    >
                      {showPassword && storedPassword ? storedPassword : "••••••••"}
                    </span>
                    {storedPassword && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowPassword(!showPassword)}
                        className="h-6 px-2 text-[10px]"
                      >
                        {showPassword ? "Masquer" : "Voir"}
                      </Button>
                    )}
                    {!storedPassword && (
                      <span className="text-[10px] text-muted-foreground italic">Non enregistré</span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{profile.display_name || "Sans pseudo"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Inscrit le {formatDate(profile.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Dernière connexion : {lastSignIn ? formatDate(lastSignIn) : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={isBanned ? "outline" : "destructive"}
                onClick={handleBan}
                className="gap-1"
              >
                <Ban className="w-3 h-3" />
                {isBanned ? "Débannir" : "Bannir"}
              </Button>
            </CardContent>
          </Card>

          {/* Credits */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Coins className="w-4 h-4" /> Crédits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {credits ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">
                      {credits.credits >= 999999 ? "∞" : credits.credits}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Reset : {formatDate(credits.last_reset)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex gap-2">
                    <Input type="number" min={1} value={creditsToAdd} onChange={(e) => setCreditsToAdd(parseInt(e.target.value) || 0)} className="h-8" />
                    <Button size="sm" onClick={addCredits} disabled={addingCredits || creditsToAdd <= 0} className="gap-1">
                      {addingCredits ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gift className="w-3 h-3" />}
                      Ajouter
                    </Button>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {[5, 10, 25, 50, 100, -1].map((a) => (
                      <Button key={a} variant="outline" size="sm" className="h-6 text-xs px-2"
                        onClick={() => {
                          if (a === -1) {
                            supabase.from("user_credits").update({ credits: 999999 }).eq("user_id", userId).then(() => {
                              setCredits({ ...credits, credits: 999999 });
                              toast.success("Crédits illimités activés");
                            });
                          } else setCreditsToAdd(a);
                        }}
                      >
                        {a === -1 ? "∞ Illimité" : `+${a}`}
                      </Button>
                    ))}
                  </div>
                </>
              ) : <span className="text-muted-foreground">Aucun crédit</span>}
            </CardContent>
          </Card>

          {/* Roles */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Rôles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {roles.length > 0 ? roles.map((r) => (
                  <Badge key={r.id} variant={r.role === "admin" ? "destructive" : r.role === "vice_president" ? "default" : "secondary"}>
                    {r.role === "admin" ? "Administrateur" : r.role === "vice_president" ? "Vice-Président" : "Utilisateur"}
                  </Badge>
                )) : <span className="text-muted-foreground text-sm">Aucun rôle</span>}
              </div>
            </CardContent>
          </Card>

          {/* Projects */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><FolderCode className="w-4 h-4" /> Projets ({projects.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length > 0 ? (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {projects.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                      <span className="font-medium">{p.name}</span>
                      <Badge variant={p.is_published ? "default" : "outline"} className="text-xs h-5">
                        {p.is_published ? "Publié" : "Brouillon"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : <span className="text-muted-foreground text-sm">Aucun projet</span>}
            </CardContent>
          </Card>

          {/* Conversations */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Conversations ({conversations.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {conversations.length > 0 ? (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {conversations.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                      <span className="font-medium truncate">{c.title}</span>
                      <span className="text-muted-foreground shrink-0">{formatDate(c.created_at)}</span>
                    </div>
                  ))}
                </div>
              ) : <span className="text-muted-foreground text-sm">Aucune conversation</span>}
            </CardContent>
          </Card>

          {/* Memories */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4" /> Mémoires IA ({memories.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {memories.length > 0 ? (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {memories.map(m => (
                    <div key={m.id} className="p-2 bg-muted rounded text-xs">
                      <span className="font-medium">{m.memory_key}</span>
                      <p className="text-muted-foreground mt-0.5 truncate">{m.memory_value}</p>
                    </div>
                  ))}
                </div>
              ) : <span className="text-muted-foreground text-sm">Aucune mémoire</span>}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
