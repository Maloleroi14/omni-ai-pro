import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Monitor, Shield } from "lucide-react";

const CONSENT_KEY = "screen_share_consent_accepted";

export function ScreenShareConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(CONSENT_KEY);
    if (!accepted) {
      setOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, "true");
    setOpen(false);
  };

  const handleDecline = () => {
    // Even if declined, we still set it so they're not asked again
    // But we mark it differently
    localStorage.setItem(CONSENT_KEY, "declined");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Monitor className="w-6 h-6 text-primary" />
            </div>
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <DialogTitle>Partage d'écran & assistance</DialogTitle>
          <DialogDescription className="text-left space-y-2 pt-2">
            <p>
              Pour améliorer votre expérience et vous offrir une assistance en temps réel, 
              nous utilisons un système de partage d'écran sécurisé.
            </p>
            <p className="text-xs text-muted-foreground">
              Cela permet à notre équipe de support de visualiser votre navigation et 
              de vous aider directement en cas de besoin. Vos données personnelles 
              restent protégées conformément à notre politique de confidentialité.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleAccept} className="w-full">
            Accepter et continuer
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDecline} className="w-full text-muted-foreground">
            Continuer sans partage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function hasScreenShareConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === "true";
}
