import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Coins, Loader2, Plus, Infinity, Search, UserMinus, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CREATOR_EMAIL = "omniaiproultime@gmail.com";

interface UserWithCredits {
  user_id: string;
  email: string;
  display_name: string | null;
  credits: number;
}

export function CoCreatorCreditsSection() {
  const [users, setUsers] = useState<UserWithCredits[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addAmounts, setAddAmounts] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [protectedEmails, setProtectedEmails] = useState<Set<string>>(new Set());

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
      else if (data.error) toast.error(data.error);
    } catch {
      toast.error("Erreur lors du chargement");
    }
    setLoading(false);
  };

  const loadProtectedEmails = async () => {
    try {
      const { data: coCreatorData } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "co_creator_email")
        .single();
      const emails: string[] = (coCreatorData?.setting_value as any)?.emails || [];
      setProtectedEmails(new Set([CREATOR_EMAIL, ...emails]));
    } catch {}
  };

  useEffect(() => { loadUsers(); loadProtectedEmails(); }, []);

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
    setActionLoading(userId + "_remove");
    try {
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
        toast.success(`Crédits remis à ${dailyCredits}`);
        loadUsers();
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
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Gestion des Crédits</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Crédits Utilisateurs
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
                <div key={user.user_id} className="p-4 rounded-lg bg-muted space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{user.display_name || "Sans nom"}</p>
                     <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {protectedEmails.has(user.email) && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          {user.email === CREATOR_EMAIL ? "Créateur" : "Co-créateur"}
                        </Badge>
                      )}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    {!protectedEmails.has(user.email) && (
                      <>
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
                            disabled={actionLoading === user.user_id + "_remove"}
                            className="h-8 gap-1"
                          >
                            {actionLoading === user.user_id + "_remove" ? (
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
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
