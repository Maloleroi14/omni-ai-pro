
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ConversationFavoritesProps {
  conversationId: string | null;
}

export function ConversationFavorites({ conversationId }: ConversationFavoritesProps) {
  const { user } = useAuthContext();
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!user || !conversationId) { setIsFavorite(false); return; }
    supabase
      .from("user_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("conversation_id", conversationId)
      .maybeSingle()
      .then(({ data }) => setIsFavorite(!!data));
  }, [user, conversationId]);

  const toggle = async () => {
    if (!user || !conversationId) return;
    if (isFavorite) {
      await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("conversation_id", conversationId);
      setIsFavorite(false);
      toast({ title: "Retiré des favoris" });
    } else {
      await supabase
        .from("user_favorites")
        .insert({ user_id: user.id, conversation_id: conversationId } as any);
      setIsFavorite(true);
      toast({ title: "Ajouté aux favoris ⭐" });
    }
  };

  if (!conversationId || !user) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={toggle}
      title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <Star className={`w-4 h-4 ${isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
    </Button>
  );
}
