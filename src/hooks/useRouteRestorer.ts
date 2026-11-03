import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const ROUTE_KEY = "omni_last_route";

// Pages that should NOT be saved/restored (landing, auth)
const EXCLUDED_ROUTES = ["/", "/auth"];

/**
 * Persists the current route so users return to the same page
 * after screen off/refresh/tab switch.
 */
export function useRouteRestorer() {
  const location = useLocation();
  const navigate = useNavigate();

  // Save current route on every navigation (excluding landing/auth)
  useEffect(() => {
    const fullPath = location.pathname + location.search + location.hash;
    if (!EXCLUDED_ROUTES.includes(location.pathname)) {
      sessionStorage.setItem(ROUTE_KEY, fullPath);
    }
  }, [location]);

  // On mount: if we're on "/" and there's a saved route, restore it
  useEffect(() => {
    if (location.pathname === "/") {
      const saved = sessionStorage.getItem(ROUTE_KEY);
      if (saved && saved !== "/" && saved !== "/auth") {
        navigate(saved, { replace: true });
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
