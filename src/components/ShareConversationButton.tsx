
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Share2, Check, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface ShareConversationButtonProps {
  conversationId: string | null;
}

export function ShareConversationButton({ conversationId }: ShareConversationButtonProps) {
  const { user } = useAuthContext();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    if (!user || !conversationId) return;
    setLoading(true);
    
    // Check if already shared
    const { data: existing } = await supabase
      .from("shared_conversations")
      .select("share_token")
      .eq("conversation_id", conversationId)
      .eq("shared_by", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (existing) {
      setShareUrl(`${window.location.origin}/shared/${existing.share_token}`);
    } else {
      const { data } = await supabase
        .from("shared_conversations")
        .insert({ conversation_id: conversationId, shared_by: user.id } as any)
        .select("share_token")
        .single();
      if (data) {
        setShareUrl(`${window.location.origin}/shared/${data.share_token}`);
      }
    }
    setLoading(false);
  };

  const copyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Lien copié !" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!conversationId || !user) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Partager la conversation" onClick={generateLink}>
          <Share2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partager la conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Toute personne ayant ce lien pourra consulter cette conversation.
          </p>
          {shareUrl ? (
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 text-sm bg-muted rounded-md border truncate"
              />
              <Button onClick={copyLink} variant="outline" size="icon">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          ) : (
            <Button onClick={generateLink} disabled={loading} className="w-full">
              {loading ? "Génération..." : "Générer un lien de partage"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
