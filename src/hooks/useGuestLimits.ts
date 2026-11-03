const GUEST_KEY = "guest_messages";
const GUEST_MAX = 5;

interface GuestData {
  count: number;
  date: string;
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getGuestData(): GuestData {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (raw) {
      const data: GuestData = JSON.parse(raw);
      if (data.date === getTodayStr()) return data;
    }
  } catch {}
  return { count: 0, date: getTodayStr() };
}

function setGuestData(data: GuestData) {
  localStorage.setItem(GUEST_KEY, JSON.stringify(data));
}

export function getGuestMessagesLeft(): number {
  const data = getGuestData();
  return Math.max(0, GUEST_MAX - data.count);
}

export function useGuestMessage(): boolean {
  const data = getGuestData();
  if (data.count >= GUEST_MAX) return false;
  setGuestData({ count: data.count + 1, date: getTodayStr() });
  return true;
}

export const GUEST_MAX_MESSAGES = GUEST_MAX;
