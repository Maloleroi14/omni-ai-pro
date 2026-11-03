import { useState, useEffect, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "amoled" | "system";
export type AccentColor = "purple" | "blue" | "green" | "orange" | "pink" | "red";
export type LayoutMode = "default" | "compact" | "wide";
export type VoiceLanguage = "auto" | "fr" | "en" | "es" | "de" | "it" | "pt" | "nl" | "pl" | "ru" | "ja" | "ko" | "zh" | "ar" | "hi" | "tr" | "vi" | "th" | "id" | "cs" | "da" | "fi" | "el" | "he" | "hu" | "no" | "ro" | "sk" | "sv" | "uk" | "bg" | "hr" | "lt" | "lv" | "sl" | "et" | "ms" | "tl" | "bn" | "ta" | "te" | "mr" | "gu" | "kn" | "ml" | "pa" | "ur" | "sw" | "af";

export const VOICE_LANGUAGES: { value: VoiceLanguage; label: string; flag: string }[] = [
  { value: "auto", label: "Automatique", flag: "🌍" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
  { value: "it", label: "Italiano", flag: "🇮🇹" },
  { value: "pt", label: "Português", flag: "🇵🇹" },
  { value: "nl", label: "Nederlands", flag: "🇳🇱" },
  { value: "pl", label: "Polski", flag: "🇵🇱" },
  { value: "ru", label: "Русский", flag: "🇷🇺" },
  { value: "ja", label: "日本語", flag: "🇯🇵" },
  { value: "ko", label: "한국어", flag: "🇰🇷" },
  { value: "zh", label: "中文", flag: "🇨🇳" },
  { value: "ar", label: "العربية", flag: "🇸🇦" },
  { value: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { value: "tr", label: "Türkçe", flag: "🇹🇷" },
  { value: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { value: "th", label: "ไทย", flag: "🇹🇭" },
  { value: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { value: "cs", label: "Čeština", flag: "🇨🇿" },
  { value: "da", label: "Dansk", flag: "🇩🇰" },
  { value: "fi", label: "Suomi", flag: "🇫🇮" },
  { value: "el", label: "Ελληνικά", flag: "🇬🇷" },
  { value: "he", label: "עברית", flag: "🇮🇱" },
  { value: "hu", label: "Magyar", flag: "🇭🇺" },
  { value: "no", label: "Norsk", flag: "🇳🇴" },
  { value: "ro", label: "Română", flag: "🇷🇴" },
  { value: "sk", label: "Slovenčina", flag: "🇸🇰" },
  { value: "sv", label: "Svenska", flag: "🇸🇪" },
  { value: "uk", label: "Українська", flag: "🇺🇦" },
  { value: "bg", label: "Български", flag: "🇧🇬" },
  { value: "hr", label: "Hrvatski", flag: "🇭🇷" },
  { value: "lt", label: "Lietuvių", flag: "🇱🇹" },
  { value: "lv", label: "Latviešu", flag: "🇱🇻" },
  { value: "sl", label: "Slovenščina", flag: "🇸🇮" },
  { value: "et", label: "Eesti", flag: "🇪🇪" },
  { value: "ms", label: "Bahasa Melayu", flag: "🇲🇾" },
  { value: "tl", label: "Tagalog", flag: "🇵🇭" },
  { value: "bn", label: "বাংলা", flag: "🇧🇩" },
  { value: "ta", label: "தமிழ்", flag: "🇮🇳" },
  { value: "te", label: "తెలుగు", flag: "🇮🇳" },
  { value: "mr", label: "मराठी", flag: "🇮🇳" },
  { value: "gu", label: "ગુજરાતી", flag: "🇮🇳" },
  { value: "kn", label: "ಕನ್ನಡ", flag: "🇮🇳" },
  { value: "ml", label: "മലയാളം", flag: "🇮🇳" },
  { value: "pa", label: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { value: "ur", label: "اردو", flag: "🇵🇰" },
  { value: "sw", label: "Kiswahili", flag: "🇰🇪" },
  { value: "af", label: "Afrikaans", flag: "🇿🇦" },
];

interface CustomizationState {
  isUnlocked: boolean;
  theme: ThemeMode;
  accentColor: AccentColor;
  layout: LayoutMode;
  fontSize: number;
  voiceLanguage: VoiceLanguage;
}

const STORAGE_KEY_PREFIX = "omniai-customization";
const PASSWORD_HASH = "Myni0034"; // Simple password check

const defaultState: CustomizationState = {
  isUnlocked: true,
  theme: "system",
  accentColor: "purple",
  layout: "default",
  fontSize: 14,
  voiceLanguage: "auto",
};

// Génère une clé de stockage spécifique à l'utilisateur
const getStorageKey = (userId?: string) => {
  return userId ? `${STORAGE_KEY_PREFIX}-${userId}` : `${STORAGE_KEY_PREFIX}-guest`;
};

export function useCustomization(userId?: string) {
  const storageKey = getStorageKey(userId);
  
  const [state, setState] = useState<CustomizationState>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return { ...defaultState, ...JSON.parse(saved), isUnlocked: true };
      } catch {
        return defaultState;
      }
    }
    return defaultState;
  });

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    
    if (state.theme === "dark" || 
        (state.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [state.theme]);

  // Apply accent color CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const colors: Record<AccentColor, string> = {
      purple: "270 70% 60%",
      blue: "220 70% 50%",
      green: "150 60% 45%",
      orange: "30 90% 55%",
      pink: "330 70% 60%",
      red: "0 70% 55%",
    };
    root.style.setProperty("--primary", colors[state.accentColor]);
  }, [state.accentColor]);

  // Apply font size
  useEffect(() => {
    document.documentElement.style.fontSize = `${state.fontSize}px`;
  }, [state.fontSize]);

  // Recharger l'état quand l'utilisateur change
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setState({ ...defaultState, ...JSON.parse(saved), isUnlocked: true });
      } catch {
        setState(defaultState);
      }
    } else {
      setState(defaultState);
    }
  }, [storageKey]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  const unlock = useCallback((password: string): boolean => {
    if (password === PASSWORD_HASH) {
      setState(prev => ({ ...prev, isUnlocked: true }));
      return true;
    }
    return false;
  }, []);

  const lock = useCallback(() => {
    setState(prev => ({ ...prev, isUnlocked: false }));
  }, []);

  const setTheme = useCallback((theme: ThemeMode) => {
    setState(prev => ({ ...prev, theme }));
  }, []);

  const setAccentColor = useCallback((accentColor: AccentColor) => {
    setState(prev => ({ ...prev, accentColor }));
  }, []);

  const setLayout = useCallback((layout: LayoutMode) => {
    setState(prev => ({ ...prev, layout }));
  }, []);

  const setFontSize = useCallback((fontSize: number) => {
    setState(prev => ({ ...prev, fontSize: Math.min(20, Math.max(12, fontSize)) }));
  }, []);

  const setVoiceLanguage = useCallback((voiceLanguage: VoiceLanguage) => {
    setState(prev => ({ ...prev, voiceLanguage }));
  }, []);

  const reset = useCallback(() => {
    setState(prev => ({ ...defaultState, isUnlocked: prev.isUnlocked }));
  }, []);

  return {
    ...state,
    unlock,
    lock,
    setTheme,
    setAccentColor,
    setLayout,
    setFontSize,
    setVoiceLanguage,
    reset,
  };
}
