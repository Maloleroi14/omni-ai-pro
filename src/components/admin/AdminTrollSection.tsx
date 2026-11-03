import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skull, Search, Loader2, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CREATOR_EMAIL = "omniaiproultime@gmail.com";

interface UserWithTroll {
  user_id: string;
  email: string;
  display_name: string | null;
  trollActive: boolean;
  expiresAt: string | null;
}

interface AdminTrollSectionProps {
  isEnqueteur?: boolean;
}

export function AdminTrollSection({ isEnqueteur = false }: AdminTrollSectionProps) {
  const [users, setUsers] = useState<UserWithTroll[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    const [profilesRes, trollRes] = await Promise.all([
      supabase.from("profiles").select("user_id, email, display_name"),
      supabase.from("troll_mode").select("user_id, is_active, expires_at"),
    ]);

    const profiles = profilesRes.data || [];
    const trollData = trollRes.data || [];
    const trollMap = new Map(trollData.map(t => [t.user_id, t]));

    const merged: UserWithTroll[] = profiles.map(p => {
      const troll = trollMap.get(p.user_id);
      // Check if expired
      let isActive = troll?.is_active || false;
      if (isActive && troll?.expires_at && new Date(troll.expires_at) < new Date()) {
        isActive = false;
      }
      return {
        user_id: p.user_id,
        email: p.email,
        display_name: p.display_name,
        trollActive: isActive,
        expiresAt: troll?.expires_at || null,
      };
    });

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  // Auto-refresh every 30s to catch expired trolls
  useEffect(() => {
    const interval = setInterval(loadUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleTroll = async (user: UserWithTroll) => {
    // Enquêteurs can't troll the creator
    if (isEnqueteur && user.email === CREATOR_EMAIL) {
      toast.error("Tu ne peux pas troller le créateur !");
      return;
    }

    setToggling(user.user_id);
    const newActive = !user.trollActive;

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (newActive) {
        // Activate troll mode
        const expiresAt = isEnqueteur 
          ? new Date(Date.now() + 90 * 1000).toISOString() // 1min30 for enquêteurs
          : null; // No expiry for creator

        const { error } = await supabase.from("troll_mode").upsert({
          user_id: user.user_id,
          activated_by: currentUser?.id || "",
          is_active: true,
          activated_at: new Date().toISOString(),
          expires_at: expiresAt,
        }, { onConflict: "user_id" });

        if (error) throw error;
        toast.success(`🤪 Mode Troll activé pour ${user.display_name || user.email}${isEnqueteur ? " (1min30)" : ""}`);
      } else {
        // Deactivate
        const { error } = await supabase.from("troll_mode")
          .update({ is_active: false })
          .eq("user_id", user.user_id);
        if (error) throw error;
        toast.success(`Mode Troll désactivé pour ${user.display_name || user.email}`);
      }

      await loadUsers();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setToggling(null);
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.email.toLowerCase().includes(q) || (u.display_name || "").toLowerCase().includes(q);
  });

  const getRemainingTime = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) return "Expiré";
    const seconds = Math.ceil(remaining / 1000);
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skull className="w-5 h-5" />
            Mode Troll
          </CardTitle>
          <CardDescription>
            Active le mode troll sur un utilisateur — l'IA lui répondra n'importe quoi de complètement débile.
            {isEnqueteur && " (Auto-désactivation après 1min30)"}
          </CardDescription>
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

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filtered.map((user) => {
                const isCreatorAccount = user.email === CREATOR_EMAIL;
                const cantToggle = isEnqueteur && isCreatorAccount;
                const remaining = user.trollActive ? getRemainingTime(user.expiresAt) : null;

                return (
                  <div
                    key={user.user_id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      user.trollActive ? "border-destructive/50 bg-destructive/5" : "border-border"
                    } ${cantToggle ? "opacity-50" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {user.display_name || "Sans nom"}
                        {isCreatorAccount && " 👑"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      {user.trollActive && remaining && (
                        <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                          <Timer className="w-3 h-3" />
                          Expire dans {remaining}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {user.trollActive && (
                        <span className="text-xs font-medium text-destructive">🤪 TROLL</span>
                      )}
                      {toggling === user.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Switch
                          checked={user.trollActive}
                          onCheckedChange={() => toggleTroll(user)}
                          disabled={cantToggle}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
