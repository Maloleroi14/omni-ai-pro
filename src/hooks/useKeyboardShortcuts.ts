import { useEffect } from "react";

interface KeyboardShortcutsOptions {
  onNewConversation: () => void;
  onToggleSidebar: () => void;
  onSearch?: () => void;
}

export function useKeyboardShortcuts({ onNewConversation, onToggleSidebar, onSearch }: KeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      
      if (isCtrl && e.key === "n") {
        e.preventDefault();
        onNewConversation();
      }
      
      if (isCtrl && e.key === "b") {
        e.preventDefault();
        onToggleSidebar();
      }

      if (isCtrl && e.key === "k") {
        e.preventDefault();
        onSearch?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewConversation, onToggleSidebar, onSearch]);
}
