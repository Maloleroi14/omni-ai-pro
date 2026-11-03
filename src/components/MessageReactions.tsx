import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MessageReactionsProps {
  messageId: string;
}

type ReactionType = "like" | "dislike" | null;

export function MessageReactions({ messageId }: MessageReactionsProps) {
  const { user } = useAuthContext();
  const [userReaction, setUserReaction] = useState<ReactionType>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [dislikesCount, setDislikesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadReactions();
  }, [messageId]);

  const loadReactions = async () => {
    // Get counts
    const { data: reactions } = await supabase
      .from("message_reactions")
      .select("reaction_type, user_id")
      .eq("message_id", messageId);

    if (reactions) {
      setLikesCount(reactions.filter(r => r.reaction_type === "like").length);
      setDislikesCount(reactions.filter(r => r.reaction_type === "dislike").length);
      
      // Get user's reaction
      if (user) {
        const userReact = reactions.find(r => r.user_id === user.id);
        setUserReaction(userReact?.reaction_type as ReactionType || null);
      }
    }
  };

  const handleReaction = async (type: "like" | "dislike") => {
    if (!user) {
      toast.error("Connectez-vous pour réagir");
      return;
    }

    setIsLoading(true);

    try {
      if (userReaction === type) {
        // Remove reaction
        await supabase
          .from("message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id);
        
        setUserReaction(null);
        if (type === "like") setLikesCount(prev => prev - 1);
        else setDislikesCount(prev => prev - 1);
      } else {
        // Add or update reaction
        if (userReaction) {
          // Update existing
          await supabase
            .from("message_reactions")
            .update({ reaction_type: type })
            .eq("message_id", messageId)
            .eq("user_id", user.id);
          
          if (userReaction === "like") {
            setLikesCount(prev => prev - 1);
            setDislikesCount(prev => prev + 1);
          } else {
            setDislikesCount(prev => prev - 1);
            setLikesCount(prev => prev + 1);
          }
        } else {
          // Insert new
          await supabase
            .from("message_reactions")
            .insert({
              message_id: messageId,
              user_id: user.id,
              reaction_type: type,
            });
          
          if (type === "like") setLikesCount(prev => prev + 1);
          else setDislikesCount(prev => prev + 1);
        }
        setUserReaction(type);
      }
    } catch (error) {
      toast.error("Erreur lors de la réaction");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1 mt-2">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 px-2 gap-1 text-xs",
          userReaction === "like" && "text-green-500 bg-green-500/10"
        )}
        onClick={(e) => {
          e.stopPropagation();
          handleReaction("like");
        }}
        disabled={isLoading}
      >
        <ThumbsUp className="w-3 h-3" />
        {likesCount > 0 && <span>{likesCount}</span>}
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 px-2 gap-1 text-xs",
          userReaction === "dislike" && "text-red-500 bg-red-500/10"
        )}
        onClick={(e) => {
          e.stopPropagation();
          handleReaction("dislike");
        }}
        disabled={isLoading}
      >
        <ThumbsDown className="w-3 h-3" />
        {dislikesCount > 0 && <span>{dislikesCount}</span>}
      </Button>
    </div>
  );
}
