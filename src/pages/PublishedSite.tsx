import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function PublishedSite() {
  const { slug, "*": subPage } = useParams<{ slug: string; "*": string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        const { data: urlData } = supabase.storage
          .from("published-sites")
          .getPublicUrl(`${slug}/index.html`);

        const resp = await fetch(urlData.publicUrl);
        if (!resp.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        let content = await resp.text();
        if (!content.includes("<!DOCTYPE html") && !content.includes("<html") && !content.includes("<body")) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        // Inject a script that reads the initial page from the URL and navigates to it
        const initialPage = subPage?.replace(/^\/+/, "").trim() || "";
        const routingScript = `
<script>
(function() {
  var initialPage = "${initialPage}";
  if (initialPage && typeof navigateTo === 'function') {
    navigateTo(initialPage);
  } else if (initialPage) {
    window.addEventListener('DOMContentLoaded', function() {
      if (typeof navigateTo === 'function') navigateTo(initialPage);
    });
    window.addEventListener('load', function() {
      if (typeof navigateTo === 'function') navigateTo(initialPage);
    });
  }
  
  // Sync hash changes back to parent URL for deep linking
  window.addEventListener('hashchange', function() {
    var page = location.hash.replace('#', '');
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'page-change', page: page }, '*');
    }
  });
})();
</script>`;

        // Insert before </body> or at end
        if (content.includes("</body>")) {
          content = content.replace("</body>", routingScript + "</body>");
        } else {
          content += routingScript;
        }

        setHtml(content);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, subPage]);

  // Listen for page changes from iframe to update browser URL
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "page-change" && e.data.page && slug) {
        const page = e.data.page;
        const newPath = page === "accueil" ? `/s/${slug}` : `/s/${slug}/${page}`;
        if (window.location.pathname !== newPath) {
          window.history.replaceState(null, "", newPath);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !html) {
    return null;
  }

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      className="w-full h-screen border-0"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      title={`${slug}`}
      style={{ display: "block" }}
    />
  );
}
