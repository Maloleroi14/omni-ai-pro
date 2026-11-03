import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ArrowLeft, Trophy, Star, Flame, MessageCircle, Globe, Code, Zap, Shield, Heart, Crown, Gem, Award, Gift, Coins, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: any;
  gradient: string;
  requirement: string;
  threshold: number;
  category: string;
  creditReward: number;
}

const allBadges: Badge[] = [
  // Chat — easy to hard
  { id: "first_message", name: "Premier pas", description: "Envoyer votre premier message", icon: MessageCircle, gradient: "from-blue-500 to-cyan-500", requirement: "messages", threshold: 1, category: "Chat", creditReward: 2 },
  { id: "chatterbox", name: "Bavard", description: "Envoyer 50 messages", icon: MessageCircle, gradient: "from-blue-500 to-indigo-500", requirement: "messages", threshold: 50, category: "Chat", creditReward: 5 },
  { id: "conversationalist", name: "Grand causeur", description: "Envoyer 200 messages", icon: Flame, gradient: "from-orange-500 to-red-500", requirement: "messages", threshold: 200, category: "Chat", creditReward: 10 },
  { id: "legend", name: "Légende", description: "Envoyer 1000 messages", icon: Crown, gradient: "from-amber-500 to-yellow-500", requirement: "messages", threshold: 1000, category: "Chat", creditReward: 25 },
  // Création
  { id: "first_site", name: "Créateur", description: "Créer votre premier site", icon: Globe, gradient: "from-green-500 to-emerald-500", requirement: "sites", threshold: 1, category: "Création", creditReward: 3 },
  { id: "builder", name: "Bâtisseur", description: "Créer 5 sites", icon: Code, gradient: "from-violet-500 to-purple-500", requirement: "sites", threshold: 5, category: "Création", creditReward: 8 },
  { id: "architect", name: "Architecte", description: "Créer 20 sites", icon: Gem, gradient: "from-pink-500 to-rose-500", requirement: "sites", threshold: 20, category: "Création", creditReward: 20 },
  // Engagement
  { id: "loyal", name: "Fidèle", description: "7 jours d'utilisation", icon: Heart, gradient: "from-red-500 to-pink-500", requirement: "days", threshold: 7, category: "Engagement", creditReward: 5 },
  { id: "dedicated", name: "Dévoué", description: "30 jours d'utilisation", icon: Shield, gradient: "from-teal-500 to-cyan-500", requirement: "days", threshold: 30, category: "Engagement", creditReward: 15 },
  { id: "veteran", name: "Vétéran", description: "100 jours d'utilisation", icon: Award, gradient: "from-amber-600 to-orange-500", requirement: "days", threshold: 100, category: "Engagement", creditReward: 30 },
  // Social
  { id: "referrer", name: "Ambassadeur", description: "Parrainer 3 amis", icon: Star, gradient: "from-yellow-500 to-amber-500", requirement: "referrals", threshold: 3, category: "Social", creditReward: 10 },
  { id: "influencer", name: "Influenceur", description: "Parrainer 10 amis", icon: Trophy, gradient: "from-primary to-purple-500", requirement: "referrals", threshold: 10, category: "Social", creditReward: 30 },
];

export default function Badges() {
  const navigate = useNavigate();
  const { user, refreshCredits } = useAuthContext();
  const [stats, setStats] = useState({ messages: 0, sites: 0, days: 0, referrals: 0 });
  const [claimedBadges, setClaimedBadges] = useState<string[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [justClaimed, setJustClaimed] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadStats();
    loadClaimedBadges();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    const [msgRes, siteRes] = await Promise.all([
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("user_projects").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    const { data: profile } = await supabase.from("profiles").select("created_at").eq("user_id", user.id).single();
    const daysActive = profile ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const { data: refData } = await supabase.from("admin_settings").select("setting_value").eq("setting_key", "referral_data").maybeSingle();
    const referrals = (refData?.setting_value as any)?.referrals?.[user.id]?.length || 0;

    setStats({ messages: msgRes.count || 0, sites: siteRes.count || 0, days: daysActive, referrals });
  };

  const loadClaimedBadges = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", `claimed_badges_${user.id}`)
      .maybeSingle();
    if (data) {
      setClaimedBadges((data.setting_value as any)?.badges || []);
    }
  };

  const claimBadge = async (badge: Badge) => {
    if (!user || claimingId) return;
    setClaimingId(badge.id);

    try {
      // Add credits
      const { data: currentCredits } = await supabase
        .from("user_credits")
        .select("credits")
        .eq("user_id", user.id)
        .single();

      if (currentCredits) {
        await supabase
          .from("user_credits")
          .update({ credits: currentCredits.credits + badge.creditReward })
          .eq("user_id", user.id);
      }

      // Save claimed badge
      const newClaimed = [...claimedBadges, badge.id];
      const { data: existing } = await supabase
        .from("admin_settings")
        .select("id")
        .eq("setting_key", `claimed_badges_${user.id}`)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("admin_settings")
          .update({ setting_value: { badges: newClaimed } as any })
          .eq("setting_key", `claimed_badges_${user.id}`);
      } else {
        await supabase
          .from("admin_settings")
          .insert({ setting_key: `claimed_badges_${user.id}`, setting_value: { badges: newClaimed } as any });
      }

      setClaimedBadges(newClaimed);
      setJustClaimed(badge.id);
      setTimeout(() => setJustClaimed(null), 2000);
      await refreshCredits();
      toast.success(`🎉 Badge "${badge.name}" réclamé ! +${badge.creditReward} crédits`);
    } catch {
      toast.error("Erreur lors de la réclamation du badge");
    } finally {
      setClaimingId(null);
    }
  };

  const getProgress = (badge: Badge) => {
    const current = stats[badge.requirement as keyof typeof stats] || 0;
    return Math.min(100, (current / badge.threshold) * 100);
  };

  const isUnlocked = (badge: Badge) => getProgress(badge) >= 100;
  const isClaimed = (badge: Badge) => claimedBadges.includes(badge.id);

  const unlockedCount = allBadges.filter(isUnlocked).length;
  const claimableCount = allBadges.filter(b => isUnlocked(b) && !isClaimed(b)).length;
  const totalRewardsEarned = allBadges.filter(b => isClaimed(b)).reduce((sum, b) => sum + b.creditReward, 0);
  const categories = [...new Set(allBadges.map(b => b.category))];

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Connectez-vous pour voir vos badges.</p>
          <Button onClick={() => navigate("/auth")}>Se connecter</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grain-overlay">
      <nav className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-2xl">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold font-display">Badges & Récompenses</span>
          {claimableCount > 0 && (
            <span className="ml-auto px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold animate-pulse">
              {claimableCount} à réclamer !
            </span>
          )}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display mb-3">Vos badges</h1>
          <p className="text-muted-foreground">
            <span className="text-primary font-bold">{unlockedCount}</span> / {allBadges.length} badges débloqués
          </p>
          <Progress value={(unlockedCount / allBadges.length) * 100} className="max-w-xs mx-auto mt-4" />
          {totalRewardsEarned > 0 && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <Coins className="w-3.5 h-3.5 text-primary" />
              <span className="font-bold text-primary">{totalRewardsEarned}</span> crédits gagnés grâce aux badges
            </p>
          )}
        </motion.div>

        {/* Stats summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {[
            { label: "Messages", value: stats.messages, icon: "💬" },
            { label: "Sites créés", value: stats.sites, icon: "🌐" },
            { label: "Jours actif", value: stats.days, icon: "📅" },
            { label: "Parrainages", value: stats.referrals, icon: "👥" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border/60 bg-card/50 p-4 text-center">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-2xl font-black text-primary">{s.value}</div>
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Badges by category */}
        {categories.map(cat => (
          <div key={cat} className="mb-8">
            <h2 className="text-lg font-bold font-display mb-4">{cat}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {allBadges.filter(b => b.category === cat).map((badge, i) => {
                const unlocked = isUnlocked(badge);
                const claimed = isClaimed(badge);
                const progress = getProgress(badge);
                const Icon = badge.icon;
                const current = stats[badge.requirement as keyof typeof stats] || 0;
                const canClaim = unlocked && !claimed;

                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "rounded-xl border p-4 text-center transition-all relative overflow-hidden",
                      claimed ? "border-primary/40 bg-primary/5" :
                      canClaim ? "border-primary/60 bg-primary/10 ring-2 ring-primary/30 shadow-lg" :
                      "border-border/60 bg-card/50 opacity-60"
                    )}
                  >
                    {/* Claimed checkmark */}
                    <AnimatePresence>
                      {justClaimed === badge.id && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="absolute inset-0 flex items-center justify-center bg-primary/20 backdrop-blur-sm z-10 rounded-xl"
                        >
                          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-6 h-6 text-primary-foreground" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className={cn(
                      "w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center",
                      unlocked ? `bg-gradient-to-br ${badge.gradient}` : "bg-muted"
                    )}>
                      <Icon className={cn("w-6 h-6", unlocked ? "text-white" : "text-muted-foreground")} />
                    </div>
                    <h4 className="font-bold text-sm mb-1">{badge.name}</h4>
                    <p className="text-[11px] text-muted-foreground mb-2">{badge.description}</p>
                    
                    {/* Credit reward indicator */}
                    <div className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mb-2",
                      claimed ? "bg-primary/10 text-primary" :
                      canClaim ? "bg-primary/20 text-primary" :
                      "bg-muted text-muted-foreground"
                    )}>
                      <Coins className="w-3 h-3" />
                      +{badge.creditReward} crédits
                    </div>

                    <Progress value={progress} className="h-1.5 mb-1" />
                    <span className="text-[10px] text-muted-foreground">{Math.min(current, badge.threshold)}/{badge.threshold}</span>

                    {/* Claim button */}
                    {canClaim && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                        <Button
                          size="sm"
                          className="w-full h-7 text-[11px] gap-1"
                          onClick={() => claimBadge(badge)}
                          disabled={claimingId === badge.id}
                        >
                          <Gift className="w-3 h-3" />
                          {claimingId === badge.id ? "..." : "Réclamer"}
                        </Button>
                      </motion.div>
                    )}
                    {claimed && (
                      <p className="text-[10px] text-primary font-medium mt-2 flex items-center justify-center gap-1">
                        <Check className="w-3 h-3" /> Réclamé
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
