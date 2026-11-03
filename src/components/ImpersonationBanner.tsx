import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";

const CREATOR_EMAIL = "omniaiproultime@gmail.com";

export function ImpersonationBanner() {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      const flag = localStorage.getItem("impersonating_from_creator");
      if (!flag) return;
      const { data: { user } } = await supabase.auth.getUser();
      // Show banner only if logged in as someone other than creator
      if (user && user.email !== CREATOR_EMAIL) {
        setIsImpersonating(true);
      } else {
        // Clean up if back on creator account
        localStorage.removeItem("impersonating_from_creator");
        setIsImpersonating(false);
      }
    };
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReturn = async () => {
    setLoading(true);
    try {
      // Sign out current impersonated session
      await supabase.auth.signOut();
      localStorage.removeItem("impersonating_from_creator");

      // Sign back in as creator using stored credentials
      const creatorToken = localStorage.getItem("creator_return_token");
      if (creatorToken) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: creatorToken,
          type: "magiclink",
        });
        localStorage.removeItem("creator_return_token");
        if (!error) {
          toast.success("Reconnecté au compte créateur");
          window.location.href = "/admin/accounts";
          return;
        }
      }

      // Fallback: redirect to auth page
      toast.info("Veuillez vous reconnecter au compte créateur");
      window.location.href = "/auth";
    } catch {
      toast.error("Erreur lors du retour");
    } finally {
      setLoading(false);
    }
  };

  if (!isImpersonating) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998]">
      <Button
        onClick={handleReturn}
        disabled={loading}
        className="shadow-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full px-5 py-2 gap-2"
      >
        <ArrowLeftRight className="w-4 h-4" />
        Retour au compte créateur
      </Button>
    </div>
  );
}
