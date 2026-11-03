import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, LogOut, Search, User } from "lucide-react";
import { toast } from "sonner";

interface Account {
  id: string;
  email: string;
  display_name: string | null;
  last_sign_in_at: string | null;
}

export function AdminSessionsSection() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("impersonate-user", {
      body: { action: "list_accounts" },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (!error && data?.accounts) {
      setAccounts(data.accounts);
    }
    setLoading(false);
  };

  const handleDisconnect = async (account: Account) => {
    setDisconnecting(account.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("impersonate-user", {
        body: { action: "force_disconnect", target_user_id: account.id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Erreur");
      } else {
        toast.success(`${account.display_name || account.email} déconnecté`);
      }
    } catch {
      toast.error("Erreur lors de la déconnexion");
    } finally {
      setDisconnecting(null);
    }
  };

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
      <div>
        <h2 className="text-xl font-bold">Sessions actives</h2>
        <p className="text-sm text-muted-foreground">
          Déconnectez un utilisateur de tous ses appareils
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un compte..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead className="hidden sm:table-cell">Dernière connexion</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((account) => (
              <TableRow key={account.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{account.display_name || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {account.last_sign_in_at
                    ? new Date(account.last_sign_in_at).toLocaleString("fr-FR")
                    : "—"}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDisconnect(account)}
                    disabled={disconnecting === account.id}
                  >
                    {disconnecting === account.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  Aucun compte trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
