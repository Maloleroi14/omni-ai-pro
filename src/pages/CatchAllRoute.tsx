import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import NotFound from "./NotFound";

import { motion, AnimatePresence } from "framer-motion";

export default function CatchAllRoute() {
  const { "*": path } = useParams();
  const slug = path?.split("/")[0];
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPublishedSite, setIsPublishedSite] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockCode, setLockCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!slug || slug.includes(".") || slug.length < 3) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data: project } = await supabase
          .from("user_projects")
          .select("is_locked, lock_code, published_url")
          .eq("published_url", `${slug}.omni-ai-pro.com`)
          .maybeSingle();

        if (project && (project as any).is_locked && (project as any).lock_code) {
          setIsLocked(true);
          setLockCode((project as any).lock_code);
        }

        const { data: urlData } = supabase.storage
          .from("published-sites")
          .getPublicUrl(`${slug}/index.html`);

        const resp = await fetch(urlData.publicUrl);
        if (!resp.ok) {
          setLoading(false);
          return;
        }

        const content = await resp.text();
        if (content.includes("<html") || content.includes("<body") || content.includes("<!DOCTYPE")) {
          setHtml(content);
          setIsPublishedSite(true);
        }
      } catch {
        // Not a published site
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isPublishedSite && html) {
    if (isLocked && !unlocked) {
      return <NotFound />;
    }

    return (
      <div className="relative w-full h-screen">
        <AnimatePresence>
          {unlocked && (
            <motion.div
              className="absolute inset-0 z-10 pointer-events-none"
              initial={{ opacity: 1, scale: 0.8 }}
              animate={{ opacity: 0, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-500/20 backdrop-blur-xl" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.iframe
          srcDoc={html}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          title={slug}
          style={{ display: "block" }}
          initial={unlocked ? { opacity: 0, scale: 0.95 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        />

        {/* Made with Omni AI Pro badge - bottom right */}
        <a
          href="/"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/80 backdrop-blur-sm text-white text-[11px] font-medium shadow-lg hover:bg-black/90 hover:scale-105 active:scale-95 transition-all duration-200 group"
        >
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-[7px] font-bold">
            O
          </div>
          <span className="opacity-90 group-hover:opacity-100">Made with <span className="font-semibold text-violet-300">Omni AI Pro</span></span>
        </a>
      </div>
    );
  }

  return <NotFound />;
}
