import { useCallback } from "react";

export function useSuspiciousActivityDetector(_userEmail?: string | null) {
  // Auto-maintenance disabled — no longer triggers maintenance mode automatically
  const recordMessage = useCallback(() => {}, []);
  const recordFailedLogin = useCallback(() => {}, []);
  const recordAdminAccessAttempt = useCallback(() => {}, []);
  const recordBannedWord = useCallback((_word: string) => {}, []);

  return { recordMessage, recordFailedLogin, recordAdminAccessAttempt, recordBannedWord };
}
