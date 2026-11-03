import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Code, Palette, Sparkles, ArrowRight, Check,
  Brain, Shield, Zap, Globe, Image, Mic, Search, FileText,
  Bot, Cpu, Star, BookOpen
} from "lucide-react";

interface StepFeature {
  icon: any;
  label: string;
}

interface Step {
  icon: any;
  title: string;
  description: string;
  color: string;
  features?: StepFeature[];
}

const steps: Step[] = [
  {
    icon: Sparkles,
    title: "Bienvenue sur OmniAI Pro ! 🎉",
    description: "Votre plateforme IA tout-en-un, propulsée par les meilleurs modèles d'intelligence artificielle au monde.",
    color: "from-primary to-primary/60",
    features: [
      { icon: Brain, label: "GPT-5 & GPT-5.2" },
      { icon: Cpu, label: "Gemini 2.5 & 3 Pro" },
      { icon: Zap, label: "Multi-modèles IA" },
    ],
  },
  {
    icon: MessageCircle,
    title: "Discutez sans limites 💬",
    description: "Posez n'importe quelle question : l'IA comprend le contexte, recherche sur le web, analyse des images et génère du contenu.",
    color: "from-blue-500 to-cyan-400",
    features: [
      { icon: Search, label: "Recherche web intégrée" },
      { icon: Image, label: "Génération d'images" },
      { icon: Mic, label: "Commande vocale" },
      { icon: FileText, label: "Analyse de fichiers" },
    ],
  },
  {
    icon: Code,
    title: "Créez des sites web 🚀",
    description: "Décrivez votre idée et l'IA construit un site complet pour vous. Éditeur de code, prévisualisation en direct et publication en un clic.",
    color: "from-emerald-500 to-teal-400",
    features: [
      { icon: Globe, label: "Publication instantanée" },
      { icon: Palette, label: "Thèmes personnalisés" },
      { icon: Bot, label: "IA assistante de code" },
    ],
  },
  {
    icon: Shield,
    title: "Les règles d'OmniAI Pro 📜",
    description: "Pour une expérience sûre et agréable pour tous, voici les règles à respecter :",
    color: "from-amber-500 to-orange-400",
    features: [
      { icon: Shield, label: "Contenu respectueux obligatoire" },
      { icon: Star, label: "Pas de spam ni abus" },
      { icon: BookOpen, label: "Usage personnel uniquement" },
    ],
  },
  {
    icon: Zap,
    title: "Vous êtes prêt ! ⚡",
    description: "OmniAI Pro combine GPT-5, Gemini Pro, et d'autres IA pour vous offrir le meilleur. Commencez dès maintenant !",
    color: "from-purple-500 to-pink-400",
    features: [
      { icon: MessageCircle, label: "Chattez avec l'IA" },
      { icon: Code, label: "Créez un site" },
      { icon: Palette, label: "Personnalisez tout" },
    ],
  },
];

const ONBOARDING_KEY = "onboarding_completed";

export function OnboardingDialog() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    const checkOnboarding = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .single();

      if (data?.onboarding_completed) {
        localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, "true");
        return;
      }
      const done = localStorage.getItem(`${ONBOARDING_KEY}_${user.id}`);
      if (!done) {
        const timer = setTimeout(() => setOpen(true), 1500);
        return () => clearTimeout(timer);
      }
    };
    checkOnboarding();
  }, [user]);

  const complete = async () => {
    if (user) {
      localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, "true");
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as any)
        .eq("user_id", user.id);
    }
    setOpen(false);
  };

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      complete();
      navigate("/chat");
    }
  };

  const current = steps[step];
  const Icon = current.icon;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) complete(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-0 [&>button]:hidden">
        <div className="relative">
          {/* Close */}
          <button
            onClick={() => complete()}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/20 backdrop-blur hover:bg-white/30 flex items-center justify-center transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {/* Progress */}
          <div className="absolute top-4 left-4 right-12 flex gap-1 z-10">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                  i <= step ? "bg-white/90" : "bg-white/20"
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
            >
              <div className={`bg-gradient-to-br ${current.color} p-6 pt-12 flex flex-col items-center text-center`}>
                <motion.div
                  initial={{ scale: 0.5, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3"
                >
                  <Icon className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-lg font-bold text-white mb-1.5">{current.title}</h2>
                <p className="text-white/85 text-sm max-w-sm leading-relaxed">{current.description}</p>

                {/* Feature pills */}
                {current.features && (
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {current.features.map((f, i) => {
                      const FIcon = f.icon;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + i * 0.08 }}
                          className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-white font-medium"
                        >
                          <FIcon className="w-3.5 h-3.5" />
                          {f.label}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Step indicator */}
          <div className="px-6 pt-4 flex justify-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  i === step ? "bg-primary w-5" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="p-4 pt-3 flex items-center justify-between bg-background">
            <Button variant="ghost" size="sm" onClick={() => complete()} className="text-muted-foreground text-xs">
              Passer le guide
            </Button>
            <Button onClick={next} size="sm" className="gap-1.5 font-semibold">
              {step === steps.length - 1 ? (
                <>
                  C'est parti ! <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  Suivant <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
