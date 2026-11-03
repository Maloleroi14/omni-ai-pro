import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Search, User, Ban, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";

const CREATOR_EMAIL = "omniaiproultime@gmail.com";

interface Account {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export function AdminBanSection() {
  const { user } = useAuthContext();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showUnbanDialog, setShowUnbanDialog] = useState(false);
  const [banType, setBanType] = useState<"default" | "custom">("default");
  const [customMessage, setCustomMessage] = useState("");
  const [banning, setBanning] = useState(false);
  const [unbanning, setUnbanning] = useState(false);
  const [bannedIds, setBannedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAccounts();
    loadBannedUsers();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("impersonate-user", {
      body: { action: "list_accounts" },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (!error && data?.accounts) {
      setAccounts(data.accounts.filter((a: Account) => a.email !== CREATOR_EMAIL));
    }
    setLoading(false);
  };

  const loadBannedUsers = async () => {
    const { data } = await supabase.from("banned_users").select("user_id");
    if (data) setBannedIds(new Set(data.map(b => b.user_id)));
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const filteredIds = filtered.map(a => a.id);
    if (filteredIds.every(id => selected.has(id))) {
      setSelected(prev => {
        const next = new Set(prev);
        filteredIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        filteredIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const openBanDialog = () => {
    const nonBannedSelected = [...selected].filter(id => !bannedIds.has(id));
    if (nonBannedSelected.length === 0) {
      toast.error("Sélectionnez au moins un compte non banni");
      return;
    }
    setShowBanDialog(true);
  };

  const openUnbanDialog = () => {
    const bannedSelected = [...selected].filter(id => bannedIds.has(id));
    if (bannedSelected.length === 0) {
      toast.error("Sélectionnez au moins un compte banni");
      return;
    }
    setShowUnbanDialog(true);
  };

  const executeBan = async () => {
    if (!user) return;
    setBanning(true);

    const message = banType === "default"
      ? "Votre compte a été banni pour raisons illégales. Cette décision est définitive et votre compte sera supprimé.\n\n— Omni AI Pro"
      : `${customMessage}\n\n— Omni AI Pro`;

    try {
      const nonBannedSelected = [...selected].filter(id => !bannedIds.has(id));
      for (const userId of nonBannedSelected) {
        await supabase.from("banned_users").upsert({
          user_id: userId,
          banned_by: user.id,
          reason: message,
          ban_message: message,
          ban_type: banType,
          permanent: true,
        } as any, { onConflict: "user_id" as any });

        const account = accounts.find(a => a.id === userId);
        if (account?.email) {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Compte Banni</h1>
              </div>
              <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="color: #111; font-size: 16px;">Bonjour <strong>${account.display_name || account.email.split("@")[0]}</strong>,</p>
                <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #991b1b; margin: 0; white-space: pre-line;">${message}</p>
                </div>
                <p style="color: #555; font-size: 14px;">Votre compte sera inaccessible. Le site sera en maintenance pour vous pendant 3 jours.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="color: #999; font-size: 12px; text-align: center;">Omni AI Pro</p>
              </div>
            </div>
          `;
          await supabase.functions.invoke("send-brevo-email", {
            body: {
              to: account.email,
              subject: "⚠️ Votre compte Omni AI Pro a été banni",
              html: emailHtml,
            },
          });
        }
      }

      toast.success(`${nonBannedSelected.length} compte(s) banni(s) et email(s) envoyé(s)`);
      setSelected(new Set());
      setShowBanDialog(false);
      setCustomMessage("");
      setBanType("default");
      loadBannedUsers();
    } catch (e) {
      toast.error("Erreur lors du bannissement");
    }
    setBanning(false);
  };

  const executeUnban = async () => {
    if (!user) return;
    setUnbanning(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const bannedSelected = [...selected].filter(id => bannedIds.has(id));
      for (const userId of bannedSelected) {
        const account = accounts.find(a => a.id === userId);

        // Restore account via edge function (creates new account with archived data)
        const { data: restoreResult, error: restoreError } = await supabase.functions.invoke("ban-manage", {
          body: { action: "restore", user_id: userId },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });

        if (restoreError) {
          toast.error(`Erreur lors de la restauration de ${account?.email || userId}`);
          continue;
        }

        // Send restoration email with temp password
        const email = restoreResult?.email || account?.email;
        const tempPassword = restoreResult?.temp_password;
        if (email) {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #16a34a, #15803d); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">✅ Compte Rétabli</h1>
              </div>
              <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="color: #111; font-size: 16px;">Bonjour <strong>${account?.display_name || email.split("@")[0]}</strong>,</p>
                <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #15803d; margin: 0;">Bonne nouvelle ! Votre compte Omni AI Pro a été rétabli avec toutes vos données : conversations, crédits, projets et paramètres.</p>
                </div>
                <p style="color: #111; font-size: 14px;"><strong>Vos identifiants de connexion :</strong></p>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin: 12px 0;">
                  <p style="margin: 4px 0; font-size: 14px;">📧 Email : <strong>${email}</strong></p>
                  <p style="margin: 4px 0; font-size: 14px;">🔑 Mot de passe temporaire : <strong>${tempPassword}</strong></p>
                </div>
                <p style="color: #555; font-size: 13px;">⚠️ Changez votre mot de passe dès votre première connexion via la page Profil.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="color: #999; font-size: 12px; text-align: center;">Omni AI Pro — Bienvenue à nouveau !</p>
              </div>
            </div>
          `;
          await supabase.functions.invoke("send-brevo-email", {
            body: {
              to: email,
              subject: "✅ Votre compte Omni AI Pro a été rétabli",
              html: emailHtml,
            },
          });
        }
      }

      toast.success(`${bannedSelected.length} compte(s) débanni(s), restauré(s) et email(s) envoyé(s)`);
      setSelected(new Set());
      setShowUnbanDialog(false);
      loadBannedUsers();
      loadAccounts();
    } catch (e) {
      toast.error("Erreur lors du débannissement");
    }
    setUnbanning(false);
  };

  const selectedBannedCount = [...selected].filter(id => bannedIds.has(id)).length;
  const selectedNonBannedCount = [...selected].filter(id => !bannedIds.has(id)).length;

  const filtered = accounts.filter(a =>
    (a.email?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (a.display_name?.toLowerCase() || "").includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Ban className="w-5 h-5 text-destructive" />
            Bannissement
          </h2>
          <p className="text-sm text-muted-foreground">
            Bannir ou débannir des comptes — {accounts.length} compte(s)
          </p>
        </div>
        <div className="flex gap-2">
          {selectedBannedCount > 0 && (
            <Button variant="outline" onClick={openUnbanDialog} className="gap-2 border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700">
              <ShieldCheck className="w-4 h-4" />
              Débannir {selectedBannedCount}
            </Button>
          )}
          {selectedNonBannedCount > 0 && (
            <Button variant="destructive" onClick={openBanDialog} className="gap-2">
              <Ban className="w-4 h-4" />
              Bannir {selectedNonBannedCount}
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par pseudo ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={filtered.length > 0 && filtered.every(a => selected.has(a.id))}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead className="hidden sm:table-cell">Inscrit le</TableHead>
              <TableHead className="w-[100px]">Statut</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((account) => {
              const isBanned = bannedIds.has(account.id);
              return (
                <TableRow key={account.id} className={isBanned ? "bg-destructive/5" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(account.id)}
                      onCheckedChange={() => toggleSelect(account.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isBanned ? "bg-destructive/10" : "bg-primary/10"}`}>
                        <User className={`w-4 h-4 ${isBanned ? "text-destructive" : "text-primary"}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{account.display_name || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {new Date(account.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    {isBanned ? (
                      <Badge variant="destructive" className="text-[10px]">Banni</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Actif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {isBanned ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => {
                          setSelected(new Set([account.id]));
                          setShowUnbanDialog(true);
                        }}
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setSelected(new Set([account.id]));
                          setShowBanDialog(true);
                        }}
                      >
                        <Ban className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Aucun compte trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Ban Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Bannir {selectedNonBannedCount} compte(s)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Les comptes bannis recevront un message et un email, puis seront déconnectés. Le site sera en maintenance pour eux pendant 3 jours. Leur compte est conservé et peut être rétabli.
            </p>

            <RadioGroup value={banType} onValueChange={(v) => setBanType(v as "default" | "custom")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="default" id="default" />
                <Label htmlFor="default">Message par défaut (raisons illégales)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom">Message personnalisé</Label>
              </div>
            </RadioGroup>

            {banType === "custom" && (
              <Textarea
                placeholder="Écrivez votre message de bannissement..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
            )}

            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Aperçu du message :</p>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {banType === "default"
                  ? "Votre compte a été banni pour raisons illégales. Cette décision est définitive et votre compte sera supprimé."
                  : customMessage || "(aucun message)"}
              </p>
              <p className="text-muted-foreground mt-2 font-medium">— Omni AI Pro</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBanDialog(false)}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={executeBan}
              disabled={banning || (banType === "custom" && !customMessage.trim())}
              className="gap-2"
            >
              {banning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
              Confirmer le bannissement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unban Dialog */}
      <Dialog open={showUnbanDialog} onOpenChange={setShowUnbanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <ShieldCheck className="w-5 h-5" />
              Débannir {selectedBannedCount} compte(s)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Les comptes débannés retrouveront immédiatement accès au site avec toutes leurs données intactes : conversations, crédits, paramètres, etc. Un email de restauration leur sera envoyé.
            </p>

            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium mb-1">Comptes sélectionnés :</p>
              <ul className="text-sm text-green-600 dark:text-green-500 space-y-1">
                {[...selected].filter(id => bannedIds.has(id)).map(id => {
                  const acc = accounts.find(a => a.id === id);
                  return (
                    <li key={id}>• {acc?.display_name || acc?.email || id}</li>
                  );
                })}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnbanDialog(false)}>Annuler</Button>
            <Button
              onClick={executeUnban}
              disabled={unbanning}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              {unbanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Confirmer le débannissement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
