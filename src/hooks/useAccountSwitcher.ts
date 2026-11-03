import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LinkedAccount {
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  refreshToken: string;
  userId: string;
}

const STORAGE_KEY = "omni_linked_accounts";

function getStoredAccounts(): LinkedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStoredAccounts(accounts: LinkedAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function useAccountSwitcher() {
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>(getStoredAccounts);

  // Sync current session into linked accounts
  const saveCurrentSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", session.user.id)
      .single();

    const account: LinkedAccount = {
      email: session.user.email || "",
      displayName: profile?.display_name || session.user.email?.split("@")[0] || "",
      avatarUrl: profile?.avatar_url,
      refreshToken: session.refresh_token,
      userId: session.user.id,
    };

    const existing = getStoredAccounts();
    const filtered = existing.filter(a => a.userId !== account.userId);
    const updated = [...filtered, account];
    setStoredAccounts(updated);
    setLinkedAccounts(updated);
  }, []);

  // Save session on mount and when auth changes
  useEffect(() => {
    saveCurrentSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        saveCurrentSession();
      }
    });

    return () => subscription.unsubscribe();
  }, [saveCurrentSession]);

  const switchToAccount = useCallback(async (account: LinkedAccount) => {
    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: account.refreshToken,
      });

      if (error || !data.session) {
        // Token expired, remove account
        const updated = getStoredAccounts().filter(a => a.userId !== account.userId);
        setStoredAccounts(updated);
        setLinkedAccounts(updated);
        toast.error(`Session expirée pour ${account.email}. Reconnectez-vous.`);
        return false;
      }

      // Update the stored refresh token
      const stored = getStoredAccounts();
      const idx = stored.findIndex(a => a.userId === account.userId);
      if (idx >= 0) {
        stored[idx].refreshToken = data.session.refresh_token;
        setStoredAccounts(stored);
        setLinkedAccounts(stored);
      }

      toast.success(`Connecté en tant que ${account.displayName || account.email}`);
      
      // Force reload to reinitialize everything with new session
      window.location.reload();
      return true;
    } catch {
      toast.error("Erreur lors du changement de compte");
      return false;
    }
  }, []);

  const removeAccount = useCallback((userId: string) => {
    const updated = getStoredAccounts().filter(a => a.userId !== userId);
    setStoredAccounts(updated);
    setLinkedAccounts(updated);
  }, []);

  return {
    linkedAccounts,
    switchToAccount,
    removeAccount,
    saveCurrentSession,
  };
}
