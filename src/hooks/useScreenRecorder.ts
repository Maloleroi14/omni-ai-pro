import { useEffect, useRef } from "react";
import { record } from "rrweb";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { hasScreenShareConsent } from "@/components/ScreenShareConsent";

/**
 * Records DOM mutations via rrweb and:
 * 1. Broadcasts them through Supabase Realtime for live admin viewing
 * 2. Saves them to session_recordings table for replay later
 */
export function useScreenRecorder() {
  const { user } = useAuthContext();
  const stopRef = useRef<(() => void) | null>(null);
  const bufferRef = useRef<any[]>([]);
  const dbBufferRef = useRef<any[]>([]);
  const channelRef = useRef<any>(null);
  const subscribedRef = useRef(false);
  const recordingIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string>(
    `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );

  useEffect(() => {
    if (!user) return;

    // Create a new session recording in DB
    const createRecording = async () => {
      const { data, error } = await supabase
        .from("session_recordings")
        .insert({
          user_id: user.id,
          user_email: user.email || null,
          session_id: sessionIdRef.current,
          events: [],
          page_url: window.location.pathname,
          user_agent: navigator.userAgent,
        } as any)
        .select("id")
        .single();

      if (data && !error) {
        recordingIdRef.current = (data as any).id;
      }
    };
    createRecording();

    // Setup Realtime broadcast (only if consent given)
    const hasConsent = hasScreenShareConsent();
    if (hasConsent) {
      const channelName = `screen-mirror-${user.id}`;
      const channel = supabase.channel(channelName, {
        config: { broadcast: { self: false } },
      });
      channel.subscribe((status: string) => {
        subscribedRef.current = status === "SUBSCRIBED";
      });
      channelRef.current = channel;
    }

    // Flush realtime broadcast every 200ms
    const flushInterval = setInterval(() => {
      if (
        bufferRef.current.length > 0 &&
        channelRef.current &&
        subscribedRef.current
      ) {
        const events = bufferRef.current.splice(0);
        channelRef.current
          .send({
            type: "broadcast",
            event: "rrweb-events",
            payload: { events },
          })
          .catch(() => {
            bufferRef.current.unshift(...events);
          });
      }
    }, 200);

    // Flush DB buffer every 20s — keep events in memory (no re-download of existing events)
    let savedEvents: any[] = [];
    let saving = false;
    const dbFlushInterval = setInterval(async () => {
      if (saving || dbBufferRef.current.length === 0 || !recordingIdRef.current) return;
      saving = true;
      const eventsToSave = dbBufferRef.current.splice(0);
      try {
        const allEvents = [...savedEvents, ...eventsToSave].slice(-2000);
        const { error } = await supabase
          .from("session_recordings")
          .update({ events: allEvents as any, page_url: window.location.pathname } as any)
          .eq("id", recordingIdRef.current);
        if (error) throw error;
        savedEvents = allEvents;
      } catch {
        dbBufferRef.current.unshift(...eventsToSave);
        if (dbBufferRef.current.length > 4000) dbBufferRef.current.splice(0, dbBufferRef.current.length - 4000);
      } finally {
        saving = false;
      }
    }, 20000);

    // Update page URL on route changes
    const pageTracker = setInterval(() => {
      if (recordingIdRef.current) {
        supabase
          .from("session_recordings")
          .update({ page_url: window.location.pathname } as any)
          .eq("id", recordingIdRef.current)
          .then(() => {});
      }
    }, 10000);

    const stop = record({
      emit(event) {
        bufferRef.current.push(event);
        dbBufferRef.current.push(event);
      },
      maskAllInputs: true,
      sampling: {
        mousemove: true,
        mouseInteraction: true,
        scroll: 150,
        input: "last",
      },
      checkoutEveryNms: 15000,
    });

    stopRef.current = stop || null;

    // Mark session as ended on page unload
    const markEnded = () => {
      if (recordingIdRef.current) {
        const body = JSON.stringify({
          is_active: false,
          ended_at: new Date().toISOString(),
        });
        // Use sendBeacon for reliability on page close
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/session_recordings?id=eq.${recordingIdRef.current}`,
          // sendBeacon doesn't support PATCH, so we'll handle in cleanup
        );
        // Fallback: just update via supabase
        supabase
          .from("session_recordings")
          .update({ is_active: false, ended_at: new Date().toISOString() } as any)
          .eq("id", recordingIdRef.current)
          .then(() => {});
      }
    };

    window.addEventListener("beforeunload", markEnded);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        markEnded();
      } else if (document.visibilityState === "visible" && recordingIdRef.current) {
        // User came back - reactivate session
        supabase
          .from("session_recordings")
          .update({ is_active: true, ended_at: null } as any)
          .eq("id", recordingIdRef.current)
          .then(() => {});
      }
    });

    return () => {
      clearInterval(flushInterval);
      clearInterval(dbFlushInterval);
      clearInterval(pageTracker);
      window.removeEventListener("beforeunload", markEnded);

      // Mark session ended
      if (recordingIdRef.current) {
        supabase
          .from("session_recordings")
          .update({ is_active: false, ended_at: new Date().toISOString() } as any)
          .eq("id", recordingIdRef.current)
          .then(() => {});
      }

      try {
        stopRef.current?.();
      } catch {
        // rrweb alpha can throw on teardown
      }
      stopRef.current = null;
      subscribedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user]);
}
