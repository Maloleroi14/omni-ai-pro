import { cn } from "@/lib/utils";
import { Bot, User, Trash2, Play, Copy, Check, BadgeCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import { VideoPlayer } from "./VideoPlayer";
import { MessageReactions } from "./MessageReactions";
import { MessageActions } from "./MessageActions";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  messageId?: string;
  createdAt?: string;
  onDelete?: (messageId: string) => void;
  onRegenerate?: () => void;
  onPin?: (messageId: string) => void;
  isPinned?: boolean;
  isRegenerating?: boolean;
  isLastAssistant?: boolean;
}

// Format timestamp helper
function formatMessageTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  
  if (isToday) return time;
  if (isYesterday) return `Hier ${time}`;
  return `${date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} ${time}`;
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /img\.youtube\.com\/vi\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function ChatMessage({ role, content, imageUrl, messageId, createdAt, onDelete, onRegenerate, onPin, isPinned, isRegenerating, isLastAssistant }: ChatMessageProps) {
  const isUser = role === "user";
  const { user, isCoCreator, isVicePresident } = useAuthContext();
  const isCreator = user?.email === "omniaiproultime@gmail.com";
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [videoPlayer, setVideoPlayer] = useState<{ id: string; title: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      toast.error("Erreur lors de la copie");
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2000);
    } catch (err) {
      toast.error("Erreur lors de la copie");
    }
  };

  const handleDoubleClick = () => {
    if (messageId && onDelete) {
      setShowDeleteDialog(true);
    }
  };

  const handleConfirmDelete = () => {
    if (messageId && onDelete) {
      onDelete(messageId);
    }
    setShowDeleteDialog(false);
  };

  const handleVideoClick = (videoId: string, title: string) => {
    setVideoPlayer({ id: videoId, title });
  };

  return (
    <>
      <div
        onDoubleClick={handleDoubleClick}
        className={cn(
          "flex gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl max-w-[95%] sm:max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300 group cursor-pointer transition-all hover:opacity-90 overflow-hidden",
          isUser
            ? "ml-auto bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20"
            : "mr-auto bg-gradient-to-br from-muted to-muted/80",
          !isUser && isLastAssistant && "message-glow"
        )}
        title="Double-cliquez pour supprimer"
      >
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            isUser ? "bg-primary-foreground/20" : "bg-primary/10 animate-glow-ring"
          )}
        >
          {isUser ? (
            <User className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{isUser ? "Vous" : "OmniAI"}</p>
              {isUser && isCreator && (
                <span className="inline-flex items-center gap-0.5 bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                  <BadgeCheck className="w-3 h-3 fill-blue-500 text-white" />
                  Créateur
                </span>
              )}
              {isUser && !isCreator && isCoCreator && (
                <span className="inline-flex items-center gap-0.5 bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                  <BadgeCheck className="w-3 h-3 fill-green-500 text-white" />
                  Co-créateur
                </span>
              )}
              {isUser && !isCreator && !isCoCreator && isVicePresident && (
                <span className="inline-flex items-center gap-0.5 bg-purple-500/10 text-purple-500 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                  <BadgeCheck className="w-3 h-3 fill-purple-500 text-white" />
                  Vice-Président
                </span>
              )}
              {createdAt && (
                <span className={cn(
                  "text-xs opacity-60",
                  isUser ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {formatMessageTime(createdAt)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "w-6 h-6",
                  isUser ? "hover:bg-primary-foreground/20" : "hover:bg-background"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyMessage();
                }}
                title="Copier le message"
              >
                {copiedMessage ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
              {messageId && onDelete && (
                <Trash2 className="w-3 h-3 opacity-50" />
              )}
            </div>
          </div>
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt="Image générée" 
              className="rounded-lg max-w-full mb-2"
              loading="lazy"
              onError={(e) => {
                console.error("Image failed to load:", imageUrl?.slice(0, 100));
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div className={cn(
            "text-sm prose prose-sm max-w-none break-words overflow-wrap-anywhere",
            isUser ? "prose-invert" : "dark:prose-invert",
            "[&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-all [&_code]:whitespace-pre-wrap"
          )}>
            <ReactMarkdown
              components={{
                a: ({ href, children }) => {
                  // Check if this is a YouTube link
                  const videoId = href ? extractYouTubeId(href) : null;
                  if (videoId) {
                    return (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleVideoClick(videoId, String(children) || "Vidéo");
                        }}
                        className="text-primary underline hover:text-primary/80 inline-flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        {children}
                      </button>
                    );
                  }
                  return (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      {children}
                    </a>
                  );
                },
                img: ({ src, alt }) => {
                  // Check if this is a YouTube thumbnail
                  const videoId = src ? extractYouTubeId(src) : null;
                  if (videoId) {
                    return (
                      <div 
                        className="relative cursor-pointer group/video rounded-lg overflow-hidden my-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleVideoClick(videoId, alt || "Vidéo");
                        }}
                      >
                        <img 
                          src={src} 
                          alt={alt} 
                          className="rounded-lg max-w-full transition-transform group-hover/video:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover/video:opacity-100 transition-opacity">
                          <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg transform group-hover/video:scale-110 transition-transform">
                            <Play className="w-8 h-8 text-white ml-1" fill="white" />
                          </div>
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 text-white text-xs bg-black/50 px-2 py-1 rounded opacity-0 group-hover/video:opacity-100 transition-opacity">
                          ▶️ Cliquez pour regarder en plein écran
                        </div>
                      </div>
                    );
                  }
                  return <img src={src} alt={alt} className="rounded-lg max-w-full my-2" />;
                },
                code: ({ children, className }) => {
                  const codeString = String(children).replace(/\n$/, "");
                  const isInline = !className;
                  
                  if (isInline) {
                    return (
                      <code className="bg-background/50 px-1 py-0.5 rounded text-xs">{children}</code>
                    );
                  }
                  
                  return (
                    <div className="relative my-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-2 right-2 h-7 px-2 z-10 shadow-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCopyCode(codeString);
                        }}
                      >
                        {copiedCode === codeString ? (
                          <>
                            <Check className="w-3 h-3 mr-1 text-green-500" />
                            <span className="text-xs">Copié</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            <span className="text-xs">Copier</span>
                          </>
                        )}
                      </Button>
                      <code className={cn("block bg-background/50 p-3 pr-12 sm:pr-20 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all max-w-full", className)}>
                        {children}
                      </code>
                    </div>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
          
          {/* Actions for assistant messages */}
          {!isUser && (
            <MessageActions
              content={content}
              messageId={messageId}
              isPinned={isPinned}
              onRegenerate={onRegenerate}
              onPin={onPin}
              isRegenerating={isRegenerating}
            />
          )}
          
          {/* Reactions for assistant messages only */}
          {!isUser && messageId && (
            <MessageReactions messageId={messageId} />
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {videoPlayer && (
        <VideoPlayer
          videoId={videoPlayer.id}
          title={videoPlayer.title}
          isOpen={true}
          onClose={() => setVideoPlayer(null)}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le message sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
