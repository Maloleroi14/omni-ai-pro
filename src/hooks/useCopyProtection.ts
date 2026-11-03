import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const BLOCK_KEY = "device_blocked_until";
const DEVICE_ID_KEY = "device_unique_id";
const WARN_COUNT_KEY = "device_warn_count";
const MAX_WARNINGS = 3;

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

type WordEntry = { word: string; severity: "block" | "mute" | "warn" };

// Return type: false = clean, "warn" = warning shown, "block" = device blocked
export type CheckResult = false | "warn" | "block";

export function useCopyProtection() {
  const [isBlocked, setIsBlocked] = useState(() => {
    const blockedUntil = localStorage.getItem(BLOCK_KEY);
    if (!blockedUntil) return false;
    if (Date.now() > parseInt(blockedUntil)) {
      localStorage.removeItem(BLOCK_KEY);
      return false;
    }
    return true;
  });

  const blockedWordsRef = useRef<WordEntry[]>([]);
  const featureWordsRef = useRef<string[]>([]);

  // Load blocked words from both blocked_features AND blocked_words tables
  useEffect(() => {
    const load = async () => {
      const [featuresRes, wordsRes] = await Promise.all([
        supabase
          .from("blocked_features")
          .select("feature_name, is_blocked")
          .eq("is_blocked", true),
        supabase
          .from("blocked_words")
          .select("word, severity"),
      ]);

      featureWordsRef.current = (featuresRes.data || []).map(d => d.feature_name.toLowerCase());
      blockedWordsRef.current = (wordsRes.data || []).map((w: any) => ({
        word: w.word.toLowerCase(),
        severity: w.severity as "block" | "mute" | "warn",
      }));
    };
    load();

    const channel = supabase
      .channel("blocked-words-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "blocked_words" }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Check for auto-unblock and DB unblock periodically
  useEffect(() => {
    if (!isBlocked) return;
    const interval = setInterval(async () => {
      const blockedUntil = localStorage.getItem(BLOCK_KEY);
      if (!blockedUntil || Date.now() > parseInt(blockedUntil)) {
        localStorage.removeItem(BLOCK_KEY);
        setIsBlocked(false);
        return;
      }
      const deviceId = getDeviceId();
      const { data } = await supabase
        .from("device_blocks")
        .select("unblocked_by_admin")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data?.[0]?.unblocked_by_admin) {
        localStorage.removeItem(BLOCK_KEY);
        setIsBlocked(false);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [isBlocked]);

  const matchWord = (message: string, word: string): boolean => {
    const normalized = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\s|[.,!?;:'"()\\-])${escaped}(?:$|\\s|[.,!?;:'"()\\-])`, 'i');
    return regex.test(message);
  };

  const checkMessage = useCallback(async (message: string, userId?: string, userEmail?: string): Promise<CheckResult> => {
    const lower = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 1. Check feature words (always block)
    const featureHit = featureWordsRef.current.find(w => matchWord(lower, w));
    if (featureHit) {
      await blockDevice(featureHit, userId, userEmail);
      return "block";
    }

    // 2. Check blocked_words entries
    for (const entry of blockedWordsRef.current) {
      if (!matchWord(lower, entry.word)) continue;

      if (entry.severity === "warn") {
        // Increment warning counter
        const currentCount = parseInt(localStorage.getItem(WARN_COUNT_KEY) || "0", 10) + 1;
        localStorage.setItem(WARN_COUNT_KEY, currentCount.toString());

        if (currentCount >= MAX_WARNINGS) {
          localStorage.removeItem(WARN_COUNT_KEY);
          await blockDevice(entry.word, userId, userEmail);
          return "block";
        }

        return "warn";
      }

      // severity = "block" or "mute" → block device
      await blockDevice(entry.word, userId, userEmail);
      return "block";
    }

    return false;
  }, []);

  const blockDevice = async (foundWord: string, userId?: string, userEmail?: string) => {
    const blockedUntil = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem(BLOCK_KEY, blockedUntil.toString());
    setIsBlocked(true);

    const deviceId = getDeviceId();
    await supabase.from("device_blocks").insert({
      device_id: deviceId,
      user_id: userId || null,
      user_email: userEmail || null,
      blocked_word: foundWord,
    });

    // Auto-maintenance disabled
  };

  return { isBlocked, checkMessage };
}
