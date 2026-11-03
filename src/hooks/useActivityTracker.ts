import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export function useActivityTracker() {
  const { user } = useAuthContext();
  const location = useLocation();
  const sessionIdRef = useRef<string | null>(null);
  const cleanupDoneRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const startSession = async () => {
      // Clean old sessions for this user
      await supabase
        .from("active_user_sessions")
        .delete()
        .eq("user_id", user.id);

      const { data } = await supabase
        .from("active_user_sessions")
        .insert({
          user_id: user.id,
          user_email: user.email,
          current_page: location.pathname,
          user_agent: navigator.userAgent,
          is_active: true,
        } as any)
        .select("id")
        .single();

      if (data) {
        sessionIdRef.current = data.id;
        cleanupDoneRef.current = false;
      }
    };

    startSession();

    // Heartbeat every 30s
    const interval = setInterval(async () => {
      if (sessionIdRef.current) {
        await supabase
          .from("active_user_sessions")
          .update({ last_activity_at: new Date().toISOString() } as any)
          .eq("id", sessionIdRef.current);
      }
    }, 30000);

    const cleanup = () => {
      if (sessionIdRef.current && !cleanupDoneRef.current) {
        cleanupDoneRef.current = true;
        // Use sendBeacon for reliable cleanup on page unload
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/active_user_sessions?id=eq.${sessionIdRef.current}`;
        const headers = {
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        };
        // Try fetch with keepalive
        try {
          fetch(url, { method: "DELETE", headers, keepalive: true });
        } catch {
          // Fallback: mark as inactive
        }
      }
    };

    window.addEventListener("beforeunload", cleanup);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", cleanup);
      cleanup();
    };
  }, [user]);

  // Update page on route change
  useEffect(() => {
    if (sessionIdRef.current) {
      supabase
        .from("active_user_sessions")
        .update({ 
          current_page: location.pathname, 
          last_activity_at: new Date().toISOString() 
        } as any)
        .eq("id", sessionIdRef.current)
        .then(() => {});
    }
  }, [location.pathname]);
}
