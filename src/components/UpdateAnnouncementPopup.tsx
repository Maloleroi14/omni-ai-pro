import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  is_active: boolean;
  target: string;
  target_emails: string[];
}

export function UpdateAnnouncementPopup({ userEmail }: { userEmail?: string }) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const knownRef = useRef<Set<string>>(new Set());
  const initialDone = useRef(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("type", "update")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!data || data.length === 0) { setAnnouncement(null); return; }

    const a = data[0] as any;
    if (a.target === "specific" && userEmail && !a.target_emails?.includes(userEmail)) {
      setAnnouncement(null);
      return;
    }
    if (!initialDone.current) {
      initialDone.current = true;
      knownRef.current.add(a.id);
    }
    setAnnouncement(a);
  }, [userEmail]);

  useEffect(() => {
    // Load stored dismissed IDs
    try {
      const stored = localStorage.getItem("dismissed_update_announcements");
      if (stored) setDismissed(new Set(JSON.parse(stored)));
    } catch {}

    load();

    const channel = supabase
      .channel("update-announcements")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const dismiss = (id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("dismissed_update_announcements", JSON.stringify([...next]));
      return next;
    });
  };

  if (!announcement || dismissed.has(announcement.id)) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-[90vw] max-w-md mx-auto rounded-2xl border-2 border-primary/30 bg-background shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-primary to-primary/70 px-6 py-5 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider opacity-80">Mise à jour</p>
              <h2 className="text-lg font-bold leading-tight">{announcement.title}</h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {announcement.content}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <Button
            onClick={() => dismiss(announcement.id)}
            className="w-full h-12 text-base font-semibold rounded-xl"
          >
            Cool 👍
          </Button>
        </div>
      </div>
    </div>
  );
}
