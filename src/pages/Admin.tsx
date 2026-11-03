import { useState, useEffect } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminStats } from "@/components/admin/AdminStats";
import { AdminCreditsSection } from "@/components/admin/AdminCreditsSection";
import { AdminTeamSection } from "@/components/admin/AdminTeamSection";
import { AdminBlockedSection } from "@/components/admin/AdminBlockedSection";
import { AdminCapabilitiesSection } from "@/components/admin/AdminCapabilitiesSection";
import { AdminPresentationSection } from "@/components/admin/AdminPresentationSection";
import { AdminEventsSection } from "@/components/admin/AdminEventsSection";
import { AdminAIAssistant } from "@/components/admin/AdminAIAssistant";
import { AdminTermsSection } from "@/components/admin/AdminTermsSection";
import { AdminAccountsSection } from "@/components/admin/AdminAccountsSection";
import { CoCreatorCreditsSection } from "@/components/admin/CoCreatorCreditsSection";
import { EnqueteurCreditsSection } from "@/components/admin/EnqueteurCreditsSection";
import { AdminSessionsSection } from "@/components/admin/AdminSessionsSection";
import { AdminTrollSection } from "@/components/admin/AdminTrollSection";
import { AdminPermissionsSection } from "@/components/admin/AdminPermissionsSection";
import { AdminBalancesSection } from "@/components/admin/AdminBalancesSection";
import { AdminAdsSection } from "@/components/admin/AdminAdsSection";
import { AdminSecurityQuestionsSection } from "@/components/admin/AdminSecurityQuestionsSection";
import { AdminMaintenanceSection } from "@/components/admin/AdminMaintenanceSection";
import { AdminAnalyticsSection } from "@/components/admin/AdminAnalyticsSection";
import { AdminAnnouncementsSection } from "@/components/admin/AdminAnnouncementsSection";
import { AdminSupportSection } from "@/components/admin/AdminSupportSection";
import { AdminConnectionLogsSection } from "@/components/admin/AdminConnectionLogsSection";
import { AdminBlockedWordsSection } from "@/components/admin/AdminBlockedWordsSection";
import { AdminUserStatsSection } from "@/components/admin/AdminUserStatsSection";
import { AdminEmailsSection } from "@/components/admin/AdminEmailsSection";
import { AdminFaqSection } from "@/components/admin/AdminFaqSection";
import { AdminLiveUsersSection } from "@/components/admin/AdminLiveUsersSection";
import { AdminContactSection } from "@/components/admin/AdminContactSection";
import { AdminBanSection } from "@/components/admin/AdminBanSection";
import { AdminProposalsSection } from "@/components/admin/AdminProposalsSection";
import { AdminSessionRecordingsSection } from "@/components/admin/AdminSessionRecordingsSection";
import { useWordProtection } from "@/App";

const CREATOR_EMAIL = "omniaiproultime@gmail.com";

export default function Admin() {
  const { user, isLoading, isVicePresident, isSuccessionActive } = useAuthContext();
  const navigate = useNavigate();
  const { recordAdminAccessAttempt } = useWordProtection();
  const isCreator = user?.email === CREATOR_EMAIL;
  const isActingCreator = isCreator || (isVicePresident && isSuccessionActive);
  const [isCoCreator, setIsCoCreator] = useState(false);
  const [checked, setChecked] = useState(false);
  const [allowedTabs, setAllowedTabs] = useState<string[]>([]);
  const [unauthorizedDetected, setUnauthorizedDetected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!user?.email || isActingCreator) { setChecked(true); return; }
      try {
        const query = supabase
          .from("admin_settings")
          .select("setting_key, setting_value")
          .in("setting_key", ["co_creator_email", "vice_president_emails", "cocreator_allowed_tabs", "enqueteur_allowed_tabs"]);
        const timeout = new Promise<{ data: null }>((r) => setTimeout(() => r({ data: null }), 5000));
        const { data } = (await Promise.race([query, timeout])) as any;
        if (cancelled) return;
        const get = (k: string) => (data || []).find((r: any) => r.setting_key === k)?.setting_value as any;

        const email = user.email!;
        const isCoCreatorUser = (get("co_creator_email")?.emails || []).includes(email);
        const isVPUser = isVicePresident || (get("vice_president_emails")?.emails || []).includes(email);
        if (isCoCreatorUser) setIsCoCreator(true);

        if (data && !isCoCreatorUser && !isVPUser) {
          setUnauthorizedDetected(true);
          recordAdminAccessAttempt();
        }

        const defaultTabs = isCoCreatorUser
          ? ["stats", "credits", "blocked", "capabilities", "presentation"]
          : ["stats", "credits", "blocked", "capabilities", "presentation", "terms", "ai", "accounts", "troll"];
        const key = isCoCreatorUser && !(isVPUser && !isSuccessionActive) ? "cocreator_allowed_tabs" : "enqueteur_allowed_tabs";
        setAllowedTabs(get(key)?.tabs || defaultTabs);
      } catch (e) {
        console.error("Admin access check failed:", e);
      } finally {
        if (!cancelled) setChecked(true);
      }
    };
    if (user) check();
    return () => { cancelled = true; };
  }, [user?.email, isActingCreator, isVicePresident, isSuccessionActive]);

  useEffect(() => {
    if (!isLoading && !user) navigate("/");
  }, [user, isLoading, navigate]);

  const hasAccess = isActingCreator || isCoCreator || isVicePresident;
  const canAccess = (tabId: string) => isActingCreator || allowedTabs.includes(tabId);

  if (isLoading || !checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) return null;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar isCreator={isActingCreator} isCoCreator={isCoCreator} isVicePresident={isVicePresident} isSuccessionActive={isSuccessionActive} />
      <main className="flex-1 p-4 md:p-6 pt-14 md:pt-6 overflow-y-auto max-w-4xl">
        <Routes>
          <Route index element={hasAccess ? <AdminAnalyticsSection /> : null} />
          {(isActingCreator || isVicePresident) && <Route path="live-users" element={<AdminLiveUsersSection />} />}
          {isActingCreator && <Route path="team" element={<AdminTeamSection />} />}
          {(canAccess("blocked") || isVicePresident) && <Route path="blocked" element={<AdminBlockedSection isCreator={isActingCreator} />} />}
          {(canAccess("terms") || isVicePresident) && <Route path="terms" element={<AdminTermsSection />} />}
          {canAccess("accounts") && <Route path="accounts" element={<AdminAccountsSection isEnqueteur={false} isCreator={isActingCreator} />} />}
          {canAccess("sessions") && <Route path="sessions" element={<AdminSessionsSection />} />}
          {(canAccess("troll") || isVicePresident) && <Route path="troll" element={<AdminTrollSection isEnqueteur={false} />} />}
          {isActingCreator && <Route path="permissions" element={<AdminPermissionsSection />} />}
          {(isActingCreator || canAccess("ads")) && <Route path="ads" element={<AdminAdsSection />} />}
          {isActingCreator && <Route path="analytics" element={<AdminAnalyticsSection />} />}
          {isActingCreator && <Route path="maintenance" element={<AdminMaintenanceSection />} />}
          {isActingCreator && <Route path="announcements" element={<AdminAnnouncementsSection />} />}
          {isActingCreator && <Route path="events" element={<AdminEventsSection />} />}
          {(isActingCreator || isVicePresident) && <Route path="support" element={<AdminSupportSection />} />}
          {(isActingCreator || isVicePresident) && <Route path="connections" element={<AdminConnectionLogsSection />} />}
          {isActingCreator && <Route path="emails" element={<AdminEmailsSection />} />}
          {(isActingCreator || isVicePresident) && <Route path="user-stats" element={<AdminUserStatsSection />} />}
          {isActingCreator && <Route path="faq" element={<AdminFaqSection />} />}
          {isActingCreator && <Route path="contact-messages" element={<AdminContactSection />} />}
          {isActingCreator && <Route path="ban" element={<AdminBanSection />} />}
          {(isActingCreator || isVicePresident) && <Route path="proposals" element={<AdminProposalsSection />} />}
          {(isActingCreator || isVicePresident) && <Route path="recordings" element={<AdminSessionRecordingsSection />} />}
        </Routes>
      </main>
    </div>
  );
}
