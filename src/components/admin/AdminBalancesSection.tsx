import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, Plus, Minus, Loader2 } from "lucide-react";

interface UserBalance {
  user_id: string;
  credits: number;
  email: string;
  display_name: string | null;
}

export function AdminBalancesSection() {
  const [users, setUsers] = useState<UserBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adjustAmounts, setAdjustAmounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [creditsRes, profilesRes] = await Promise.all([
      supabase.from("user_credits").select("user_id, credits"),
      supabase.from("profiles").select("user_id, email, display_name"),
    ]);

    const profiles = profilesRes.data || [];
    const credits = creditsRes.data || [];

    const merged: UserBalance[] = credits.map((c) => {
      const p = profiles.find((p) => p.user_id === c.user_id);
      return {
        user_id: c.user_id,
        credits: c.credits,
        email: p?.email || "Inconnu",
        display_name: p?.display_name || null,
      };
    });

    merged.sort((a, b) => a.email.localeCompare(b.email));
    setUsers(merged);
    setLoading(false);
  };

  const adjustCredits = async (userId: string, delta: number) => {
    if (delta === 0) return;
    setSaving(userId);
    const user = users.find((u) => u.user_id === userId);
    if (!user) return;

    const newCredits = Math.max(0, user.credits + delta);
    const { error } = await supabase
      .from("user_credits")
      .update({ credits: newCredits })
      .eq("user_id", userId);

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success(`Crédits mis à jour : ${user.credits} → ${newCredits}`);
      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, credits: newCredits } : u))
      );
      setAdjustAmounts((prev) => ({ ...prev, [userId]: 0 }));
    }
    setSaving(null);
  };

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Soldes des crédits</h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{users.length} comptes</span>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead className="text-center">Crédits</TableHead>
                  <TableHead className="text-center">Modifier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const amt = adjustAmounts[u.user_id] || 0;
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{u.display_name || u.email.split("@")[0]}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-lg">{u.credits}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() =>
                              setAdjustAmounts((p) => ({ ...p, [u.user_id]: (p[u.user_id] || 0) - 1 }))
                            }
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            value={amt}
                            onChange={(e) =>
                              setAdjustAmounts((p) => ({ ...p, [u.user_id]: parseInt(e.target.value) || 0 }))
                            }
                            className="w-20 text-center h-8"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() =>
                              setAdjustAmounts((p) => ({ ...p, [u.user_id]: (p[u.user_id] || 0) + 1 }))
                            }
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            disabled={amt === 0 || saving === u.user_id}
                            onClick={() => adjustCredits(u.user_id, amt)}
                          >
                            {saving === u.user_id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Appliquer"
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Aucun résultat
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
