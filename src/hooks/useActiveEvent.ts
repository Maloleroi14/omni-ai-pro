import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EventStyles {
  primary_color: string;
  secondary_color: string;
  background_gradient: string;
  animation_type: string;
  ai_persona: string;
  ai_greeting: string;
  particle_effect: string;
  font_style: string;
  border_style: string;
  glow_effect: boolean;
}

export interface SiteEvent {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  styles: EventStyles;
}

export function useActiveEvent() {
  const [activeEvent, setActiveEvent] = useState<SiteEvent | null>(null);

  const findActive = (events: SiteEvent[]): SiteEvent | null => {
    const now = new Date();
    // Check scheduled events first
    for (const e of events) {
      if ((e as any).is_scheduled) {
        const start = (e as any).start_date ? new Date((e as any).start_date) : null;
        const end = (e as any).end_date ? new Date((e as any).end_date) : null;
        const inRange = (!start || now >= start) && (!end || now <= end);
        if (inRange) return e;
      }
    }
    // Then check manually active
    return events.find((e) => e.is_active) || null;
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "site_events")
        .maybeSingle();

      if (data?.setting_value) {
        const events: SiteEvent[] = (data.setting_value as any).events || [];
        setActiveEvent(findActive(events));
      }
    };
    load();

    // Listen for realtime changes
    const channel = supabase
      .channel("site-events-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_settings",
          filter: "setting_key=eq.site_events",
        },
        (payload: any) => {
          const events: SiteEvent[] = (payload.new?.setting_value as any)?.events || [];
          setActiveEvent(findActive(events));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return activeEvent;
}

/**
 * Convert hex color to HSL string for CSS variables
 */
export function hexToHSL(hex: string): string {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
