import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Ban } from "lucide-react";

const BAN_MAINTENANCE_KEY = "ban_maintenance_until";
const BAN_MAINTENANCE_EMAIL = "ban_maintenance_email";

/** Check if this device is in ban-maintenance lockout */
export function isBanMaintenanceActive(): boolean {
  const until = localStorage.getItem(BAN_MAINTENANCE_KEY);
  if (!until) return false;
  if (new Date(until) > new Date()) return true;
  localStorage.removeItem(BAN_MAINTENANCE_KEY);
  localStorage.removeItem(BAN_MAINTENANCE_EMAIL);
  return false;
}

/** Async check: if the banned email no longer exists in banned_users, clear lockout */
export async function clearBanMaintenanceIfUnbanned(): Promise<void> {
  const until = localStorage.getItem(BAN_MAINTENANCE_KEY);
  if (!until) return;
  const email = localStorage.getItem(BAN_MAINTENANCE_EMAIL);
  if (!email) {
    // No email stored — can't verify, keep lockout
    return;
  }
  try {
    const { data } = await supabase
      .from("banned_user_backups")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    // If no backup exists (user was unbanned/restored), clear lockout
    if (!data) {
      localStorage.removeItem(BAN_MAINTENANCE_KEY);
      localStorage.removeItem(BAN_MAINTENANCE_EMAIL);
    }
  } catch {
    // Ignore errors, keep lockout as safety
  }
}

export function BanMessagePopup() {
  const { user } = useAuthContext();
  const [banMessage, setBanMessage] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;
    checkBanStatus();
  }, [user]);

  const checkBanStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("banned_users")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) {
      // Not banned — clear any leftover ban-maintenance lockout
      localStorage.removeItem(BAN_MAINTENANCE_KEY);
      return;
    }

    if (!(data as any).message_read) {
      const message = (data as any).ban_message || data.reason || "Votre compte a été banni.";
      setBanMessage(message);
      setShowPopup(true);

      timerRef.current = setTimeout(() => {
        handleMessageRead();
      }, 60000);
    } else {
      // Already read the ban message — just disconnect
      handleDisconnect();
    }
  };

  const handleMessageRead = async () => {
    if (!user) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    await supabase
      .from("banned_users")
      .update({ message_read: true, message_read_at: new Date().toISOString() } as any)
      .eq("user_id", user.id);

    // Set 3-day ban-maintenance lockout on this device
    const lockoutEnd = new Date();
    lockoutEnd.setDate(lockoutEnd.getDate() + 3);
    localStorage.setItem(BAN_MAINTENANCE_KEY, lockoutEnd.toISOString());
    localStorage.setItem(BAN_MAINTENANCE_EMAIL, user.email || "");

    // Archive all user data then delete the account
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.functions.invoke("ban-manage", {
      body: { action: "archive_and_delete", user_id: user.id },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });

    handleDisconnect();
  };

  const handleDisconnect = async () => {
    setShowPopup(false);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (!showPopup || !banMessage) return null;

  return (
    <Dialog open={showPopup} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg border-destructive/50"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive text-xl">
            <Ban className="w-6 h-6" />
            Compte Banni
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{banMessage}</p>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Vous serez automatiquement déconnecté après avoir lu ce message. Le site sera inaccessible pendant 3 jours.
          </p>

          <Button
            variant="destructive"
            className="w-full"
            onClick={handleMessageRead}
          >
            J'ai compris
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
