import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Users, BadgeCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { GroupMessage } from "@/hooks/useGroupChat";

const CREATOR_EMAIL = "omniaiproultime@gmail.com";

interface GroupChatPanelProps {
  title: string;
  messages: GroupMessage[];
  currentUserId: string | null;
  currentUserEmail?: string | null;
  onSend: (content: string) => void;
  onDelete: (messageId: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function GroupChatPanel({
  title,
  messages,
  currentUserId,
  currentUserEmail,
  onSend,
  onDelete,
  onClose,
  isLoading,
}: GroupChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [coCreatorEmails, setCoCreatorEmails] = useState<string[]>([]);

  useEffect(() => {
    const loadCoCreators = async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "co_creator_email")
        .single();
      setCoCreatorEmails((data?.setting_value as any)?.emails || []);
    };
    loadCoCreators();
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Hier";
    }
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: GroupMessage[] }[] = [];
  let currentDate = "";
  
  messages.forEach((msg) => {
    const msgDate = formatDate(msg.created_at);
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Users className="w-12 h-12 mb-2 opacity-50" />
            <p>Aucun message</p>
            <p className="text-sm">Soyez le premier à écrire !</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMessages.map((group) => (
              <div key={group.date}>
                <div className="flex items-center justify-center mb-3">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {group.date}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.messages.map((msg) => {
                    const isMe = msg.user_id === currentUserId;
                    const isCreator = msg.user_email === CREATOR_EMAIL;
                    const isCoCreator = !isCreator && coCreatorEmails.includes(msg.user_email || "");
                    const displayName = isCreator ? "Inconnu" : (msg.user_email?.split("@")[0] || "Anonyme");
                    const isDeleting = deletingId === msg.id;
                    
                    const currentUserIsCreator = currentUserEmail === CREATOR_EMAIL;
                    
                    const handleDoubleClick = async () => {
                      if (!isMe && !currentUserIsCreator) {
                        toast.error("Vous ne pouvez supprimer que vos propres messages");
                        return;
                      }
                      setDeletingId(msg.id);
                      onDelete(msg.id);
                      toast.success("Message supprimé");
                      setDeletingId(null);
                    };
                    
                    return (
                      <div
                        key={msg.id}
                        onDoubleClick={handleDoubleClick}
                        className={cn(
                          "flex flex-col max-w-[80%] cursor-pointer transition-opacity select-none",
                          isMe ? "ml-auto items-end" : "items-start",
                          isDeleting && "opacity-50"
                        )}
                        title={(isMe || currentUserIsCreator) ? "Double-cliquez pour supprimer" : undefined}
                      >
                        {!isMe && (
                          <span className="text-xs text-muted-foreground mb-1 px-2 flex items-center gap-1.5">
                            <span className={isCreator || isCoCreator ? "font-semibold text-foreground" : ""}>
                              {displayName}
                            </span>
                            {isCreator && (
                              <span className="inline-flex items-center gap-0.5 bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                                <BadgeCheck className="w-3 h-3 fill-blue-500 text-white" />
                                Créateur
                              </span>
                            )}
                            {isCoCreator && (
                              <span className="inline-flex items-center gap-0.5 bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                                <BadgeCheck className="w-3 h-3 fill-emerald-500 text-white" />
                                Co-créateur
                              </span>
                            )}
                          </span>
                        )}
                        <div
                          className={cn(
                            "px-3 py-2 rounded-2xl group relative",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          {(isMe || currentUserIsCreator) && (
                            <span className={cn(
                              "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity",
                              isMe ? "-left-6" : "-right-6"
                            )}>
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground mt-1 px-2">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrire un message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
