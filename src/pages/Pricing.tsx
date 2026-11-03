import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, Zap, Crown, Gem, Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useState } from "react";

const PAYFLOW_BASE = "https://freeonlinepay.com/pay";
const WEBHOOK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payflow-webhook`;

const plans = [
  {
    name: "Starter",
    price: "5",
    icon: Zap,
    color: "from-blue-500 to-cyan-400",
    badge: "",
    payflowKey: "aff0bb90-600d-4f96-932b-e3a32ce9246d-7dd07a10-b07a-48a7-a6b4-5a81f5fd5f6a",
    features: [
      "50 crédits par jour",
      "Aucune publicité",
      "Accès au chat IA standard",
      "Historique de conversations",
      "Support communautaire",
    ],
  },
  {
    name: "Pro",
    price: "20",
    icon: Crown,
    color: "from-violet-500 to-purple-400",
    badge: "Populaire",
    payflowKey: "eb2496f3-bf8c-4de0-82ef-8491a115757c-e0bbea61-b024-4813-adf9-dffe5cab2ac4",
    features: [
      "150 crédits par jour",
      "Aucune publicité",
      "Accès voix IA",
      "Accès prioritaire",
      "Historique illimité",
      "Support par email",
    ],
  },
  {
    name: "Ultime",
    price: "50",
    icon: Gem,
    color: "from-amber-500 to-orange-400",
    badge: "Le meilleur",
    payflowKey: "83e907db-7661-4cb0-ae75-e465459da77c-8a6e3aba-266a-4d2a-a9d6-936416cc2424",
    features: [
      "Crédits illimités",
      "Aucune publicité",
      "Accès voix IA",
      "Accès prioritaire",
      "Historique illimité",
      "Support prioritaire 24/7",
      "Fonctionnalités bêta en avant-première",
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user, profile } = useAuthContext();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = (plan: typeof plans[0]) => {
    if (!user || !profile?.email) {
      toast.error("Connectez-vous d'abord pour souscrire à un abonnement.");
      navigate("/auth");
      return;
    }

    if (!plan.payflowKey) {
      toast.info("Cet abonnement sera bientôt disponible !");
      return;
    }

    setLoadingPlan(plan.name);

    const payUrl = `${PAYFLOW_BASE}?key=${plan.payflowKey}&qty=1&email=${encodeURIComponent(profile.email)}&webhook=${encodeURIComponent(WEBHOOK_URL)}`;
    window.open(payUrl, "_blank");

    setTimeout(() => setLoadingPlan(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-lg">Abonnements</h1>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero */}
      <section className="pt-12 pb-6 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Passez au niveau supérieur
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            Choisissez votre plan
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Débloquez plus de puissance et de fonctionnalités avec nos abonnements premium.
          </p>
        </motion.div>
      </section>

      {/* Plans */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan, i) => {
            const isAvailable = !!plan.payflowKey;
            const isLoading = loadingPlan === plan.name;

            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <Card className={`relative overflow-hidden h-full flex flex-col ${i === 1 ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]" : "border-border"}`}>
                  {plan.badge && (
                    <div className={`absolute top-0 right-0 bg-gradient-to-r ${plan.color} text-white text-xs font-bold px-3 py-1 rounded-bl-lg`}>
                      {plan.badge}
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-3`}>
                      <plan.icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-4xl font-extrabold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">CHF/mois</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-3 flex-1 mb-6">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className={`w-4 h-4 mt-0.5 shrink-0 ${i === 1 ? "text-primary" : "text-emerald-500"}`} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={i === 1 ? "default" : "outline"}
                      disabled={!isAvailable || isLoading}
                      onClick={() => handleSubscribe(plan)}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      {!isAvailable
                        ? "Bientôt disponible"
                        : i === 0
                          ? "Commencer"
                          : i === 1
                            ? "Choisir Pro"
                            : "Passer à l'Ultime"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Footer note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center text-sm text-muted-foreground"
        >
          <p>Tous les abonnements sont sans engagement. Annulez à tout moment.</p>
          <p className="mt-1">Les paiements sont sécurisés via PayFlow.</p>
        </motion.div>
      </section>
    </div>
  );
}
