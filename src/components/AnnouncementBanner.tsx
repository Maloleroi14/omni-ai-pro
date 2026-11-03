import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Info, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  target: string;
  target_emails: string[];
  is_active: boolean;
  created_at: string;
}

const typeConfig: Record<string, { icon: any; bg: string; border: string; text: string }> = {
  info: { icon: Info, bg: "bg-white", border: "border-2 border-gray-300", text: "text-black" },
  warning: { icon: AlertTriangle, bg: "bg-white", border: "border-2 border-gray-300", text: "text-black" },
  success: { icon: CheckCircle, bg: "bg-white", border: "border-2 border-gray-300", text: "text-black" },
  urgent: { icon: AlertCircle, bg: "bg-white", border: "border-2 border-gray-400", text: "text-black" },
};

// Generate a notification sound using Web Audio API
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);

    // Second tone (higher, delayed)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1175, ctx.currentTime + 0.15);
    gain2.gain.setValueAtTime(0.01, ctx.currentTime);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.5);

    // Third tone
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(1320, ctx.currentTime + 0.3);
    gain3.gain.setValueAtTime(0.01, ctx.currentTime);
    gain3.gain.setValueAtTime(0.25, ctx.currentTime + 0.3);
    gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(ctx.currentTime + 0.3);
    osc3.stop(ctx.currentTime + 0.6);

    // Cleanup
    setTimeout(() => ctx.close(), 1000);
  } catch (e) {
    console.warn("Could not play notification sound:", e);
  }
}

// Send browser notification (works even when tab is in background)
function sendBrowserNotification(title: string, body: string) {
  if (!("Notification" in window)) return;

  const show = () => {
    const notif = new Notification(title, {
      body,
      icon: "/pwa-192x192.png",
      tag: "omni-announcement",
    } as NotificationOptions);
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  };

  if (Notification.permission === "granted") {
    show();
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(perm => {
      if (perm === "granted") show();
    });
  }
}

export function AnnouncementBanner({ userEmail, userId }: { userEmail?: string; userId?: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handleNewAnnouncement = useCallback((announcement: Announcement) => {
    playNotificationSound();
    sendBrowserNotification(
      `📢 ${announcement.title}`,
      announcement.content
    );
  }, []);

  const loadAnnouncements = async (isInitial = false) => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) return;

    const valid = (data as any[]).filter(a => {
      // Exclude "update" type — handled by UpdateAnnouncementPopup
      if (a.type === "update") return false;
      if (a.target === "specific" && userEmail) {
        return a.target_emails?.includes(userEmail);
      }
      return a.target === "all";
    });

    // On initial load, record known IDs and clean up stale hidden entries
    if (isInitial) {
      valid.forEach(a => knownIdsRef.current.add(a.id));
      initialLoadDone.current = true;

      // Clean up hidden IDs that no longer exist in active announcements
      const activeIds = new Set(valid.map(a => a.id));
      setHiddenIds(prev => {
        const next = new Set<string>();
        prev.forEach(id => {
          if (activeIds.has(id)) next.add(id);
          else localStorage.removeItem(`announcement_seen_${id}`);
        });
        if (next.size !== prev.size) {
          localStorage.setItem("auto_hidden_announcements", JSON.stringify([...next]));
        }
        return next;
      });
    }

    setAnnouncements(valid);
  };

  const resetAnnouncementVisibility = useCallback((annId: string) => {
    // Clear seen timestamp so 10-min timer restarts
    localStorage.removeItem(`announcement_seen_${annId}`);
    // Remove from hidden set
    setHiddenIds(prev => {
      const next = new Set(prev);
      next.delete(annId);
      localStorage.setItem("auto_hidden_announcements", JSON.stringify([...next]));
      return next;
    });
    // Clear any existing timer
    const existing = timersRef.current.get(annId);
    if (existing) {
      clearTimeout(existing);
      timersRef.current.delete(annId);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements(true);

    const stored = localStorage.getItem("auto_hidden_announcements");
    if (stored) {
      try { setHiddenIds(new Set(JSON.parse(stored))); } catch (_) {}
    }

    const channel = supabase
      .channel("announcements-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, (payload) => {
        const newAnn = payload.new as any;
        if (newAnn.target === "specific" && userEmail && !newAnn.target_emails?.includes(userEmail)) {
          return;
        }
        if (!knownIdsRef.current.has(newAnn.id) && initialLoadDone.current) {
          knownIdsRef.current.add(newAnn.id);
          handleNewAnnouncement(newAnn);
        }
        loadAnnouncements();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "announcements" }, (payload) => {
        const updated = payload.new as any;
        // Reset visibility so edited announcements reappear
        resetAnnouncementVisibility(updated.id);
        loadAnnouncements();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "announcements" }, () => {
        loadAnnouncements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      timersRef.current.forEach(t => clearTimeout(t));
    };
  }, [userEmail, handleNewAnnouncement, resetAnnouncementVisibility]);

  // Track when user first sees each announcement, then auto-hide after 10 min
  useEffect(() => {
    const TEN_MINUTES = 10 * 60 * 1000;

    announcements.forEach(a => {
      if (hiddenIds.has(a.id) || timersRef.current.has(a.id)) return;

      // Check if we already recorded when the user first saw this
      const seenKey = `announcement_seen_${a.id}`;
      let firstSeen = localStorage.getItem(seenKey);

      if (!firstSeen) {
        // User sees it now for the first time — record timestamp
        firstSeen = String(Date.now());
        localStorage.setItem(seenKey, firstSeen);
      }

      const elapsed = Date.now() - Number(firstSeen);
      const remaining = Math.max(0, TEN_MINUTES - elapsed);

      if (remaining === 0) {
        setHiddenIds(prev => {
          const next = new Set(prev);
          next.add(a.id);
          localStorage.setItem("auto_hidden_announcements", JSON.stringify([...next]));
          return next;
        });
      } else {
        const timer = setTimeout(() => {
          setHiddenIds(prev => {
            const next = new Set(prev);
            next.add(a.id);
            localStorage.setItem("auto_hidden_announcements", JSON.stringify([...next]));
            return next;
          });
          timersRef.current.delete(a.id);
        }, remaining);
        timersRef.current.set(a.id, timer);
      }
    });
  }, [announcements, hiddenIds]);

  const visible = announcements.filter(a => !hiddenIds.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] w-full space-y-2 px-3 pt-3 pointer-events-auto">
      {visible.map(a => {
        const config = typeConfig[a.type] || typeConfig.info;
        const Icon = config.icon;

        return (
          <div
            key={a.id}
            className={cn(
              "relative flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-opacity",
              config.bg, config.border,
              a.priority === "high" && a.is_active && "animate-pulse",
              !a.is_active && "opacity-70"
            )}
          >
            <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", config.text)} />
            <div className="flex-1 min-w-0">
              <p className={cn("font-semibold text-sm", config.text)}>{a.title}</p>
              <p className="text-xs text-black/70 mt-0.5">{a.content}</p>
            </div>
            <button
              onClick={() => {
                setHiddenIds(prev => {
                  const next = new Set(prev);
                  next.add(a.id);
                  localStorage.setItem("auto_hidden_announcements", JSON.stringify([...next]));
                  return next;
                });
              }}
              className="absolute top-2 right-2 w-6 h-6 opacity-0 cursor-default"
              aria-label="Fermer"
            />
          </div>
        );
      })}
    </div>
  );
}
