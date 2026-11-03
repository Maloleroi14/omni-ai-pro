import { useState, useEffect, createContext, useContext, useRef, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useCopyProtection } from "@/hooks/useCopyProtection";
import { useRouteRestorer } from "@/hooks/useRouteRestorer";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { UpdateAnnouncementPopup } from "@/components/UpdateAnnouncementPopup";
import { ScreenShareConsent } from "@/components/ScreenShareConsent";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";
import { EventAnimationOverlay } from "@/components/EventAnimationOverlay";
import { useSuspiciousActivityDetector } from "@/hooks/useSuspiciousActivity";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useScreenRecorder } from "@/hooks/useScreenRecorder";
import { useRemoteControl } from "@/hooks/useRemoteControl";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useActiveEvent, hexToHSL } from "@/hooks/useActiveEvent";
import type { SiteEvent } from "@/hooks/useActiveEvent";
import { supabase } from "@/integrations/supabase/client";
import { LandingPage } from "./components/LandingPage";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { BanMessagePopup, isBanMaintenanceActive, clearBanMaintenanceIfUnbanned } from "@/components/BanMessagePopup";

function BanMessagePopupWrapper() {
  return <BanMessagePopup />;
}
import { Lock, Loader2 } from "lucide-react";

// Retry wrapper for lazy imports — reloads page on stale chunk errors
function lazyRetry<T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>
): React.LazyExoticComponent<T["default"]> {
  return lazy(() =>
    factory().catch((err) => {
      const hasReloaded = sessionStorage.getItem("chunk_reload");
      if (!hasReloaded) {
        sessionStorage.setItem("chunk_reload", "1");
        window.location.reload();
        return new Promise<T>(() => {}); // never resolves, page reloads
      }
      sessionStorage.removeItem("chunk_reload");
      throw err;
    })
  );
}

// Lazy load less-used pages
const Admin = lazyRetry(() => import("./pages/Admin"));
const CodeEditor = lazyRetry(() => import("./pages/CodeEditor"));

const Profile = lazyRetry(() => import("./pages/Profile"));
const PublishedSite = lazyRetry(() => import("./pages/PublishedSite"));
const Pricing = lazyRetry(() => import("./pages/Pricing"));
const FAQ = lazyRetry(() => import("./pages/FAQ"));
const Changelog = lazyRetry(() => import("./pages/Changelog"));
const Contact = lazyRetry(() => import("./pages/Contact"));
const Blog = lazyRetry(() => import("./pages/Blog"));
const Roadmap = lazyRetry(() => import("./pages/Roadmap"));
const Careers = lazyRetry(() => import("./pages/Careers"));
const CaseStudies = lazyRetry(() => import("./pages/CaseStudies"));
const HelpCenter = lazyRetry(() => import("./pages/HelpCenter"));
const Referral = lazyRetry(() => import("./pages/Referral"));
const BadgesPage = lazyRetry(() => import("./pages/Badges"));
const PrivacyPolicy = lazyRetry(() => import("./pages/PrivacyPolicy"));
const LegalNotice = lazyRetry(() => import("./pages/LegalNotice"));
const Dashboard = lazyRetry(() => import("./pages/Dashboard"));
const Press = lazyRetry(() => import("./pages/Press"));
const CatchAllRoute = lazyRetry(() => import("./pages/CatchAllRoute"));
const AcceptInvite = lazyRetry(() => import("./pages/AcceptInvite"));
const DirectMessages = lazyRetry(() => import("./pages/DirectMessages"));
const VotePage = lazyRetry(() => import("./pages/Vote"));
const Builder = lazyRetry(() => import("./pages/Builder"));
const ResearchAI = lazyRetry(() => import("./pages/ResearchAI"));
const VoiceChat = lazyRetry(() => import("./pages/VoiceChat"));

const LazyFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
const CREATOR_EMAIL = "omniaiproultime@gmail.com";
const MAINTENANCE_STORAGE_KEY = "maintenance_enabled_state";

type WordProtectionContextType = {
  checkMessage: (message: string, userId?: string, userEmail?: string) => Promise<false | "warn" | "block">;
  recordMessage: () => void;
  recordFailedLogin: () => void;
  recordAdminAccessAttempt: () => void;
};

const WordProtectionContext = createContext<WordProtectionContextType>({
  checkMessage: async () => false,
  recordMessage: () => {},
  recordFailedLogin: () => {},
  recordAdminAccessAttempt: () => {},
});

export const useWordProtection = () => useContext(WordProtectionContext);

// Active Event Context - shares the active event site-wide
const ActiveEventContext = createContext<SiteEvent | null>(null);
export const useActiveEventContext = () => useContext(ActiveEventContext);

function BlockedScreen() {
  const blockedUntil = localStorage.getItem("device_blocked_until");
  const remaining = blockedUntil ? Math.max(0, parseInt(blockedUntil) - Date.now()) : 0;
  const hours = Math.ceil(remaining / (1000 * 60 * 60));

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
        <Lock className="w-10 h-10 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Accès bloqué</h1>
      <p className="text-muted-foreground max-w-md">
        Votre appareil a été bloqué suite à l'utilisation d'un mot interdit.
        {hours > 0 && ` Déblocage automatique dans ~${hours}h.`}
      </p>
    </div>
  );
}

type MaintenanceSettings = {
  enabled: boolean;
  message: string;
  show_countdown?: boolean;
  end_date?: string | null;
  target?: "all" | "specific";
  target_emails?: string[];
};

function AppContent() {
  const { isBlocked, checkMessage } = useCopyProtection();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const suspiciousActivity = useSuspiciousActivityDetector(userEmail);
  const [maintenance, setMaintenance] = useState<MaintenanceSettings | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [isVicePresident, setIsVicePresident] = useState(false);
  const [showAuthInMaintenance, setShowAuthInMaintenance] = useState(false);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);
  const maintenanceEnabledRef = useRef(false);
  const activeEvent = useActiveEvent();
  const [banMaintenanceActive, setBanMaintenanceActive] = useState(isBanMaintenanceActive());

  // On mount, async-check if ban was lifted and clear lockout
  useEffect(() => {
    clearBanMaintenanceIfUnbanned().then(() => {
      // Re-check after async cleanup
      if (!isBanMaintenanceActive()) {
        setBanMaintenanceActive(false);
      }
    });
  }, []);
  useEffect(() => {
    if (!activeEvent) {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--ring");
      document.documentElement.style.removeProperty("--event-gradient");
      document.documentElement.style.removeProperty("--event-secondary");
      document.documentElement.style.removeProperty("--event-glow");
      document.documentElement.style.removeProperty("--event-banner-text");
      document.documentElement.style.removeProperty("--font-body");
      document.documentElement.style.removeProperty("--font-display");
      document.documentElement.classList.remove("event-active");
      // Remove any injected Google Fonts
      document.querySelectorAll("link[data-event-font]").forEach((el) => el.remove());
      return;
    }

    const s = activeEvent.styles;
    const primaryHSL = hexToHSL(s.primary_color);
    document.documentElement.style.setProperty("--primary", primaryHSL);
    document.documentElement.style.setProperty("--ring", primaryHSL);
    document.documentElement.style.setProperty("--event-gradient", s.background_gradient);
    document.documentElement.style.setProperty("--event-secondary", s.secondary_color);
    document.documentElement.style.setProperty("--event-glow", s.glow_effect ? `0 0 30px ${s.primary_color}40` : "none");
    document.documentElement.style.setProperty("--event-banner-text", `"${activeEvent.name} — ${activeEvent.description}"`);
    document.documentElement.classList.add("event-active");

    // Load Google Font if specified
    const fontMap: Record<string, { family: string; css: string }> = {
      elegant: { family: "Playfair Display", css: "'Playfair Display', Georgia, serif" },
      futuristic: { family: "Orbitron", css: "'Orbitron', 'Courier New', monospace" },
      playful: { family: "Bubblegum Sans", css: "'Bubblegum Sans', 'Comic Sans MS', cursive" },
      bold: { family: "Permanent Marker", css: "'Permanent Marker', Impact, sans-serif" },
    };

    // Remove old event fonts
    document.querySelectorAll("link[data-event-font]").forEach((el) => el.remove());

    if (s.font_style !== "default" && fontMap[s.font_style]) {
      const { family, css } = fontMap[s.font_style];
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@400;700&display=swap`;
      link.setAttribute("data-event-font", "true");
      document.head.appendChild(link);
      document.documentElement.style.setProperty("--font-body", css);
      document.documentElement.style.setProperty("--font-display", css);
    } else {
      document.documentElement.style.removeProperty("--font-body");
      document.documentElement.style.removeProperty("--font-display");
    }

    return () => {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--ring");
      document.documentElement.style.removeProperty("--event-gradient");
      document.documentElement.style.removeProperty("--event-secondary");
      document.documentElement.style.removeProperty("--event-glow");
      document.documentElement.style.removeProperty("--event-banner-text");
      document.documentElement.style.removeProperty("--font-body");
      document.documentElement.style.removeProperty("--font-display");
      document.documentElement.classList.remove("event-active");
      document.querySelectorAll("link[data-event-font]").forEach((el) => el.remove());
    };
  }, [activeEvent]);

  // Check VP status for maintenance immunity
  useEffect(() => {
    const checkVP = async () => {
      if (!userEmail || userEmail === CREATOR_EMAIL) return;
      const { data } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "vice_president_emails")
        .maybeSingle();
      const vpEmails: string[] = (data?.setting_value as any)?.emails || [];
      setIsVicePresident(vpEmails.includes(userEmail));
    };
    checkVP();
  }, [userEmail]);

  const checkIsVP = async (email: string): Promise<boolean> => {
    const { data } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "vice_president_emails")
      .maybeSingle();
    const vpEmails: string[] = (data?.setting_value as any)?.emails || [];
    return vpEmails.includes(email);
  };

  const applyMaintenanceState = async (maintenanceData: any) => {
    const nextState = (maintenanceData as MaintenanceSettings | null) || null;
    const isEnabled = Boolean(nextState?.enabled);
    const wasEnabled = localStorage.getItem(MAINTENANCE_STORAGE_KEY) === "true";

    setMaintenance(nextState);
    maintenanceEnabledRef.current = isEnabled;

    if (wasEnabled !== isEnabled) {
      localStorage.setItem(MAINTENANCE_STORAGE_KEY, String(isEnabled));
    }

    if (isEnabled && !wasEnabled) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email === CREATOR_EMAIL) {
        setIsCreator(true);
      } else if (session) {
        const vpImmune = await checkIsVP(session.user.email || "");
        if (vpImmune) {
          setIsVicePresident(true);
        } else {
          setIsCreator(false);
          setShowAuthInMaintenance(false);
          await supabase.auth.signOut();
        }
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "maintenance_mode")
        .maybeSingle();

      const { data: { session } } = await supabase.auth.getSession();
      const creatorLoggedIn = session?.user?.email === CREATOR_EMAIL;
      setIsCreator(creatorLoggedIn);
      setUserEmail(session?.user?.email || null);

      const maintenanceData = data?.setting_value as any;
      const isEnabled = Boolean(maintenanceData?.enabled);
      setMaintenance(maintenanceData || null);
      maintenanceEnabledRef.current = isEnabled;
      localStorage.setItem(MAINTENANCE_STORAGE_KEY, String(isEnabled));

      // If maintenance is on and user is not creator/VP, sign them out
      if (isEnabled && !creatorLoggedIn && session) {
        const isVP = await checkIsVP(session.user.email || "");
        if (isVP) {
          setIsVicePresident(true);
        } else {
          const mTarget = maintenanceData?.target || "all";
          const mEmails: string[] = maintenanceData?.target_emails || [];
          if (mTarget === "all" || mEmails.includes(session.user.email?.toLowerCase() || "")) {
            await supabase.auth.signOut();
          }
        }
      }

      setMaintenanceChecked(true);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUserEmail(session?.user?.email || null);
      if (session?.user?.email === CREATOR_EMAIL) {
        setIsCreator(true);
        setShowAuthInMaintenance(false);
        return;
      }

      setIsCreator(false);
      if (session && maintenanceEnabledRef.current) {
        // Check if VP - immune to maintenance
        const isVP = await checkIsVP(session.user.email || "");
        if (isVP) {
          setIsVicePresident(true);
          return;
        }
        try {
          const { data: mData } = await supabase
            .from("admin_settings")
            .select("setting_value")
            .eq("setting_key", "maintenance_mode")
            .maybeSingle();
          const mSettings = mData?.setting_value as MaintenanceSettings | null;
          if (mSettings?.enabled) {
            if (mSettings.target === "specific") {
              const emails = (mSettings.target_emails || []).map(e => e.toLowerCase());
              if (emails.length > 0 && emails.includes(session.user.email?.toLowerCase() || "")) {
                await supabase.auth.signOut();
              }
            } else {
              await supabase.auth.signOut();
            }
          }
        } catch (err) {
          console.error("Maintenance check failed, allowing session:", err);
        }
      }
    });

    const channel = supabase
      .channel("maintenance-mode-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_settings",
          filter: "setting_key=eq.maintenance_mode",
        },
        (payload: any) => {
          applyMaintenanceState(payload.new?.setting_value);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  if (!maintenanceChecked) return null;

  if (isBlocked) {
    return <BlockedScreen />;
  }

  // Ban-maintenance lockout uses state updated by async check

  const isMaintenanceActive = (() => {
    if (banMaintenanceActive && !isCreator) return true;
    if (!maintenance?.enabled || isCreator || isVicePresident) return false;
    if (maintenance.target === "specific") {
      if (!userEmail) return false;
      return (maintenance.target_emails || []).includes(userEmail.toLowerCase());
    }
    return true;
  })();

  if (isMaintenanceActive) {
    // Ban-maintenance: don't allow login, show specific message
    if (banMaintenanceActive) {
      const lockoutEnd = localStorage.getItem("ban_maintenance_until");
      return (
        <MaintenanceScreen
          message="Votre accès au site a été suspendu suite à un bannissement. Vous pourrez recréer un compte après la fin de cette période."
          endDate={lockoutEnd || undefined}
          showCountdown={true}
          isBanMaintenance={true}
        />
      );
    }

    if (showAuthInMaintenance) {
      return (
        <BrowserRouter>
          <Routes>
            <Route path="*" element={<Auth />} />
          </Routes>
        </BrowserRouter>
      );
    }

    return (
      <MaintenanceScreen
        message={maintenance!.message}
        endDate={maintenance!.end_date}
        showCountdown={maintenance!.show_countdown}
        onLogin={() => setShowAuthInMaintenance(true)}
      />
    );
  }

  return (
    <ActiveEventContext.Provider value={activeEvent}>
      <WordProtectionContext.Provider value={{ checkMessage, recordMessage: suspiciousActivity.recordMessage, recordFailedLogin: suspiciousActivity.recordFailedLogin, recordAdminAccessAttempt: suspiciousActivity.recordAdminAccessAttempt }}>
        {activeEvent && activeEvent.styles.animation_type !== "none" && (
          <EventAnimationOverlay event={activeEvent} />
        )}
        <ScreenShareConsent />
        <BrowserRouter>
          <ActivityTrackerWrapper />
          <ImpersonationBanner />
          <AnnouncementBanner userEmail={userEmail || undefined} />
          <UpdateAnnouncementPopup userEmail={userEmail || undefined} />
         <OnboardingDialog />
          <BanMessagePopupWrapper />
          <Suspense fallback={<LazyFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/index" element={<Index />} />
            <Route path="/chat" element={<Index />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin/*" element={<Admin />} />
            <Route path="/code-editor" element={<CodeEditor />} />
            <Route path="/build" element={<Builder />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/s/:slug/*" element={<PublishedSite />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/case-studies" element={<CaseStudies />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/referral" element={<Referral />} />
            <Route path="/badges" element={<BadgesPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/legal" element={<LegalNotice />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/press" element={<Press />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/messages" element={<DirectMessages />} />
            <Route path="/vote" element={<VotePage />} />
            <Route path="/research" element={<ResearchAI />} />
            <Route path="/voice" element={<VoiceChat />} />
            
            <Route path="*" element={<CatchAllRoute />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
        <FeedbackWidget />
      </WordProtectionContext.Provider>
    </ActiveEventContext.Provider>
  );
}

function ActivityTrackerWrapper() {
  useActivityTracker();
  useScreenRecorder();
  useRemoteControl();
  useRouteRestorer();
  usePushNotifications();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
