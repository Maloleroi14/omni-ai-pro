import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, User, Lock, Eye, EyeOff, Loader2, Trash2, AlertTriangle, Calendar, Crown, Mail, Camera, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const CREATOR_EMAIL = "omniaiproultime@gmail.com";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z.string().min(6, "6 caractères minimum").max(100),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, isLoading, refreshCredits, credits, isAdmin, isCoCreator, isVicePresident } = useAuthContext();
  const { t } = useLanguage();
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState("Gratuit");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCreator = user?.email === CREATOR_EMAIL;
  // Delete account state
  const [deleteClicks, setDeleteClicks] = useState(0);
  const [deleteCooldown, setDeleteCooldown] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const TOTAL_CLICKS = 11;

  // Fetch profile creation date, plan, and avatar
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("created_at, avatar_url")
        .eq("user_id", user.id)
        .single();
      if (prof) {
        setCreatedAt(prof.created_at);
        if (prof.avatar_url) setAvatarUrl(prof.avatar_url);
      }

      if (user.email === CREATOR_EMAIL) {
        setUserPlan("Ultime");
      }
    })();
  }, [user]);

  const handleDeleteClick = useCallback(async () => {
    if (deleteCooldown || isDeleting) return;
    
    const next = deleteClicks + 1;
    setDeleteClicks(next);
    
    if (next < TOTAL_CLICKS) {
      setDeleteCooldown(true);
      setTimeout(() => setDeleteCooldown(false), 2000);
      
      if (next >= 8) {
        toast.warning(`⚠️ ${TOTAL_CLICKS - next} clics restants avant suppression définitive !`);
      }
    } else {
      setIsDeleting(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not authenticated");

        const response = await supabase.functions.invoke("delete-account", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (response.error) throw response.error;

        toast.success("Compte supprimé. Un email de récupération a été envoyé.");
        await supabase.auth.signOut();
        navigate("/auth");
      } catch (error: any) {
        toast.error("Erreur lors de la suppression : " + (error.message || "Erreur inconnue"));
        setDeleteClicks(0);
        setIsDeleting(false);
      }
    }
  }, [deleteClicks, deleteCooldown, isDeleting, navigate]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Seules les images sont autorisées"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("L'image ne doit pas dépasser 2 Mo"); return; }
    setIsUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: url } as any).eq("user_id", user.id);
      setAvatarUrl(url);
      toast.success("Photo de profil mise à jour !");
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user || !displayName.trim()) {
      toast.error("Le nom d'utilisateur ne peut pas être vide");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() })
        .eq("user_id", user.id);

      if (error) throw error;

      await refreshCredits();
      toast.success("Profil mis à jour avec succès !");
    } catch (error: any) {
      toast.error("Erreur lors de la mise à jour: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwErrors({});

    const result = passwordSchema.safeParse({ currentPassword, newPassword, confirmPassword });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) errs[String(err.path[0])] = err.message;
      });
      setPwErrors(errs);
      return;
    }

    setIsChangingPw(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      });
      if (signInError) {
        setPwErrors({ currentPassword: "Mot de passe actuel incorrect" });
        setIsChangingPw(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Mot de passe modifié avec succès !");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setIsChangingPw(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("profile.back")}
        </Button>

        {/* Informations du compte */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t("profile.title")}
            </CardTitle>
            <CardDescription>{t("profile.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <Avatar className="w-20 h-20 border-2 border-primary/30">
                  <AvatarImage src={avatarUrl || undefined} alt="Photo de profil" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {profile?.display_name?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <p className="text-xs text-muted-foreground">Cliquez pour changer la photo</p>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                {t("profile.email")}
              </Label>
              <Input value={user?.email || ""} disabled className="bg-muted" />
            </div>

            {/* Display name */}
            <div className="space-y-1">
              <Label htmlFor="displayName">{t("profile.username")}</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("profile.username")} />
              <p className="text-xs text-muted-foreground">{t("profile.username_hint")}</p>
            </div>

            {/* Date de création */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Membre depuis
              </div>
              <span className="text-sm font-medium">
                {createdAt ? format(new Date(createdAt), "d MMMM yyyy", { locale: fr }) : "—"}
              </span>
            </div>

            {/* Plan */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Crown className="w-4 h-4" />
                Plan actuel
              </div>
              <Badge variant={userPlan === "Gratuit" ? "secondary" : "default"}>
                {userPlan}
              </Badge>
            </div>

            {/* Crédits */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Crédits restants</span>
              <span className="text-sm font-bold">
                {isAdmin || isCoCreator || isVicePresident ? t("credits.unlimited") : (credits?.credits ?? 0)}
              </span>
            </div>

            <Button onClick={handleSave} disabled={isSaving || !displayName.trim()} className="w-full">
              {isSaving ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>{t("profile.saving")}</>) : (<><Save className="w-4 h-4 mr-2" />{t("profile.save")}</>)}
            </Button>
          </CardContent>
        </Card>

        {/* Mot de passe */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5" />{t("profile.change_password")}</CardTitle>
            <CardDescription>{t("profile.change_password_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t("profile.current_password")}</Label>
                <div className="relative">
                  <Input id="currentPassword" type={showCurrentPw ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowCurrentPw(!showCurrentPw)}>
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {pwErrors.currentPassword && <p className="text-sm text-destructive">{pwErrors.currentPassword}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t("profile.new_password")}</Label>
                <div className="relative">
                  <Input id="newPassword" type={showNewPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowNewPw(!showNewPw)}>
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {pwErrors.newPassword && <p className="text-sm text-destructive">{pwErrors.newPassword}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("profile.confirm_password")}</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
                {pwErrors.confirmPassword && <p className="text-sm text-destructive">{pwErrors.confirmPassword}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isChangingPw}>
                {isChangingPw ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />{t("profile.changing_password")}</>) : (<><Lock className="w-4 h-4 mr-2" />{t("profile.change_password_btn")}</>)}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Revoir le guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Guide d'utilisation
            </CardTitle>
            <CardDescription>Revisionnez le guide de bienvenue d'OmniAI Pro.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                if (user) {
                  localStorage.removeItem(`onboarding_completed_${user.id}`);
                  supabase
                    .from("profiles")
                    .update({ onboarding_completed: false } as any)
                    .eq("user_id", user.id)
                    .then(() => {
                      toast.success("Le guide va s'afficher. Rechargement...");
                      setTimeout(() => window.location.reload(), 800);
                    });
                }
              }}
            >
              <BookOpen className="w-4 h-4" />
              Revoir le guide
            </Button>
          </CardContent>
        </Card>

        {/* Suppression du compte */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive"><Trash2 className="w-5 h-5" />{t("delete.title")}</CardTitle>
            <CardDescription>
              La suppression est définitive après 3 jours. Un email de récupération sera envoyé à votre adresse.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {deleteClicks > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("delete.confirmations")}</span>
                  <span className="font-mono font-bold text-destructive">{deleteClicks}/{TOTAL_CLICKS}</span>
                </div>
                <Progress value={(deleteClicks / TOTAL_CLICKS) * 100} className="h-2 [&>div]:bg-destructive" />
              </div>
            )}
            {deleteClicks >= 5 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive font-medium">{t("delete.warning")}</p>
              </div>
            )}
            <Button variant="destructive" className="w-full" onClick={handleDeleteClick} disabled={deleteCooldown || isDeleting}>
              {isDeleting ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />{t("delete.deleting")}</>) : deleteCooldown ? (t("delete.cooldown")) : deleteClicks === 0 ? (<><Trash2 className="w-4 h-4 mr-2" />{t("delete.button", { total: TOTAL_CLICKS })}</>) : (t("delete.confirm", { current: deleteClicks, total: TOTAL_CLICKS }))}
            </Button>
            {deleteClicks > 0 && deleteClicks < TOTAL_CLICKS && (
              <Button variant="outline" className="w-full" onClick={() => { setDeleteClicks(0); setDeleteCooldown(false); }}>{t("delete.cancel")}</Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
