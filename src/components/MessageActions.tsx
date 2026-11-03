import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Languages, Pin, Volume2, VolumeX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface MessageActionsProps {
  content: string;
  messageId?: string;
  isPinned?: boolean;
  onRegenerate?: () => void;
  onPin?: (messageId: string) => void;
  isRegenerating?: boolean;
}

export function MessageActions({ 
  content, 
  messageId, 
  isPinned, 
  onRegenerate, 
  onPin,
  isRegenerating 
}: MessageActionsProps) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const handleTranslate = async () => {
    if (translatedText) {
      setShowTranslation(!showTranslation);
      return;
    }

    setIsTranslating(true);
    try {
      // Detect if content is mostly French -> translate to English, otherwise to French
      const isFrench = /[àâéèêëïîôùûüÿçœæ]/.test(content) || 
        /\b(le|la|les|un|une|des|est|sont|dans|pour|avec|sur|par|que|qui|pas|mais|ou|et|donc)\b/i.test(content);
      
      const targetLang = isFrench ? "anglais" : "français";
      
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [
            { role: "system", content: `Traduis le texte suivant en ${targetLang}. Retourne UNIQUEMENT la traduction, sans explication.` },
            { role: "user", content }
          ]
        }
      });

      if (error) throw error;

      // Handle streaming response
      if (typeof data === "string") {
        // Parse SSE response
        const lines = data.split("\n");
        let result = "";
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const parsed = JSON.parse(line.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) result += delta;
            } catch {}
          }
        }
        setTranslatedText(result || "Traduction indisponible");
      } else if (data?.choices?.[0]?.message?.content) {
        setTranslatedText(data.choices[0].message.content);
      } else {
        setTranslatedText("Traduction indisponible");
      }
      setShowTranslation(true);
    } catch (e) {
      console.error("Translation error:", e);
      toast.error("Erreur lors de la traduction");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Strip markdown from content for speech
    const plainText = content
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      .replace(/[-*+]\s/g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ");

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = "fr-FR";
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 mt-2">
        {onRegenerate && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
            disabled={isRegenerating}
          >
            <RefreshCw className={cn("w-3 h-3", isRegenerating && "animate-spin")} />
            Régénérer
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); handleTranslate(); }}
          disabled={isTranslating}
        >
          {isTranslating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
          {translatedText ? (showTranslation ? "Masquer" : "Voir") : "Traduire"}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground",
            isSpeaking && "text-primary"
          )}
          onClick={(e) => { e.stopPropagation(); handleSpeak(); }}
        >
          {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          {isSpeaking ? "Stop" : "Lire"}
        </Button>

        {messageId && onPin && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 text-xs gap-1",
              isPinned ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={(e) => { e.stopPropagation(); onPin(messageId); }}
          >
            <Pin className={cn("w-3 h-3", isPinned && "fill-current")} />
            {isPinned ? "Épinglé" : "Épingler"}
          </Button>
        )}
      </div>

      {/* Translation result */}
      {showTranslation && translatedText && (
        <div className="p-2 bg-primary/5 rounded-lg border border-primary/20 text-sm animate-in fade-in duration-200">
          <p className="text-xs text-primary font-medium mb-1">🌐 Traduction</p>
          <p className="text-foreground">{translatedText}</p>
        </div>
      )}
    </div>
  );
}
