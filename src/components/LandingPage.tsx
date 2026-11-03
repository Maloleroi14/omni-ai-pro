import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Bot, ArrowRight, MessageCircle, Globe, Code, Zap, Shield, ExternalLink, Eye, Pencil, MoreVertical, Trash2, Star, Edit3, Layout, Image, Sparkles, Play, Users, Search, Menu, CreditCard, ShoppingCart, HelpCircle, Rocket, Mail, BookOpen, Gift, Trophy, Briefcase, FileText, Map, ThumbsUp, Gamepad2, Mic } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { UserMenu } from "@/components/UserMenu";
import { motion, AnimatePresence, useMotionValue, useTransform, useInView } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
// BuyCreditsDialog moved to UserMenu
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { StatsAndPartners } from "@/components/StatsAndPartners";
import { SecurityBadges } from "@/components/SecurityBadges";
import { NewsletterSection } from "@/components/NewsletterSection";

// Animated counter hook
function useAnimatedCounter(target: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!startOnView || !inView || hasStarted.current) return;
    hasStarted.current = true;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration, startOnView]);

  return { count, ref };
}

// Typing animation hook
function useTypingEffect(texts: string[], speed = 60, pause = 2000) {
  const [displayed, setDisplayed] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = texts[textIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (charIndex < currentText.length) {
          setDisplayed(currentText.slice(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        } else {
          setTimeout(() => setIsDeleting(true), pause);
        }
      } else {
        if (charIndex > 0) {
          setDisplayed(currentText.slice(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        } else {
          setIsDeleting(false);
          setTextIndex((textIndex + 1) % texts.length);
        }
      }
    }, isDeleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, textIndex, texts, speed, pause]);

  return displayed;
}

const steps = [
  {
    number: "01",
    title: "Décris ton besoin",
    description: "Pose une question, décris une image ou demande un site web — en langage naturel.",
    icon: MessageCircle,
  },
  {
    number: "02",
    title: "L'IA crée en temps réel",
    description: "Regarde ta demande prendre vie instantanément grâce à notre IA de dernière génération.",
    icon: Sparkles,
  },
  {
    number: "03",
    title: "Personnalise et partage",
    description: "Affine le résultat avec des instructions simples et partage-le avec le monde.",
    icon: Globe,
  },
];

const features = [
  {
    icon: MessageCircle,
    title: "Chat ultra-intelligent",
    description: "Des réponses précises et nuancées à toutes tes questions, en temps réel.",
    gradient: "from-blue-500 to-cyan-500",
    badge: "Popular",
  },
  {
    icon: Image,
    title: "Génération d'images",
    description: "Crée des visuels uniques à partir d'une simple description textuelle.",
    gradient: "from-pink-500 to-rose-500",
    badge: "New",
  },
  {
    icon: Globe,
    title: "Recherche web",
    description: "L'IA parcourt le web et te rapporte les informations les plus récentes.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Code,
    title: "Création de sites",
    description: "Génère des sites web complets en HTML, CSS et JavaScript en quelques secondes.",
    gradient: "from-violet-500 to-purple-500",
    badge: "New",
  },
  {
    icon: Zap,
    title: "Rapide & installable",
    description: "App progressive installable sur ton téléphone, ultra-rapide.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: Shield,
    title: "Sécurisé & privé",
    description: "Tes conversations sont chiffrées et tes données restent confidentielles.",
    gradient: "from-teal-500 to-cyan-500",
  },
];

const testimonials = [
  { name: "Sarah M.", role: "Designer freelance", text: "Omni AI Pro a transformé ma façon de travailler. Je crée des maquettes en quelques secondes.", avatar: "SM" },
  { name: "Lucas D.", role: "Développeur web", text: "Le générateur de sites est incroyable. J'ai gagné des heures de travail sur chaque projet.", avatar: "LD" },
  { name: "Emma R.", role: "Étudiante", text: "Pour mes recherches et mes projets, c'est devenu mon outil indispensable au quotidien.", avatar: "ER" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// Floating orbs with color cycling and parallax
function FloatingOrbs() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const orbs = [
    { size: 300, x: "15%", y: "20%", duration: 20, colors: ["hsl(250, 85%, 65%)", "hsl(280, 80%, 60%)", "hsl(320, 80%, 60%)", "hsl(250, 85%, 65%)"] },
    { size: 200, x: "75%", y: "30%", duration: 25, colors: ["hsl(330, 80%, 60%)", "hsl(30, 90%, 60%)", "hsl(280, 80%, 60%)", "hsl(330, 80%, 60%)"] },
    { size: 250, x: "50%", y: "70%", duration: 22, colors: ["hsl(180, 80%, 55%)", "hsl(220, 80%, 60%)", "hsl(250, 85%, 65%)", "hsl(180, 80%, 55%)"] },
    { size: 150, x: "85%", y: "75%", duration: 18, colors: ["hsl(40, 90%, 55%)", "hsl(350, 80%, 60%)", "hsl(280, 80%, 55%)", "hsl(40, 90%, 55%)"] },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl opacity-20"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            transform: `translateY(${scrollY * (0.1 + i * 0.05)}px)`,
          }}
          animate={{
            x: [0, 30, -20, 10, 0],
            y: [0, -20, 15, -10, 0],
            scale: [1, 1.1, 0.95, 1.05, 1],
            backgroundColor: orb.colors,
          }}
          transition={{ duration: orb.duration, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// Scroll-aware navbar
function NavBar() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [scrolled, setScrolled] = useState(false);
  

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 border-b transition-all duration-500",
      scrolled 
        ? "bg-background/90 backdrop-blur-2xl border-border/60 shadow-sm" 
        : "bg-background/40 backdrop-blur-xl border-transparent"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => navigate("/voice")} className="gap-2 font-semibold text-primary">
                <Mic className="w-4 h-4" /> Microphone
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/pricing")} className="gap-2">
                <CreditCard className="w-4 h-4" />
                Abonnements
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/changelog")} className="gap-2">
                <Rocket className="w-4 h-4" />
                Changelog
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/contact")} className="gap-2">
                <Mail className="w-4 h-4" />
                Contact
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/blog")} className="gap-2">
                <BookOpen className="w-4 h-4" />
                Blog
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/roadmap")} className="gap-2">
                <Map className="w-4 h-4" />
                Roadmap
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/help")} className="gap-2">
                <HelpCircle className="w-4 h-4" />
                Centre d'aide
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/vote")} className="gap-2">
                <ThumbsUp className="w-4 h-4" />
                Vote
              </DropdownMenuItem>
              {user && (
                <>
                  <DropdownMenuItem onClick={() => navigate("/referral")} className="gap-2">
                    <Gift className="w-4 h-4" />
                    Parrainage
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/badges")} className="gap-2">
                    <Trophy className="w-4 h-4" />
                    Badges
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
            <Bot className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <span className="font-bold font-display text-lg tracking-tight">Omni AI Pro</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <LanguageToggle />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [promptText, setPromptText] = useState("");
  const [activeTab, setActiveTab] = useState<"design" | "templates" | "games" | "all" | null>(null);
  const [mySites, setMySites] = useState<any[]>([]);
  const [templateSites, setTemplateSites] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [allSearchQuery, setAllSearchQuery] = useState("");
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});
  

  const typedText = useTypingEffect([
    "Crée-moi un portfolio moderne",
    "Explique-moi la physique quantique",
    "Génère une image de paysage futuriste",
    "Recherche les dernières tendances tech",
    "Construis un site e-commerce",
  ], 50, 2500);

  const CREATOR_EMAIL = "omniaiproultime@gmail.com";
  const isCreator = user?.email === CREATOR_EMAIL;

  const fetchData = async () => {

    if (user) {
      const { data: mine } = await supabase
        .from("user_projects")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(12);
      if (mine) setMySites(mine);
    }

    const { data: templates } = await supabase
      .from("user_projects")
      .select("*")
      .eq("is_template", true)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(12);
    if (templates) setTemplateSites(templates);

    // Creator: fetch ALL user projects
    if (user?.email === CREATOR_EMAIL) {
      const { data: all } = await supabase
        .from("user_projects")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (all) {
        setAllProjects(all);
        const userIds = [...new Set(all.map((p: any) => p.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, email")
            .in("user_id", userIds);
          if (profiles) {
            const map: Record<string, string> = {};
            profiles.forEach((p: any) => { map[p.user_id] = p.email; });
            setUserEmails(map);
          }
        }
      }
    }
  };

  useEffect(() => { fetchData(); }, [user]);


  const handleGetStarted = () => navigate(user ? "/build" : "/auth");

  const handlePromptSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = promptText.trim();
    if (!text) return;
    navigate(`/build?q=${encodeURIComponent(text)}`);
  };

  const generateSitePreview = (project: any) => {
    const html = project.html_code || "";
    const css = project.css_code || "";
    const js = project.js_code || "";
    return `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`;
  };

  const deleteSite = async (id: string) => {
    await supabase.from("user_projects").delete().eq("id", id);
    setMySites(prev => prev.filter(s => s.id !== id));
    toast.success("Projet supprimé");
  };

  const toggleTemplate = async (id: string, current: boolean) => {
    const name = current ? null : prompt("Nom du modèle :");
    if (!current && !name) return;
    await supabase.from("user_projects").update({ is_template: !current, template_name: name } as any).eq("id", id);
    fetchData();
    toast.success(current ? "Retiré des modèles" : "Ajouté aux modèles");
  };

  const deleteAnyProject = async (id: string) => {
    if (!confirm("Supprimer définitivement ce projet ? Cette action est irréversible.")) return;
    await supabase.from("user_projects").delete().eq("id", id);
    setAllProjects(prev => prev.filter(s => s.id !== id));
    setMySites(prev => prev.filter(s => s.id !== id));
    toast.success("Projet supprimé définitivement");
  };

  const renameSite = async (id: string) => {
    const name = prompt("Nouveau nom :");
    if (!name) return;
    await supabase.from("user_projects").update({ name } as any).eq("id", id);
    setMySites(prev => prev.map(s => s.id === id ? { ...s, name } : s));
    toast.success("Projet renommé");
  };

  // Stats with animated counters
  const stat1 = useAnimatedCounter(500, 2000);
  const stat2 = useAnimatedCounter(50, 2000);
  const stat3 = useAnimatedCounter(99, 1500);

  const swipeTouchStartX = useRef(0);
  const swipeTouchStartY = useRef(0);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      swipeTouchStartX.current = e.touches[0].clientX;
      swipeTouchStartY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const diffX = e.changedTouches[0].clientX - swipeTouchStartX.current;
      const diffY = Math.abs(e.changedTouches[0].clientY - swipeTouchStartY.current);
      // Swipe right (left-to-right) to go to OmniAI
      if (diffX > 80 && diffY < 100) {
        sessionStorage.setItem("swipe-direction", "right");
        navigate("/research");
      }
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [navigate]);

  const swipeDir = (() => {
    const d = sessionStorage.getItem("swipe-direction");
    sessionStorage.removeItem("swipe-direction");
    return d;
  })();

  return (
    <motion.div
      initial={{ x: swipeDir === "right" ? "100%" : swipeDir === "left" ? "-100%" : 0, opacity: swipeDir ? 0.5 : 1 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="min-h-screen bg-background text-foreground overflow-x-hidden grain-overlay"
    >

      {/* Nav - scroll-aware */}
      <NavBar />

      {/* Hero */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-4 pt-14">
        <FloatingOrbs />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background z-[1]" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3 h-3" />
              Propulsé par les meilleurs modèles IA
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20, rotateX: 15 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            style={{ perspective: 1000 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold font-display tracking-tight leading-[1.08] mb-6">
              L'IA qui{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  crée pour toi
                </span>
                <motion.span
                  className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-primary via-purple-500 to-pink-500"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: "left" }}
                />
              </span>
            </h1>
          </motion.div>

          <motion.p
            className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            Chat intelligent, images, recherche web, sites web — tout ce dont tu as besoin, dans une seule app.
          </motion.p>

          {/* Prompt box */}
          <motion.div
            className="max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <form
              onSubmit={handlePromptSubmit}
              className="relative bg-card/60 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl shadow-primary/10 p-3 sm:p-4 hover:border-primary/30 transition-all duration-300 focus-within:border-primary/40 focus-within:shadow-primary/15 ring-1 ring-white/5"
            >
              <div className="flex items-end gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handlePromptSubmit();
                      }
                    }}
                    placeholder={typedText + "▌"}
                    className="w-full bg-transparent resize-none outline-none text-sm sm:text-base text-foreground placeholder:text-muted-foreground/60 leading-relaxed min-h-[24px] max-h-[120px]"
                    rows={1}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!promptText.trim()}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center shrink-0 hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                >
                  <ArrowRight className="w-4 h-4 text-primary-foreground" />
                </button>
              </div>
            </form>

          </motion.div>

          {/* Showcase Tabs */}
          <motion.div
            className="max-w-2xl mx-auto mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <div className="flex justify-center gap-2 mb-4 flex-wrap">
              {[
                { id: "design" as const, icon: Code, label: "Mes sites", count: mySites.length, needsAuth: true },
                { id: "templates" as const, icon: Layout, label: "Modèles", count: templateSites.length },
                { id: "games" as const, icon: Gamepad2, label: "Jeux" },
                ...(isCreator ? [{ id: "all" as const, icon: Users, label: "Toutes les créations", count: allProjects.length }] : []),
              ].map((tab) => {
                if ((tab as any).needsAuth && !user) return null;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border transition-all duration-300 ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/25"
                        : "bg-card/60 backdrop-blur border-border/60 hover:border-primary/40 text-foreground"
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-primary-foreground/20 text-[9px]">{tab.count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">

              {activeTab === "design" && (
                <motion.div key="design" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.25 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                  {mySites.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-muted-foreground text-sm">Tu n'as pas encore créé de site.</div>
                  ) : (
                    mySites.map((site) => (
                      <div key={site.id} className="group rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden hover:border-primary/30 hover:bg-card transition-all duration-300 relative">
                        <div className="relative w-full h-28 bg-muted overflow-hidden">
                          <iframe srcDoc={generateSitePreview(site)} className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none border-0" sandbox="allow-scripts" title={site.name} />
                          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                          <div className="absolute bottom-2 right-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background">
                                  <MoreVertical className="w-3.5 h-3.5 text-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={() => navigate(`/build?project=${site.id}`)}>
                                  <Pencil className="w-3.5 h-3.5 mr-2" /> Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => renameSite(site.id)}>
                                  <Edit3 className="w-3.5 h-3.5 mr-2" /> Renommer
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleTemplate(site.id, !!site.is_template)}>
                                  <Star className="w-3.5 h-3.5 mr-2" /> {site.is_template ? "Retirer des modèles" : "Ajouter aux modèles"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => deleteSite(site.id)} className="text-destructive">
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center"><Globe className="w-3 h-3 text-primary" /></div>
                            <h4 className="font-semibold text-xs truncate">{site.name}</h4>
                            {site.is_template && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">Modèle</span>}
                            {!site.is_published && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Brouillon</span>}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 gap-1 rounded-lg text-[11px] h-7" onClick={() => {
                              if (site.published_url) {
                                const slug = site.published_url.replace(".omni-ai-pro.com", "");
                                window.open(`/s/${slug}`, "_blank");
                              } else {
                                navigate(`/build?project=${site.id}`);
                              }
                            }}><Eye className="w-3 h-3" /> {site.is_published ? "Voir" : "Ouvrir"}</Button>
                            <Button size="sm" className="flex-1 gap-1 rounded-lg text-[11px] h-7" onClick={() => navigate(`/build?project=${site.id}`)}><Pencil className="w-3 h-3" /> Modifier</Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}

              {activeTab === "templates" && (
                <motion.div key="templates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.25 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                  {templateSites.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-muted-foreground text-sm">Aucun modèle disponible pour le moment.</div>
                  ) : (
                    templateSites.map((site) => (
                      <div key={site.id} className="group rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden hover:border-primary/30 hover:bg-card transition-all duration-300">
                        <div className="relative w-full h-28 bg-muted overflow-hidden">
                          <iframe srcDoc={generateSitePreview(site)} className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none border-0" sandbox="allow-scripts" title={site.template_name || site.name} />
                          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                        </div>
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center"><Star className="w-3 h-3 text-accent-foreground" /></div>
                            <h4 className="font-semibold text-xs truncate">{site.template_name || site.name}</h4>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 gap-1 rounded-lg text-[11px] h-7" onClick={() => navigate(user ? `/build?project=${site.id}` : "/auth")}><Eye className="w-3 h-3" /> Utiliser</Button>
                            <Button size="sm" className="flex-1 gap-1 rounded-lg text-[11px] h-7" onClick={() => navigate(user ? `/build?project=${site.id}` : "/auth")}><Pencil className="w-3 h-3" /> Modifier</Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}

              {activeTab === "games" && (
                <motion.div key="games" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.25 }} className="text-center py-12">
                  <Gamepad2 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">Les jeux générés par l'IA apparaîtront ici.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Demande à l'IA de créer un jeu pour commencer !</p>
                </motion.div>
              )}


              {activeTab === "all" && isCreator && (
                <motion.div key="all" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.25 }} className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={allSearchQuery}
                      onChange={(e) => setAllSearchQuery(e.target.value)}
                      placeholder="Rechercher par nom ou email..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/40 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto pr-1">
                  {(() => {
                    const q = allSearchQuery.toLowerCase();
                    const filtered = q ? allProjects.filter(s => s.name?.toLowerCase().includes(q) || s.user_id?.toLowerCase().includes(q) || (userEmails[s.user_id] || "").toLowerCase().includes(q)) : allProjects;
                    return filtered.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-muted-foreground text-sm">Aucune création trouvée.</div>
                    ) : (
                      filtered.map((site) => (
                      <div key={site.id} className="group rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden hover:border-primary/30 hover:bg-card transition-all duration-300 relative">
                        <div className="relative w-full h-28 bg-muted overflow-hidden">
                          <iframe srcDoc={generateSitePreview(site)} className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none border-0" sandbox="allow-scripts" title={site.name} />
                          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                          <div className="absolute bottom-2 right-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background">
                                  <MoreVertical className="w-3.5 h-3.5 text-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={() => navigate(`/build?project=${site.id}`)}>
                                  <Pencil className="w-3.5 h-3.5 mr-2" /> Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => deleteAnyProject(site.id)} className="text-destructive">
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Supprimer définitivement
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center"><Globe className="w-3 h-3 text-primary" /></div>
                            <h4 className="font-semibold text-xs truncate">{site.name}</h4>
                          </div>
                          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground truncate max-w-[140px]">{userEmails[site.user_id] || site.user_id?.slice(0, 8) + "…"}</span>
                            {site.is_published && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600">Publié</span>}
                            {!site.is_published && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Brouillon</span>}
                            {site.is_template && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">Modèle</span>}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 gap-1 rounded-lg text-[11px] h-7" onClick={() => navigate(`/build?project=${site.id}`)}><Pencil className="w-3 h-3" /> Modifier</Button>
                            <Button size="sm" variant="destructive" className="flex-1 gap-1 rounded-lg text-[11px] h-7" onClick={() => deleteAnyProject(site.id)}><Trash2 className="w-3 h-3" /> Supprimer</Button>
                          </div>
                        </div>
                      </div>
                    ))
                    );
                  })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1.5">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
              animate={{ y: [0, 16, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-20 md:py-32 px-4 sm:px-6 mesh-gradient-2">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16 md:mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Comment ça marche
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
              Trois étapes simples pour exploiter toute la puissance de l'IA.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                className="relative group"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i + 1}
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/10 group-hover:rotate-3 transition-all duration-300">
                    <step.icon className="w-7 h-7 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <span className="absolute -top-2 -left-2 text-5xl font-black text-primary/8 select-none font-display">{step.number}</span>
                </div>
                <h3 className="text-xl font-bold font-display mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20 md:py-32 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-muted/30 mesh-gradient-1" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            className="text-center mb-16 md:mb-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Tout-en-un, vraiment
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
              Une suite complète d'outils IA dans une seule application.
            </p>
          </motion.div>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-30px" }}
            variants={staggerContainer}
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                className="group relative rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 sm:p-8 hover:border-primary/30 hover:bg-card transition-all duration-500 overflow-hidden card-glow gradient-border hover:shadow-xl hover:shadow-primary/10"
                variants={fadeUp}
                custom={0}
                whileHover={{ y: -6, rotateX: 2, rotateY: -2 }}
                style={{ perspective: 800, transformStyle: "preserve-3d" }}
              >
                {/* Badge */}
                {feature.badge && (
                  <div className="absolute top-3 right-3">
                    <span className={cn(
                      "text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse",
                      feature.badge === "New" ? "bg-green-500/15 text-green-500 border border-green-500/30" : "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                    )}>
                      {feature.badge}
                    </span>
                  </div>
                )}
                {/* Subtle gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500`} />
                <div className="relative">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 sm:mb-6 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg transition-all duration-300`}>
                    <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold font-display mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats & Partners */}
      <StatsAndPartners />

      {/* Testimonials */}
      <section className="py-20 md:py-28 px-4 sm:px-6 mesh-gradient-2">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Ils adorent Omni AI Pro
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
              Découvre pourquoi nos utilisateurs ne peuvent plus s'en passer.
            </p>
          </motion.div>

          <motion.div
            className="grid sm:grid-cols-3 gap-4 sm:gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-30px" }}
            variants={staggerContainer}
          >
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 hover:border-primary/20 transition-all duration-300"
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">{t.role}</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed italic">"{t.text}"</p>
                <div className="flex gap-0.5 mt-3">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Security Badges */}
      <SecurityBadges />

      {/* Newsletter */}
      <NewsletterSection />

      {/* Final CTA */}
      <section className="py-20 md:py-32 px-4 sm:px-6">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          custom={0}
        >
          <div className="relative rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/15 to-pink-500/20" />
            <div className="relative px-6 py-14 sm:px-16 sm:py-24">
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 sm:mb-6">
                Prêt à commencer ?
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto mb-8 sm:mb-10">
                Rejoins des centaines d'utilisateurs qui utilisent déjà Omni AI Pro. Gratuit, sans carte bancaire.
              </p>
              <Button
                size="lg"
                className="text-sm sm:text-base px-8 sm:px-10 h-12 sm:h-13 rounded-full gap-2 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:scale-105 active:scale-95"
                onClick={handleGetStarted}
              >
                Créer mon compte gratuit
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-10 sm:py-14 border-t border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <span className="font-semibold text-sm">Omni AI Pro</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                La plateforme IA tout-en-un pour créer, explorer et innover.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Produit</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><button onClick={() => navigate("/pricing")} className="hover:text-foreground transition-colors">Abonnements</button></li>
                <li><button onClick={() => navigate("/changelog")} className="hover:text-foreground transition-colors">Changelog</button></li>
                <li><button onClick={() => navigate("/roadmap")} className="hover:text-foreground transition-colors">Roadmap</button></li>
                
              </ul>
            </div>

            {/* Entreprise */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Entreprise</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><button onClick={() => navigate("/careers")} className="hover:text-foreground transition-colors">Carrières</button></li>
                <li><button onClick={() => navigate("/blog")} className="hover:text-foreground transition-colors">Blog</button></li>
              </ul>
            </div>

            {/* Légal */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Légal</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Confidentialité</button></li>
                <li><button onClick={() => navigate("/legal")} className="hover:text-foreground transition-colors">Mentions légales</button></li>
                <li><button onClick={() => navigate("/contact")} className="hover:text-foreground transition-colors">Contact</button></li>
                
              </ul>
            </div>
          </div>

          <div className="border-t border-border/50 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Omni AI Pro — Tous droits réservés
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Confidentialité</button>
              <button onClick={() => navigate("/legal")} className="hover:text-foreground transition-colors">Mentions légales</button>
            </div>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
