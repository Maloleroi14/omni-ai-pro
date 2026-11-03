import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, X } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

export function UserAdsDisplay() {
  const { user, isAdmin } = useAuthContext();
  const [ads, setAds] = useState<{ id: string; content: string }[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || isAdmin) return;

    const loadAds = async () => {
      const { data } = await supabase
        .from("user_ads")
        .select("id, content, target_user_id")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!data) return;

      // Filter: show global ads + ads targeted at this user
      const visible = data.filter(
        (ad) => !ad.target_user_id || ad.target_user_id === user.id
      );
      setAds(visible.map((a) => ({ id: a.id, content: a.content })));
    };

    loadAds();
  }, [user, isAdmin]);

  const visibleAds = ads.filter((a) => !dismissed.has(a.id));

  if (visibleAds.length === 0) return null;

  return (
    <div className="space-y-2 mb-3">
      {visibleAds.map((ad) => (
        <div
          key={ad.id}
          className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm"
        >
          <Megaphone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="flex-1 text-foreground">{ad.content}</p>
          <button
            onClick={() => setDismissed((s) => new Set(s).add(ad.id))}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
