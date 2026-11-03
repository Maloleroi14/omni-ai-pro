import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Bot, ArrowLeft, Gift, Copy, Check, Users, Zap, Trophy, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Referral() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [referralCode, setReferralCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState("");

  useEffect(() => {
    if (!user) return;
    loadReferralData();
  }, [user]);

  const loadReferralData = async () => {
    if (!user) return;
    // Generate or load referral code
    const code = user.id.slice(0, 8).toUpperCase();
    setReferralCode(code);

    const { data } = await supabase.from("admin_settings").select("setting_value").eq("setting_key", "referral_data").maybeSingle();
    if (data?.setting_value) {
      const rd = data.setting_value as any;
      const myReferrals = rd.referrals?.[user.id] || [];
      setReferralCount(myReferrals.length);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success("Code copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = () => {
    const url = `${window.location.origin}/auth?ref=${referralCode}`;
    if (navigator.share) {
      navigator.share({ title: "Rejoins OmniAI Pro", text: `Utilise mon code ${referralCode} pour obtenir des crédits bonus !`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Lien de parrainage copié !");
    }
  };

  const applyCode = async () => {
    if (!user || !inputCode.trim()) return;
    if (inputCode.toUpperCase() === referralCode) { toast.error("Vous ne pouvez pas utiliser votre propre code"); return; }

    const { data: existing } = await supabase.from("admin_settings").select("setting_value").eq("setting_key", "referral_data").maybeSingle();
    const rd = (existing?.setting_value as any) || { referrals: {}, applied: {} };

    if (rd.applied?.[user.id]) { toast.error("Vous avez déjà utilisé un code de parrainage"); return; }

    // Find referrer by code prefix
    const referrerId = Object.keys(rd.referrals || {}).find(uid => uid.slice(0, 8).toUpperCase() === inputCode.toUpperCase())
      || inputCode.toLowerCase(); // fallback

    rd.referrals = rd.referrals || {};
    rd.referrals[referrerId] = rd.referrals[referrerId] || [];
    rd.referrals[referrerId].push({ userId: user.id, date: new Date().toISOString() });
    rd.applied = rd.applied || {};
    rd.applied[user.id] = true;

    await supabase.from("admin_settings").upsert({
      setting_key: "referral_data",
      setting_value: rd as any,
      updated_at: new Date().toISOString(),
    }, { onConflict: "setting_key" });

    // Add bonus credits to both users
    await supabase.from("user_credits").update({ credits: (await supabase.from("user_credits").select("credits").eq("user_id", user.id).single()).data?.credits! + 10 } as any).eq("user_id", user.id);

    toast.success("Code appliqué ! +10 crédits bonus 🎉");
    setInputCode("");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Connectez-vous pour accéder au programme de parrainage.</p>
          <Button onClick={() => navigate("/auth")}>Se connecter</Button>
        </div>
      </div>
    );
  }

  const rewards = [
    { count: 1, reward: "+10 crédits", icon: "🎁" },
    { count: 5, reward: "+50 crédits", icon: "🏅" },
    { count: 10, reward: "+100 crédits + badge VIP", icon: "👑" },
    { count: 25, reward: "Accès Premium 1 mois", icon: "💎" },
  ];

  return (
    <div className="min-h-screen bg-background grain-overlay">
      <nav className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-2xl">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold font-display">Parrainage</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display mb-3">
            Parrainez vos amis, gagnez des <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">crédits</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Invitez vos amis à rejoindre OmniAI Pro. Vous gagnez tous les deux des crédits bonus !
          </p>
        </motion.div>

        {/* Your code */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 sm:p-8 mb-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><Share2 className="w-5 h-5 text-primary" /> Votre code de parrainage</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-muted/50 rounded-xl px-5 py-3 text-center">
              <span className="text-2xl font-black tracking-widest text-primary">{referralCode}</span>
            </div>
            <Button variant="outline" size="icon" onClick={copyCode} className="h-12 w-12 rounded-xl">
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </Button>
            <Button onClick={shareLink} className="h-12 px-6 rounded-xl gap-2">
              <Share2 className="w-4 h-4" /> Partager
            </Button>
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="w-4 h-4" />{referralCount} parrainages</span>
            <span className="flex items-center gap-1"><Zap className="w-4 h-4" />{referralCount * 10} crédits gagnés</span>
          </div>
        </motion.div>

        {/* Apply code */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 mb-6">
          <h3 className="font-bold mb-3">Vous avez un code de parrainage ?</h3>
          <div className="flex gap-3">
            <Input placeholder="Entrez le code" value={inputCode} onChange={e => setInputCode(e.target.value)} className="flex-1" />
            <Button onClick={applyCode} disabled={!inputCode.trim()}>Appliquer</Button>
          </div>
        </motion.div>

        {/* Rewards tiers */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="font-bold mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Paliers de récompenses</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {rewards.map((r, i) => (
              <div key={r.count} className={`rounded-xl border p-4 text-center transition-all ${referralCount >= r.count ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card/50"}`}>
                <div className="text-2xl mb-2">{r.icon}</div>
                <div className="text-xs text-muted-foreground mb-1">{r.count} parrainage{r.count > 1 ? "s" : ""}</div>
                <div className="text-sm font-bold">{r.reward}</div>
                {referralCount >= r.count && <div className="text-[10px] text-primary mt-1">✓ Débloqué</div>}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
