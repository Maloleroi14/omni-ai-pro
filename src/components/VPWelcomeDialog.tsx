import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Crown, MessageSquare, Infinity, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface VPWelcomeDialogProps {
  userId: string;
  isVicePresident: boolean;
}

export function VPWelcomeDialog({ userId, isVicePresident }: VPWelcomeDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    if (!isVicePresident || !userId) return;

    const checkFirstLogin = async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "vp_welcomed_users")
        .maybeSingle();

      const welcomed: string[] = (data?.setting_value as any)?.user_ids || [];
      if (!welcomed.includes(userId)) {
        setOpen(true);
      }
    };
    checkFirstLogin();
  }, [isVicePresident, userId]);

  const handleClose = async () => {
    setOpen(false);
    // Mark as welcomed
    const { data } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "vp_welcomed_users")
      .maybeSingle();

    const welcomed: string[] = (data?.setting_value as any)?.user_ids || [];
    if (!welcomed.includes(userId)) {
      welcomed.push(userId);
      if (data) {
        await supabase
          .from("admin_settings")
          .update({ setting_value: { user_ids: welcomed } })
          .eq("setting_key", "vp_welcomed_users");
      } else {
        await supabase
          .from("admin_settings")
          .insert({ setting_key: "vp_welcomed_users", setting_value: { user_ids: welcomed } });
      }
    }
  };

  const steps = [
    {
      icon: <Crown className="w-12 h-12 text-yellow-500 animate-bounce" />,
      title: "🎉 Félicitations !",
      description: "Vous avez été nommé(e) Vice-Président(e) de la plateforme. C'est un rôle de confiance avec des responsabilités importantes.",
    },
    {
      icon: <Shield className="w-12 h-12 text-purple-500" />,
      title: "Panel Administration",
      description: "Vous avez accès au panel d'administration avec les mêmes fonctionnalités que les enquêteurs : statistiques, gestion des comptes, blocages et plus encore.",
    },
    {
      icon: <Infinity className="w-12 h-12 text-emerald-500" />,
      title: "Crédits Illimités",
      description: "En tant que VP, vous bénéficiez de crédits illimités pour utiliser toutes les fonctionnalités de l'IA sans aucune restriction.",
    },
    {
      icon: <Clock className="w-12 h-12 text-orange-500" />,
      title: "Succession du Créateur",
      description: "Si le créateur ne se connecte pas avant 8h30, vous récupérez automatiquement tous ses pouvoirs et son panel admin complet jusqu'à sa reconnexion.",
    },
    {
      icon: <MessageSquare className="w-12 h-12 text-blue-500" />,
      title: "Prêt(e) à commencer !",
      description: "Utilisez vos nouveaux pouvoirs avec sagesse. Accédez au panel admin depuis le menu utilisateur. Bonne gestion !",
    },
  ];

  const current = steps[step];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none">
        <div className="relative bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 text-white p-8 flex flex-col items-center text-center gap-4">
          {/* Decorative particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-white/20 animate-pulse"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>

          {/* Step indicator */}
          <div className="flex gap-1.5 mb-2 z-10">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-8 bg-white" : i < step ? "w-4 bg-white/60" : "w-4 bg-white/25"
                }`}
              />
            ))}
          </div>

          <div className="animate-scale-in z-10" key={step}>
            {current.icon}
          </div>

          <h2 className="text-xl font-bold animate-fade-in z-10" key={`t-${step}`}>
            {current.title}
          </h2>

          <p className="text-sm text-white/90 leading-relaxed animate-fade-in z-10" key={`d-${step}`}>
            {current.description}
          </p>

          <div className="flex gap-3 mt-4 z-10">
            {step > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(s => s - 1)}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                Précédent
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button
                size="sm"
                onClick={() => setStep(s => s + 1)}
                className="bg-white text-purple-700 hover:bg-white/90 font-semibold"
              >
                Suivant
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleClose}
                className="bg-white text-purple-700 hover:bg-white/90 font-semibold"
              >
                C'est parti ! 🚀
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
