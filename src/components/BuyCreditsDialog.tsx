import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShoppingCart, Loader2, ExternalLink, Plus, Minus, Coins } from "lucide-react";

const PAYFLOW_LINKS: Record<number, string> = {
  1: "https://easy-pay-love.lovable.app/pay?key=31c45483-974b-40b5-8f6f-e8320ed631ea-fd8ed79d-1f47-484d-b57c-767740e94b17",
  2: "https://id-preview--22e71ee1-4adb-466d-a5bf-9f1ca31d11f2.lovable.app/pay?key=1191cf0b-66b4-4370-ad21-1b8fbd3b88b1-7d59c0bd-200f-4b85-ad40-57cf5f16fe85",
  3: "https://easy-pay-love.lovable.app/pay?key=3b5da783-e8bd-42bf-8393-0a717455ec75-59bb08a5-649c-4d9a-b742-02d415ef6d22",
  4: "https://easy-pay-love.lovable.app/pay?key=credit-key-04-payflow-2026",
  5: "https://easy-pay-love.lovable.app/pay?key=credit-key-05-payflow-2026",
  6: "https://easy-pay-love.lovable.app/pay?key=credit-key-06-payflow-2026",
  7: "https://easy-pay-love.lovable.app/pay?key=credit-key-07-payflow-2026",
  8: "https://easy-pay-love.lovable.app/pay?key=credit-key-08-payflow-2026",
  9: "https://easy-pay-love.lovable.app/pay?key=credit-key-09-payflow-2026",
  10: "https://easy-pay-love.lovable.app/pay?key=credit-key-10-payflow-2026",
  11: "https://easy-pay-love.lovable.app/pay?key=credit-key-11-payflow-2026",
  12: "https://easy-pay-love.lovable.app/pay?key=credit-key-12-payflow-2026",
  13: "https://easy-pay-love.lovable.app/pay?key=credit-key-13-payflow-2026",
  14: "https://easy-pay-love.lovable.app/pay?key=credit-key-14-payflow-2026",
  15: "https://easy-pay-love.lovable.app/pay?key=credit-key-15-payflow-2026",
  16: "https://easy-pay-love.lovable.app/pay?key=credit-key-16-payflow-2026",
  17: "https://easy-pay-love.lovable.app/pay?key=credit-key-17-payflow-2026",
  18: "https://easy-pay-love.lovable.app/pay?key=credit-key-18-payflow-2026",
  19: "https://easy-pay-love.lovable.app/pay?key=credit-key-19-payflow-2026",
  20: "https://easy-pay-love.lovable.app/pay?key=credit-key-20-payflow-2026",
  21: "https://easy-pay-love.lovable.app/pay?key=credit-key-21-payflow-2026",
  22: "https://easy-pay-love.lovable.app/pay?key=credit-key-22-payflow-2026",
  23: "https://easy-pay-love.lovable.app/pay?key=credit-key-23-payflow-2026",
  24: "https://easy-pay-love.lovable.app/pay?key=credit-key-24-payflow-2026",
  25: "https://easy-pay-love.lovable.app/pay?key=credit-key-25-payflow-2026",
  26: "https://easy-pay-love.lovable.app/pay?key=credit-key-26-payflow-2026",
  27: "https://easy-pay-love.lovable.app/pay?key=credit-key-27-payflow-2026",
  28: "https://easy-pay-love.lovable.app/pay?key=credit-key-28-payflow-2026",
  29: "https://easy-pay-love.lovable.app/pay?key=credit-key-29-payflow-2026",
  30: "https://easy-pay-love.lovable.app/pay?key=credit-key-30-payflow-2026",
  31: "https://easy-pay-love.lovable.app/pay?key=credit-key-31-payflow-2026",
  32: "https://easy-pay-love.lovable.app/pay?key=credit-key-32-payflow-2026",
  33: "https://easy-pay-love.lovable.app/pay?key=credit-key-33-payflow-2026",
  34: "https://easy-pay-love.lovable.app/pay?key=credit-key-34-payflow-2026",
  35: "https://easy-pay-love.lovable.app/pay?key=credit-key-35-payflow-2026",
  36: "https://easy-pay-love.lovable.app/pay?key=credit-key-36-payflow-2026",
  37: "https://easy-pay-love.lovable.app/pay?key=credit-key-37-payflow-2026",
  38: "https://easy-pay-love.lovable.app/pay?key=credit-key-38-payflow-2026",
  39: "https://easy-pay-love.lovable.app/pay?key=credit-key-39-payflow-2026",
  40: "https://easy-pay-love.lovable.app/pay?key=credit-key-40-payflow-2026",
  41: "https://easy-pay-love.lovable.app/pay?key=credit-key-41-payflow-2026",
  42: "https://easy-pay-love.lovable.app/pay?key=credit-key-42-payflow-2026",
  43: "https://easy-pay-love.lovable.app/pay?key=credit-key-43-payflow-2026",
  44: "https://easy-pay-love.lovable.app/pay?key=credit-key-44-payflow-2026",
  45: "https://easy-pay-love.lovable.app/pay?key=credit-key-45-payflow-2026",
  46: "https://easy-pay-love.lovable.app/pay?key=credit-key-46-payflow-2026",
  47: "https://easy-pay-love.lovable.app/pay?key=credit-key-47-payflow-2026",
  48: "https://easy-pay-love.lovable.app/pay?key=credit-key-48-payflow-2026",
  49: "https://easy-pay-love.lovable.app/pay?key=credit-key-49-payflow-2026",
  50: "https://easy-pay-love.lovable.app/pay?key=credit-key-50-payflow-2026",
};

export function BuyCreditsDialog() {
  const { user, profile } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const handleCheckout = async () => {
    if (!user || !profile) return;
    setIsLoading(true);

    try {
      const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payflow-webhook`;
      const baseUrl = PAYFLOW_LINKS[quantity];
      if (!baseUrl) throw new Error("Quantité invalide");

      const payflowUrl = `${baseUrl}&qty=${quantity}&email=${encodeURIComponent(profile.email)}&webhook=${encodeURIComponent(webhookUrl)}`;

      window.open(payflowUrl, "_blank");
      toast.success("Redirection vers PayFlow...");
      setOpen(false);
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error(err.message || "Erreur lors de la création du paiement");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
          <ShoppingCart className="w-4 h-4" />
          Acheter des crédits
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Acheter des crédits</DialogTitle>
          <DialogDescription>
            Choisis le nombre de crédits puis clique sur acheter. Tu seras redirigé vers PayFlow pour payer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="h-10 w-10"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-[80px] justify-center">
                <Coins className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{quantity}</span>
              </div>
              <Button
                variant="outline"
                size="icon"
onClick={() => setQuantity(Math.min(50, quantity + 1))}
                disabled={quantity >= 50}
                className="h-10 w-10"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {quantity} crédit{quantity > 1 ? "s" : ""}
            </p>
          </div>

          <Button onClick={handleCheckout} disabled={isLoading} className="w-full gap-2" size="lg">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Acheter {quantity} crédit{quantity > 1 ? "s" : ""} sur PayFlow
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
