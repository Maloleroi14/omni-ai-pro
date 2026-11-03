import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

/**
 * Listens for remote control commands from admin and executes them
 * on the user's browser (click, scroll, navigate).
 */
export function useRemoteControl() {
  const { user } = useAuthContext();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;

    const channelName = `screen-control-${user.id}`;
    const channel = supabase.channel(channelName);

    channel
      .on("broadcast", { event: "remote-action" }, (msg: any) => {
        const action = msg.payload;
        if (!action?.type) return;

        try {
          switch (action.type) {
            case "click": {
              const el = document.elementFromPoint(action.x, action.y) as HTMLElement | null;
              if (el) {
                // Visual feedback: show a ripple where admin clicked
                showClickRipple(action.x, action.y);
                el.click();
                // Also try focus for inputs
                if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
                  el.focus();
                }
              }
              break;
            }
            case "scroll": {
              window.scrollBy({ left: action.deltaX || 0, top: action.deltaY || 0, behavior: "smooth" });
              break;
            }
            case "navigate": {
              if (action.url && action.url.startsWith("/")) {
                // Use pushState to navigate within SPA
                window.history.pushState({}, "", action.url);
                window.dispatchEvent(new PopStateEvent("popstate"));
              }
              break;
            }
            case "input": {
              const target = document.activeElement as HTMLInputElement | null;
              if (target && ("value" in target)) {
                // Use native input setter to trigger React's onChange
                const nativeSetter = Object.getOwnPropertyDescriptor(
                  window.HTMLInputElement.prototype, "value"
                )?.set || Object.getOwnPropertyDescriptor(
                  window.HTMLTextAreaElement.prototype, "value"
                )?.set;
                if (nativeSetter) {
                  nativeSetter.call(target, action.value);
                  target.dispatchEvent(new Event("input", { bubbles: true }));
                  target.dispatchEvent(new Event("change", { bubbles: true }));
                }
              }
              break;
            }
            case "keydown": {
              document.activeElement?.dispatchEvent(
                new KeyboardEvent("keydown", { key: action.key, bubbles: true })
              );
              document.activeElement?.dispatchEvent(
                new KeyboardEvent("keyup", { key: action.key, bubbles: true })
              );
              break;
            }
          }
        } catch (err) {
          console.warn("[RemoteControl] Error executing action:", err);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
}

function showClickRipple(x: number, y: number) {
  const ripple = document.createElement("div");
  ripple.style.cssText = `
    position: fixed;
    left: ${x - 15}px;
    top: ${y - 15}px;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(59, 130, 246, 0.4);
    border: 2px solid rgba(59, 130, 246, 0.8);
    pointer-events: none;
    z-index: 99999;
    animation: remote-click-ripple 0.6s ease-out forwards;
  `;

  if (!document.getElementById("remote-click-ripple-style")) {
    const style = document.createElement("style");
    style.id = "remote-click-ripple-style";
    style.textContent = `
      @keyframes remote-click-ripple {
        0% { transform: scale(0.5); opacity: 1; }
        100% { transform: scale(2); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}
