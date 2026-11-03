import { useState, useEffect } from "react";
import { Construction, LogIn, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface MaintenanceScreenProps {
  message: string;
  endDate?: string | null;
  showCountdown?: boolean;
  onLogin?: () => void;
  isBanMaintenance?: boolean;
}

function CountdownTimer({ endDate }: { endDate: string }) {
  const [remaining, setRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const update = () => {
      const target = new Date(endDate).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setExpired(true);
        return;
      }

      setRemaining({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (expired) {
    return (
      <p className="text-white/50 text-sm mt-2">
        La maintenance devrait être terminée bientôt...
      </p>
    );
  }

  const blocks = [
    { value: remaining.days, label: "j" },
    { value: remaining.hours, label: "h" },
    { value: remaining.minutes, label: "m" },
    { value: remaining.seconds, label: "s" },
  ].filter((b, i) => i > 0 || b.value > 0); // Hide days if 0

  return (
    <div className="mt-6">
      <p className="text-white/40 text-xs uppercase tracking-widest mb-3">Retour estimé dans</p>
      <div className="flex items-center justify-center gap-2">
        {blocks.map((b) => (
          <div key={b.label} className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-white font-mono">
                {String(b.value).padStart(2, "0")}
              </span>
            </div>
            <span className="text-white/30 text-[10px] mt-1 uppercase">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UnlockCodeInput() {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const handleUnlock = async () => {
    if (code.trim().toLowerCase() !== "sammy") {
      setError(true);
      setTimeout(() => setError(false), 2000);
      return;
    }
    setUnlocking(true);
    // Clear ban maintenance lockout
    localStorage.removeItem("ban_maintenance_until");
    localStorage.removeItem("ban_maintenance_email");

    // Try to unblock device
    const email = localStorage.getItem("ban_maintenance_email");
    if (email) {
      try {
        await supabase.from("device_blocks").delete().eq("user_email", email);
      } catch {}
    }

    window.location.reload();
  };

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="mt-4 flex items-center gap-1.5 text-white/20 hover:text-white/40 text-xs transition-colors mx-auto"
      >
        <KeyRound className="w-3 h-3" />
        Code de déverrouillage
      </button>
    );
  }

  return (
    <div className="mt-4 flex flex-col items-center gap-2 w-full max-w-xs mx-auto">
      <div className="flex gap-2 w-full">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Entrez le code..."
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
          onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
        />
        <Button
          size="sm"
          onClick={handleUnlock}
          disabled={unlocking || !code.trim()}
          className="bg-white/10 hover:bg-white/20 text-white border-0"
        >
          {unlocking ? "..." : "OK"}
        </Button>
      </div>
      {error && (
        <p className="text-red-400 text-xs">Code incorrect</p>
      )}
    </div>
  );
}

export function MaintenanceScreen({ message, endDate, showCountdown, onLogin, isBanMaintenance }: MaintenanceScreenProps) {
  return (
    <div className="fixed inset-0 z-[9998] bg-black flex flex-col items-center justify-center gap-6 p-8 text-center">
      {onLogin && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogin}
          className="absolute top-4 right-4 text-white/40 hover:text-white hover:bg-white/10 text-xs"
        >
          <LogIn className="w-3.5 h-3.5 mr-1.5" />
          Admin
        </Button>
      )}

      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
        <Construction className="w-10 h-10 text-white/60" />
      </div>
      <h1 className="text-2xl font-bold text-white">Maintenance en cours</h1>
      <p className="text-white/60 max-w-md text-lg">{message}</p>

      {showCountdown && endDate && <CountdownTimer endDate={endDate} />}

      {isBanMaintenance && <UnlockCodeInput />}
    </div>
  );
}
