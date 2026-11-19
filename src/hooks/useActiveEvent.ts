
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
  is_scheduled?: boolean;
  start_date?: string | null;
  end_date?: string | null;
}

const DEFAULT_PRIMARY = "#6750F5";
const DEFAULT_SECONDARY = "#0EA5E9";

function normalizeColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;

  const color = value.trim();

  if (/^#[0-9a-fA-F]{3}$/.test(color) ||
      /^#[0-9a-fA-F]{6}$/.test(color)) {
    return color;
  }

  return fallback;
}

function normalizeEvent(raw: any): SiteEvent {
  const rawStyles = raw?.styles || {};

  const primary = normalizeColor(
    rawStyles.primary_color,
    DEFAULT_PRIMARY
  );

  const secondary = normalizeColor(
    rawStyles.secondary_color,
    DEFAULT_SECONDARY
  );

  const suppliedGradient =
    typeof rawStyles.background_gradient === "string"
      ? rawStyles.background_gradient.trim()
      : "";

  const backgroundGradient =
    suppliedGradient ||
    `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;

  return {
    ...raw,
    styles: {
      primary_color: primary,
      secondary_color: secondary,
      background_gradient: backgroundGradient,
      animation_type: rawStyles.animation_type || "none",
      ai_persona: rawStyles.ai_persona || "",
      ai_greeting: rawStyles.ai_greeting || "",
      particle_effect: rawStyles.particle_effect || "none",
      font_style: rawStyles.font_style || "default",
      border_style: rawStyles.border_style || "default",
      glow_effect: Boolean(rawStyles.glow_effect),
    },
  };
}

function findActive(events: any[]): SiteEvent | null {
  if (!Array.isArray(events)) return null;

  const now = new Date();

  // Priorité aux événements programmés dont la période est valide.
  for (const raw of events) {
    if (!raw?.is_scheduled) continue;

    const start = raw.start_date
      ? new Date(raw.start_date)
      : null;

    const end = raw.end_date
      ? new Date(raw.end_date)
      : null;

    const validStart = !start ||
      (!Number.isNaN(start.getTime()) && now >= start);

    const validEnd = !end ||
      (!Number.isNaN(end.getTime()) && now <= end);

    if (validStart && validEnd) {
      return normalizeEvent(raw);
    }
  }

  // Sinon, on récupère l'événement activé manuellement.
  const active = events.find((event) => event?.is_active);

  return active ? normalizeEvent(active) : null;
}

export function useActiveEvent() {
  const [activeEvent, setActiveEvent] =
    useState<SiteEvent | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("admin_settings")
          .select("setting_value")
          .eq("setting_key", "site_events")
          .maybeSingle();

        if (error) {
          console.error(
            "Erreur lors du chargement de l'événement :",
            error
          );
          return;
        }

        if (!isMounted) return;

        const events =
          (data?.setting_value as any)?.events || [];

        setActiveEvent(findActive(events));
      } catch (error) {
        console.error(
          "Impossible de récupérer l'événement actif :",
          error
        );
      }
    };

    load();

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
          if (!isMounted) return;

          const events =
            (payload.new?.setting_value as any)?.events || [];

          setActiveEvent(findActive(events));
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return activeEvent;
}

/**
 * Convertit une couleur hexadécimale en valeur HSL
 * utilisable dans les variables CSS.
 */
export function hexToHSL(hex: string): string {
  const normalized = normalizeColor(hex, DEFAULT_PRIMARY)
    .replace("#", "");

  const fullHex = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;

  const r = parseInt(fullHex.substring(0, 2), 16) / 255;
  const g = parseInt(fullHex.substring(2, 4), 16) / 255;
  const b = parseInt(fullHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h = 0;
  let s = 0;

  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;

    s = l > 0.5
      ? d / (2 - max - min)
      : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
