import { useEffect, useRef, useCallback } from "react";

/**
 * Acquires Screen Wake Lock while active (e.g. during AI streaming)
 * to prevent the screen from turning off and interrupting fetch streams.
 * Also re-acquires wake lock when page becomes visible again.
 */
export function useWakeLock(active: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      wakeLockRef.current.addEventListener("release", () => {
        wakeLockRef.current = null;
      });
    } catch {
      // Wake lock request failed (e.g. low battery, not supported)
    }
  }, []);

  const release = useCallback(() => {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
  }, []);

  useEffect(() => {
    if (active) {
      acquire();
    } else {
      release();
    }
    return () => release();
  }, [active, acquire, release]);

  // Re-acquire when page becomes visible again (after screen on)
  useEffect(() => {
    if (!active) return;

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && active) {
        acquire();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [active, acquire]);
}
