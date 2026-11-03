import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, LogIn, Search, User, ShieldAlert, ShieldPlus, ShieldMinus } from "lucide-react";
import { toast } from "sonner";

const CREATOR_EMAIL = "omniaiproultime@gmail.com";

interface Account {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

interface AdminAccountsSectionProps {
  isEnqueteur?: boolean;
  isCreator?: boolean;
}

export function AdminAccountsSection({ isEnqueteur = false, isCreator = false }: AdminAccountsSectionProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [protectedEmails, setProtectedEmails] = useState<Set<string>>(new Set());
  const [customProtectedEmails, setCustomProtectedEmails] = useState<string[]>([]);
  const [savingProtection, setSavingProtection] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
    loadProtectedEmails();
  }, [isEnqueteur]);

  const loadProtectedEmails = async () => {
    try {
      const [coRes, protectedRes] = await Promise.all([
        supabase.from("admin_settings").select("setting_value").eq("setting_key", "co_creator_email").single(),
        supabase.from("admin_settings").select("setting_value").eq("setting_key", "protected_accounts").single(),
      ]);
      const coEmails: string[] = (coRes.data?.setting_value as any)?.emails || [];
      const customProtected: string[] = (protectedRes.data?.setting_value as any)?.emails || [];
      setCustomProtectedEmails(customProtected);
      // Always protect creator + co-creators + custom protected list
      const protectedSet = new Set([CREATOR_EMAIL, ...coEmails, ...customProtected]);
      setProtectedEmails(protectedSet);
    } catch {}
  };

  const toggleProtection = async (email: string) => {
    if (email === CREATOR_EMAIL) return;
    setSavingProtection(email);
    try {
      const isCurrentlyProtected = customProtectedEmails.includes(email);
      const newList = isCurrentlyProtected
        ? customProtectedEmails.filter(e => e !== email)
        : [...customProtectedEmails, email];

      // Upsert the protected_accounts setting
      const { error } = await supabase
        .from("admin_settings")
        .upsert({
          setting_key: "protected_accounts",
          setting_value: JSON.parse(JSON.stringify({ emails: newList })),
        }, { onConflict: "setting_key" });

      if (error) throw error;

      setCustomProtectedEmails(newList);
      // Reload protected emails to recalculate the full set
      await loadProtectedEmails();
      toast.success(isCurrentlyProtected ? `Protection retirée pour ${email}` : `${email} est maintenant protégé`);
    } catch {
      toast.error("Erreur lors de la modification");
    }
    setSavingProtection(null);
  };

  const loadAccounts = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("impersonate-user", {
      body: { action: "list_accounts" },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (error) {
      toast.error("Erreur lors du chargement des comptes");
    } else {
      setAccounts(data.accounts || []);
    }
    setLoading(false);
  };

  const isProtectedAccount = (email: string) => {
    if (isCreator) return false; // Creator can access everything
    return protectedEmails.has(email);
  };

  const isCustomProtected = (email: string) => {
    return customProtectedEmails.includes(email);
  };

  const handleImpersonate = async (account: Account) => {
    if (account.email === "omniaiproultime@gmail.com") {
      toast.info("Vous êtes déjà connecté avec ce compte");
      return;
    }

    if (isProtectedAccount(account.email)) {
      toast.error("Vous n'avez pas la permission de vous connecter à ce compte");
      return;
    }

    setImpersonating(account.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("impersonate-user", {
        body: { action: "impersonate", target_user_id: account.id },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error || data?.error) {
        toast.error(data?.error || "Erreur lors de la connexion");
        return;
      }

      const creatorId = session?.user?.id;
      if (creatorId) {
        const { data: returnData } = await supabase.functions.invoke("impersonate-user", {
          body: { action: "impersonate", target_user_id: creatorId },
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        if (returnData?.token_hash) {
          localStorage.setItem("creator_return_token", returnData.token_hash);
        }
      }

      localStorage.setItem("impersonating_from_creator", "true");

      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink",
      });

      if (otpError) {
        localStorage.removeItem("impersonating_from_creator");
        localStorage.removeItem("creator_return_token");
        toast.error("Erreur: " + otpError.message);
        return;
      }

      toast.success(`Connecté en tant que ${account.display_name || account.email}`);
      window.location.href = "/";
    } catch (e) {
      toast.error("Erreur lors de la connexion");
    } finally {
      setImpersonating(null);
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
        <h2 className="text-xl font-bold">Comptes utilisateurs</h2>
        <p className="text-sm text-muted-foreground">
          {accounts.length} compte{accounts.length > 1 ? "s" : ""} — Cliquez pour vous connecter
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
              <TableHead className="hidden sm:table-cell">Inscrit le</TableHead>
              <TableHead className="hidden sm:table-cell">Dernière connexion</TableHead>
              {isCreator && <TableHead className="w-[80px] text-center">Protégé</TableHead>}
              <TableHead className="w-[80px]"></TableHead>
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
                      <p className="font-medium text-sm truncate flex items-center gap-1.5">
                        {account.display_name || "—"}
                        {isProtectedAccount(account.email) && !isCreator && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">Protégé</Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {new Date(account.created_at).toLocaleDateString("fr-FR")}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {account.last_sign_in_at
                    ? new Date(account.last_sign_in_at).toLocaleDateString("fr-FR")
                    : "—"}
                </TableCell>
                {isCreator && (
                  <TableCell className="text-center">
                    {account.email === CREATOR_EMAIL ? (
                      <ShieldAlert className="w-4 h-4 text-primary mx-auto" />
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleProtection(account.email)}
                        disabled={savingProtection === account.email}
                        title={isCustomProtected(account.email) ? "Retirer la protection" : "Protéger ce compte"}
                      >
                        {savingProtection === account.email ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isCustomProtected(account.email) ? (
                          <ShieldMinus className="w-4 h-4 text-destructive" />
                        ) : (
                          <ShieldPlus className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  {isProtectedAccount(account.email) ? (
                    <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleImpersonate(account)}
                      disabled={impersonating === account.id}
                    >
                      {impersonating === account.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogIn className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={isCreator ? 5 : 4} className="text-center text-muted-foreground py-8">
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
