import { useAuthContext } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Coins, Infinity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

const CREATOR_EMAIL = "omniaiproultime@gmail.com";

interface CreditsDisplayProps {
  className?: string;
}

// Animated rolling number
function AnimatedNumber({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;
    if (prev === value) return;
    
    const diff = value - prev;
    const steps = Math.min(Math.abs(diff), 20);
    const stepDuration = 300 / steps;
    let step = 0;
    
    const interval = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(prev + diff * eased));
      if (step >= steps) {
        clearInterval(interval);
        setDisplayed(value);
      }
    }, stepDuration);
    
    return () => clearInterval(interval);
  }, [value]);

  return <span className="tabular-nums transition-all">{displayed}</span>;
}

export function CreditsDisplay({ className }: CreditsDisplayProps) {
  const { user, credits, isLoading, isAdmin, isVicePresident } = useAuthContext();
  const [isCoCreator, setIsCoCreator] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const check = async () => {
      if (!user?.email || user.email === CREATOR_EMAIL) return;
      const { data } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "co_creator_email")
        .single();
      const emails: string[] = (data?.setting_value as any)?.emails || [];
      setIsCoCreator(emails.includes(user.email!));
    };
    check();
  }, [user]);

  if (isLoading || !credits) {
    return null;
  }

  if (isAdmin || isCoCreator || isVicePresident) {
    return (
      <div className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        "bg-primary/20 text-primary",
        className
      )}>
        <Infinity className="w-3.5 h-3.5 animate-pulse" />
        <span>{t("credits.unlimited")}</span>
      </div>
    );
  }

  const isLow = credits.credits <= 5;
  const isEmpty = credits.credits <= 0;

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300",
      isEmpty ? "bg-destructive/10 text-destructive animate-pulse" :
      isLow ? "bg-accent text-accent-foreground" :
      "bg-primary/10 text-primary",
      className
    )}>
      <Coins className={cn("w-3.5 h-3.5", !isEmpty && "transition-transform hover:rotate-12")} />
      <AnimatedNumber value={credits.credits} />
      <span className="text-muted-foreground/70 text-[10px]">crédits</span>
    </div>
  );
}
