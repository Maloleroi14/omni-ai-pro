import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Coins, Loader2, Plus, Infinity, Search, UserMinus, Ban, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserWithCredits {
  user_id: string;
  email: string;
  display_name: string | null;
  credits: number;
}

export function UserCreditsManager() {
  const [users, setUsers] = useState<UserWithCredits[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addAmounts, setAddAmounts] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bannedUserIds, setBannedUserIds] = useState<Set<string>>(new Set());

  const loadUsers = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ action: "list_users" }),
      });
      const data = await resp.json();
      if (data.users) setUsers(data.users);
    } catch {
      toast.error("Erreur lors du chargement des utilisateurs");
    }
    setLoading(false);
  };

  const loadBans = async () => {
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ action: "list_bans" }),
      });
      const data = await resp.json();
      if (data.bans) {
        setBannedUserIds(new Set(data.bans.map((b: any) => b.user_id)));
      }
    } catch {}
  };

  useEffect(() => { loadUsers(); loadBans(); }, []);

  const addCredits = async (userId: string) => {
    const amount = parseInt(addAmounts[userId] || "0");
    if (!amount || amount <= 0) {
      toast.error("Entrez un nombre positif");
      return;
    }
    setActionLoading(userId + "_add");
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ action: "add_credits", target_user_id: userId, amount }),
      });
      const data = await resp.json();
      if (data.success) {
        toast.success(`${amount} crédits ajoutés !`);
        setAddAmounts({ ...addAmounts, [userId]: "" });
        loadUsers();
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur");
    }
    setActionLoading(null);
  };

  const setUnlimited = async (userId: string) => {
    setActionLoading(userId + "_unlimited");
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ action: "set_credits", target_user_id: userId, amount: -1 }),
      });
      const data = await resp.json();
      if (data.success) {
        toast.success("Crédits illimités activés !");
        loadUsers();
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur");
    }
    setActionLoading(null);
  };

  const removeUnlimited = async (userId: string) => {
    setActionLoading(userId + "_remove_unlimited");
    try {
      // Get default daily credits from admin settings
      const { data: settingsData } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "daily_credits")
        .single();
      const dailyCredits = (settingsData?.setting_value as any)?.amount || 15;

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ action: "set_credits", target_user_id: userId, amount: dailyCredits }),
      });
      const data = await resp.json();
      if (data.success) {
        toast.success(`Crédits remis à ${dailyCredits} (utilisateur normal)`);
        loadUsers();
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur");
    }
    setActionLoading(null);
  };

  const toggleBan = async (userId: string) => {
    const isBanned = bannedUserIds.has(userId);
    const action = isBanned ? "unban_user" : "ban_user";
    setActionLoading(userId + "_ban");
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ action, target_user_id: userId }),
      });
      const data = await resp.json();
      if (data.success) {
        toast.success(isBanned ? "Utilisateur débanni !" : "Utilisateur banni !");
        loadBans();
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur");
    }
    setActionLoading(null);
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("⚠️ Supprimer définitivement ce compte ? Cette action est IRRÉVERSIBLE.")) return;
    setActionLoading(userId + "_delete");
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ action: "delete_user", target_user_id: userId }),
      });
      const data = await resp.json();
      if (data.success) {
        toast.success("Compte supprimé définitivement !");
        setUsers(users.filter(u => u.user_id !== userId));
        setBannedUserIds(prev => { const next = new Set(prev); next.delete(userId); return next; });
      } else {
        toast.error(data.error || "Erreur");
      }
    } catch {
      toast.error("Erreur");
    }
    setActionLoading(null);
  };

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5" />
          Gestion des Crédits Utilisateurs
        </CardTitle>
        <CardDescription>Ajoutez des crédits ou activez l'illimité pour chaque utilisateur</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-96">
          <div className="space-y-3">
            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Aucun utilisateur trouvé</p>
            )}
            {filtered.map((user) => (
              <div key={user.user_id} className={`p-4 rounded-lg space-y-3 ${bannedUserIds.has(user.user_id) ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm flex items-center gap-2">
                      {user.display_name || "Sans nom"}
                      {bannedUserIds.has(user.user_id) && (
                        <Badge variant="destructive" className="text-xs">BANNI</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {user.credits >= 999999 ? (
                        <span className="flex items-center gap-1 text-primary">
                          <Infinity className="w-4 h-4" /> Illimité
                        </span>
                      ) : (
                        <span>{user.credits} crédits</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Nombre"
                    value={addAmounts[user.user_id] || ""}
                    onChange={(e) => setAddAmounts({ ...addAmounts, [user.user_id]: e.target.value })}
                    className="w-24 h-8 text-sm"
                    min="1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addCredits(user.user_id)}
                    disabled={actionLoading === user.user_id + "_add"}
                    className="h-8 gap-1"
                  >
                    {actionLoading === user.user_id + "_add" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                    Ajouter
                  </Button>
                  {user.credits >= 999999 ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeUnlimited(user.user_id)}
                      disabled={actionLoading === user.user_id + "_remove_unlimited"}
                      className="h-8 gap-1"
                    >
                      {actionLoading === user.user_id + "_remove_unlimited" ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <UserMinus className="w-3 h-3" />
                      )}
                      Retirer illimité
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setUnlimited(user.user_id)}
                      disabled={actionLoading === user.user_id + "_unlimited"}
                      className="h-8 gap-1"
                    >
                      {actionLoading === user.user_id + "_unlimited" ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Infinity className="w-3 h-3" />
                      )}
                      Illimité
                    </Button>
                  )}
                  {bannedUserIds.has(user.user_id) ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteUser(user.user_id)}
                      disabled={actionLoading === user.user_id + "_delete"}
                      className="h-8 gap-1"
                    >
                      {actionLoading === user.user_id + "_delete" ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      Supprimer
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => toggleBan(user.user_id)}
                      disabled={actionLoading === user.user_id + "_ban"}
                      className="h-8 gap-1"
                    >
                      {actionLoading === user.user_id + "_ban" ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Ban className="w-3 h-3" />
                      )}
                      Bannir
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
