import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { MessageSquarePlus, Trash2, MessageCircle, Users, Shield, Sparkles, Pencil, Check, X, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
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
import type { Conversation } from "@/hooks/useChat";
import type { GroupChat } from "@/hooks/useGroupChat";

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => Promise<boolean>;
  onTogglePin?: (id: string, isPinned: boolean) => void;
  groupChats?: GroupChat[];
  onSelectGroup?: (id: string) => void;
  currentGroupId?: string | null;
  isAuthenticated?: boolean;
}

export function ConversationSidebar({ 
  conversations, 
  currentId, 
  onSelect, 
  onNew, 
  onDelete,
  onRename,
  onTogglePin,
  groupChats = [],
  onSelectGroup,
  currentGroupId,
  isAuthenticated = true,
}: ConversationSidebarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [longPressActive, setLongPressActive] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const { t } = useLanguage();

  const handleLongPressStart = (id: string) => {
    setLongPressActive(id);
    longPressTimer.current = setTimeout(() => {
      setConversationToDelete(id);
      setDeleteDialogOpen(true);
      setLongPressActive(null);
    }, 2000);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setLongPressActive(null);
  };

  const handleConfirmDelete = () => {
    if (conversationToDelete) {
      onDelete(conversationToDelete);
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  const startEditing = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const confirmEditing = async () => {
    if (editingId && editTitle.trim() && onRename) {
      await onRename(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle("");
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmEditing();
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  // Get last message preview for a conversation
  const getPreview = (conv: Conversation) => {
    const updated = new Date(conv.created_at);
    const now = new Date();
    const diffMs = now.getTime() - updated.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);
    
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    if (diffH < 24) return `Il y a ${diffH}h`;
    return `Il y a ${diffD}j`;
  };

  return (
    <>
      <div className="w-64 h-full border-r bg-card/50 backdrop-blur-xl flex flex-col animate-in slide-in-from-left-4 duration-300">
        <div className="p-3 border-b">
          <Button onClick={onNew} className="w-full gap-2 ripple-btn" variant="outline">
            <MessageSquarePlus className="w-4 h-4" />
            {t("sidebar.new_conversation")}
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {!isAuthenticated ? (
              <div className="text-sm text-muted-foreground text-center py-4 px-2">
                <p className="mb-2">{t("sidebar.login_prompt")}</p>
                <p className="text-xs opacity-70">{t("sidebar.login_hint")}</p>
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("sidebar.no_conversations")}
              </p>
            ) : (
              [...conversations].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)).map((conv, i) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all select-none relative animate-in fade-in slide-in-from-left-2",
                    currentId === conv.id 
                      ? "bg-primary/10 text-primary shadow-sm" 
                      : "hover:bg-muted/80 hover:shadow-sm",
                    longPressActive === conv.id && "bg-destructive/20 scale-95",
                    editingId === conv.id && "bg-muted"
                  )}
                  style={{ animationDelay: `${i * 30}ms` }}
                  onClick={() => editingId !== conv.id && onSelect(conv.id)}
                  onMouseDown={() => editingId !== conv.id && handleLongPressStart(conv.id)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={() => editingId !== conv.id && handleLongPressStart(conv.id)}
                  onTouchEnd={handleLongPressEnd}
                  title={editingId === conv.id ? undefined : t("sidebar.hold_hint")}
                >
                  {/* Active conversation indicator bar */}
                  {currentId === conv.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary animate-in fade-in zoom-in duration-200" />
                  )}

                  <MessageCircle className={cn(
                    "w-4 h-4 flex-shrink-0 transition-colors",
                    currentId === conv.id ? "text-primary" : "text-muted-foreground"
                  )} />
                  {conv.is_pinned && <Pin className="w-3 h-3 text-primary absolute -top-1 -left-1" />}
                  
                  {editingId === conv.id ? (
                    <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        className="h-7 text-sm"
                        autoFocus
                      />
                      <Button variant="ghost" size="icon" className="w-6 h-6 flex-shrink-0" onClick={confirmEditing}>
                        <Check className="w-3 h-3 text-green-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-6 h-6 flex-shrink-0" onClick={cancelEditing}>
                        <X className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm truncate block font-medium">{conv.title}</span>
                        <span className="text-[10px] text-muted-foreground truncate block">{getPreview(conv)}</span>
                      </div>
                      {longPressActive === conv.id && (
                        <div className="w-4 h-4 rounded-full border-2 border-destructive border-t-transparent animate-spin" />
                      )}
                      {onRename && (
                        <Button variant="ghost" size="icon" className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); startEditing(conv); }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                      )}
                      {onTogglePin && (
                        <Button variant="ghost" size="icon" className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); onTogglePin(conv.id, !!conv.is_pinned); }}>
                          <Pin className={cn("w-3 h-3", conv.is_pinned && "text-primary fill-primary")} />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setConversationToDelete(conv.id); setDeleteDialogOpen(true); }}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Group Chats Section */}
        {groupChats.length > 0 && (
          <div className="border-t p-2 space-y-1">
            <p className="text-xs text-muted-foreground px-2 py-1 font-medium font-display">
              {t("sidebar.groups")}
            </p>
            {groupChats.map((group) => (
              <div
                key={group.id}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all relative",
                  currentGroupId === group.id
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "hover:bg-muted/80"
                )}
                onClick={() => onSelectGroup?.(group.id)}
              >
                {currentGroupId === group.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary" />
                )}
                {group.type === "group_admin" ? (
                  <Shield className="w-4 h-4 flex-shrink-0 text-amber-500" />
                ) : group.type === "group_cocreator" ? (
                  <Sparkles className="w-4 h-4 flex-shrink-0 text-primary" />
                ) : (
                  <Users className="w-4 h-4 flex-shrink-0 text-blue-500" />
                )}
                <span className="flex-1 text-sm truncate">{group.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sidebar.delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("sidebar.delete_desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("sidebar.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("sidebar.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
