import { useNavigate, useLocation } from "react-router-dom";
import { 
  Coins, Users, Lock, Brain, Palette, Bot, BarChart3, 
  ArrowLeft, Shield, Menu, X, FileText, UserCheck, LogOut, Settings, Skull, Megaphone,
  Construction, TrendingUp, Bell, HelpCircle, Wifi, ShieldAlert, UserSearch, Mail, Eye, PartyPopper, MessageSquare, ThumbsUp, Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { AdminNotificationBell } from "@/components/admin/AdminNotificationBell";

interface AdminSidebarProps {
  isCreator: boolean;
  isCoCreator?: boolean;
  isVicePresident?: boolean;
  isSuccessionActive?: boolean;
}

const allSections = [
  { id: "analytics", label: "Analytiques", icon: TrendingUp, path: "/admin" },
  { id: "live-users", label: "En direct", icon: Eye, path: "/admin/live-users" },
  { id: "maintenance", label: "Maintenance", icon: Construction, path: "/admin/maintenance" },
  { id: "team", label: "Équipe", icon: Users, path: "/admin/team" },
  { id: "blocked", label: "Blocages", icon: Lock, path: "/admin/blocked" },
  { id: "terms", label: "Conditions", icon: FileText, path: "/admin/terms" },
  { id: "accounts", label: "Comptes", icon: UserCheck, path: "/admin/accounts" },
  { id: "sessions", label: "Sessions", icon: LogOut, path: "/admin/sessions" },
  { id: "troll", label: "Troll", icon: Skull, path: "/admin/troll" },
  
  { id: "permissions", label: "Permissions", icon: Settings, path: "/admin/permissions" },
  { id: "events", label: "Événements", icon: PartyPopper, path: "/admin/events" },
  { id: "announcements", label: "Annonces", icon: Bell, path: "/admin/announcements" },
  { id: "support", label: "Support", icon: HelpCircle, path: "/admin/support" },
  { id: "connections", label: "Connexions", icon: Wifi, path: "/admin/connections" },
  { id: "emails", label: "Emails rappel", icon: Mail, path: "/admin/emails" },
  { id: "user-stats", label: "Stats utilisateur", icon: UserSearch, path: "/admin/user-stats" },
  { id: "ban", label: "Bannissement", icon: ShieldAlert, path: "/admin/ban" },
  { id: "proposals", label: "Propositions", icon: ThumbsUp, path: "/admin/proposals" },
  { id: "recordings", label: "Enregistrements", icon: Video, path: "/admin/recordings" },
];

// Creator gets all sections
const creatorSectionIds = allSections.map(s => s.id);

export const AdminSidebar = forwardRef<HTMLDivElement, AdminSidebarProps>(function AdminSidebar({ isCreator, isCoCreator, isVicePresident, isSuccessionActive }, _ref) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [allowedTabs, setAllowedTabs] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (isCreator) {
      setAllowedTabs(creatorSectionIds);
      setLoaded(true);
      return;
    }

    // VP without succession gets enqueteur-level tabs
    if (isVicePresident && !isSuccessionActive) {
      const loadVPTabs = async () => {
        const { data } = await supabase
          .from("admin_settings")
          .select("setting_value")
          .eq("setting_key", "enqueteur_allowed_tabs")
          .maybeSingle();
        const defaultTabs = ["stats", "credits", "blocked", "capabilities", "presentation", "terms", "ai", "accounts", "browser", "troll"];
        setAllowedTabs((data?.setting_value as any)?.tabs || defaultTabs);
        setLoaded(true);
      };
      loadVPTabs();
      return;
    }
    
    const loadTabs = async () => {
      const key = isCoCreator ? "cocreator_allowed_tabs" : "enqueteur_allowed_tabs";
      const defaultTabs = isCoCreator
        ? ["stats", "credits", "blocked", "capabilities", "presentation"]
        : ["stats", "credits", "blocked", "capabilities", "presentation", "terms", "ai", "accounts", "browser", "troll"];
      
      const { data } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", key)
        .maybeSingle();
      
      setAllowedTabs((data?.setting_value as any)?.tabs || defaultTabs);
      setLoaded(true);
    };
    loadTabs();
  }, [isCreator, isCoCreator, isVicePresident, isSuccessionActive]);

  const vpPermanentTabs = ["live-users", "blocked", "terms", "troll", "support", "connections", "proposals", "user-stats", "recordings"];
  
  // Filter sections: team and permissions are creator-only always
  const sections = allSections.filter(s => {
    if (isCreator) return true;
    if (isVicePresident && vpPermanentTabs.includes(s.id)) return true;
    if (["team", "permissions", "maintenance", "analytics", "emails", "events", "contact-messages", "ban"].includes(s.id)) return isCreator;
    return allowedTabs.includes(s.id);
  });

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  if (!loaded) return null;

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-destructive to-destructive/60 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-destructive-foreground" />
          </div>
          <span className="font-bold text-sm truncate">Admin</span>
        </div>
        {isCreator && <AdminNotificationBell />}
        <Button variant="ghost" size="icon" className="ml-auto md:hidden shrink-0" onClick={() => setOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => { navigate(s.path); setOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
              isActive(s.path)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <s.icon className="w-4 h-4 shrink-0" />
            {s.label}
          </button>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      <div className="md:hidden fixed top-3 left-3 z-50">
        <Button variant="outline" size="icon" onClick={() => setOpen(true)} className="shadow-md bg-background">
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 z-50 md:z-auto h-screen w-60 bg-background border-r border-border transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {sidebar}
      </aside>
    </>
  );
});
