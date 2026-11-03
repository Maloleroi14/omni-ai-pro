import { Button } from "@/components/ui/button";
import { Mic, Loader2, PhoneOff, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useElevenLabsConversation } from "@/hooks/useElevenLabsConversation";

interface ElevenLabsVoiceButtonProps {
  onTranscript?: (text: string, isUser: boolean) => void;
  disabled?: boolean;
}

export function ElevenLabsVoiceButton({
  onTranscript,
  disabled,
}: ElevenLabsVoiceButtonProps) {
  const { 
    status, 
    isConnected, 
    isSpeaking,
    connect, 
    disconnect,
  } = useElevenLabsConversation({
    onTranscript,
  });

  const handleClick = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      await connect();
    }
  };

  const getIcon = () => {
    switch (status) {
      case "connecting":
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case "speaking":
        return <Volume2 className="w-5 h-5 animate-pulse" />;
      case "listening":
        return <Mic className="w-5 h-5 animate-pulse" />;
      default:
        return <Mic className="w-5 h-5" />;
    }
  };

  const getButtonStyle = () => {
    if (status === "speaking") {
      return "bg-primary hover:bg-primary/90 text-primary-foreground";
    }
    if (status === "listening") {
      return "bg-destructive hover:bg-destructive/90 text-destructive-foreground animate-pulse";
    }
    return "";
  };

  const getTitle = () => {
    switch (status) {
      case "connecting":
        return "Connexion en cours...";
      case "speaking":
        return "L'IA parle...";
      case "listening":
        return "Écoute en cours - Cliquez pour arrêter";
      default:
        return "Démarrer une conversation vocale";
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isConnected && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-destructive/10 rounded-full">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs text-destructive font-medium">
            {isSpeaking ? "IA parle" : "Écoute..."}
          </span>
        </div>
      )}
      
      <Button
        type="button"
        variant={isConnected ? "default" : "ghost"}
        size="icon"
        className={cn(
          "h-10 w-10 shrink-0 transition-all",
          !isConnected && "hover:bg-primary/10 hover:text-primary",
          getButtonStyle()
        )}
        onClick={handleClick}
        disabled={disabled || status === "connecting"}
        title={getTitle()}
      >
        {isConnected ? (
          <PhoneOff className="w-5 h-5" />
        ) : (
          getIcon()
        )}
      </Button>
    </div>
  );
}
