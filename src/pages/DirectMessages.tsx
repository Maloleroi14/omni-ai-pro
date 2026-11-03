import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Plus, Send, Search, Check, CheckCheck, Users, Settings, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ConversationSettingsDialog } from "@/components/dm/ConversationSettingsDialog";
import { CreateGroupDialog } from "@/components/dm/CreateGroupDialog";
import { GroupSettingsDialog } from "@/components/dm/GroupSettingsDialog";

const CREATOR_EMAIL = "omniaiproultime@gmail.com";

const WALLPAPER_STYLES: Record<string, string> = {
  "gradient-blue": "bg-gradient-to-br from-blue-500/10 to-cyan-500/10",
  "gradient-purple": "bg-gradient-to-br from-purple-500/10 to-pink-500/10",
  "gradient-green": "bg-gradient-to-br from-green-500/10 to-emerald-500/10",
  "gradient-orange": "bg-gradient-to-br from-orange-500/10 to-amber-500/10",
  "gradient-dark": "bg-gradient-to-br from-gray-900/20 to-gray-800/20",
  "gradient-rose": "bg-gradient-to-br from-rose-500/10 to-pink-500/10",
  "pattern-dots": "bg-[radial-gradient(circle,hsl(var(--muted-foreground)/0.1)_1px,transparent_1px)] bg-[size:20px_20px]",
  "pattern-grid": "bg-[linear-gradient(hsl(var(--muted-foreground)/0.05)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--muted-foreground)/0.05)_1px,transparent_1px)] bg-[size:20px_20px]",
};

const FONT_MAP: Record<string, string> = {
  default: "",
  serif: "font-serif",
  mono: "font-mono",
  cursive: "font-[cursive]",
  comic: "font-['Comic_Sans_MS',cursive]",
  georgia: "font-['Georgia',serif]",
  verdana: "font-['Verdana',sans-serif]",
};

interface DirectConversation {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  other_display_name?: string;
  other_email?: string;
  other_user_id?: string;
  last_message?: string;
  unread_count?: number;
}

interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface UserProfile {
  user_id: string;
  display_name: string | null;
  email: string;
}

interface DMGroup {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  created_by: string;
  member_count?: number;
  last_message?: string;
}

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
}

export default function DirectMessages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAdmin } = useAuthContext();
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [groups, setGroups] = useState<DMGroup[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(searchParams.get("conv"));
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showConvSettings, setShowConvSettings] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showPinUnlock, setShowPinUnlock] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pendingConvId, setPendingConvId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [vpEmails, setVpEmails] = useState<string[]>([]);
  const [userIsVP, setUserIsVP] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [convSettings, setConvSettings] = useState<{ wallpaper_url?: string; font_family?: string } | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    loadRoles();
    loadConversations();
    loadGroups();
    loadBlockedUsers();
  }, [user]);

  const loadBlockedUsers = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("dm_user_blocks").select("blocked_id").eq("blocker_id", user.id);
    if (data) setBlockedUsers(data.map((d: any) => d.blocked_id));
    // Also check if blocked by others
    const { data: blockedBy } = await (supabase as any).from("dm_user_blocks").select("blocker_id").eq("blocked_id", user.id);
    if (blockedBy) setBlockedUsers(prev => [...prev, ...blockedBy.map((d: any) => d.blocker_id)]);
  };

  const loadRoles = async () => {
    if (!user) return;
    const { data: vpData } = await supabase
      .from("admin_settings").select("setting_value").eq("setting_key", "vice_president_emails").maybeSingle();
    const vps: string[] = (vpData?.setting_value as any)?.emails || [];
    setVpEmails(vps);
    setUserIsVP(vps.includes(user.email || ""));
    setUserIsAdmin(user.email === CREATOR_EMAIL);
  };

  const loadConversations = async () => {
    if (!user) return;
    const { data } = await supabase.from("direct_conversations").select("*")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });
    if (!data) return;

    const otherIds = data.map(c => c.user1_id === user.id ? c.user2_id : c.user1_id);
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, email").in("user_id", otherIds);
    const profileMap: Record<string, UserProfile> = {};
    profiles?.forEach(p => { profileMap[p.user_id] = p; });

    const enriched = await Promise.all(data.map(async (c) => {
      const otherId = c.user1_id === user.id ? c.user2_id : c.user1_id;
      const profile = profileMap[otherId];
      const { data: lastMsg } = await supabase.from("direct_messages").select("content")
        .eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const { count } = await supabase.from("direct_messages").select("id", { count: "exact", head: true })
        .eq("conversation_id", c.id).eq("is_read", false).neq("sender_id", user.id);
      return {
        ...c,
        other_display_name: profile?.display_name || profile?.email?.split("@")[0] || "Utilisateur",
        other_email: profile?.email,
        other_user_id: otherId,
        last_message: lastMsg?.content,
        unread_count: count || 0,
      };
    }));
    setConversations(enriched.filter(c => !blockedUsers.includes(c.other_user_id || "")));
  };

  const loadGroups = async () => {
    if (!user) return;
    // For admin/creator: load ALL groups. For others: load only joined groups.
    let groupsData: any[] = [];
    if (isAdmin) {
      const { data } = await (supabase as any).from("dm_groups").select("*").order("updated_at", { ascending: false });
      groupsData = data || [];
    } else {
      const { data: memberships } = await (supabase as any).from("dm_group_members").select("group_id").eq("user_id", user.id);
      if (memberships && memberships.length > 0) {
        const gids = memberships.map((m: any) => m.group_id);
        const { data } = await (supabase as any).from("dm_groups").select("*").in("id", gids).order("updated_at", { ascending: false });
        groupsData = data || [];
      }
    }

    // Get last message for each group
    const enriched = await Promise.all(groupsData.map(async (g: any) => {
      const { data: lastMsg } = await (supabase as any).from("dm_group_messages").select("content")
        .eq("group_id", g.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const { count } = await (supabase as any).from("dm_group_members").select("id", { count: "exact", head: true }).eq("group_id", g.id);
      return { ...g, last_message: lastMsg?.content, member_count: count || 0 };
    }));
    setGroups(enriched);
  };

  const loadConvSettings = async (convId: string) => {
    if (!user) return;
    const { data } = await (supabase as any).from("dm_conversation_settings").select("*")
      .eq("user_id", user.id).eq("conversation_id", convId).maybeSingle();
    setConvSettings(data || null);
  };

  const selectConversation = async (convId: string) => {
    if (!user) return;
    // Check if locked
    const { data } = await (supabase as any).from("dm_conversation_settings").select("is_locked, lock_pin")
      .eq("user_id", user.id).eq("conversation_id", convId).maybeSingle();
    
    if (data?.is_locked && data?.lock_pin) {
      setPendingConvId(convId);
      setPinInput("");
      setShowPinUnlock(true);
      return;
    }
    
    setSelectedGroupId(null);
    setSelectedConvId(convId);
    loadConvSettings(convId);
  };

  const handlePinUnlock = async () => {
    if (!pendingConvId || !user) return;
    const { data } = await (supabase as any).from("dm_conversation_settings").select("lock_pin")
      .eq("user_id", user.id).eq("conversation_id", pendingConvId).maybeSingle();
    
    if (data?.lock_pin === pinInput) {
      setShowPinUnlock(false);
      setSelectedGroupId(null);
      setSelectedConvId(pendingConvId);
      loadConvSettings(pendingConvId);
      setPendingConvId(null);
    } else {
      toast.error("Code PIN incorrect");
    }
  };

  const selectGroup = (groupId: string) => {
    setSelectedConvId(null);
    setSelectedGroupId(groupId);
    setConvSettings(null);
  };

  useEffect(() => {
    if (!selectedConvId) return;
    loadMessages(selectedConvId);
    if (user) {
      supabase.from("direct_messages").update({ is_read: true })
        .eq("conversation_id", selectedConvId).neq("sender_id", user.id).then(() => {});
    }
    const channel = supabase.channel(`dm-${selectedConvId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${selectedConvId}` },
        (payload) => {
          const newMsg = payload.new as DirectMessage;
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          if (newMsg.sender_id !== user?.id) {
            supabase.from("direct_messages").update({ is_read: true }).eq("id", newMsg.id).then(() => {});
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConvId]);

  // Group messages realtime
  useEffect(() => {
    if (!selectedGroupId) return;
    loadGroupMessages(selectedGroupId);
    const channel = supabase.channel(`dmg-${selectedGroupId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_group_messages", filter: `group_id=eq.${selectedGroupId}` },
        (payload) => {
          const newMsg = payload.new as any;
          setGroupMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, { ...newMsg, sender_name: "" }]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedGroupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, groupMessages]);

  const loadMessages = async (convId: string) => {
    const { data } = await supabase.from("direct_messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
    if (data) setMessages(data);
  };

  const loadGroupMessages = async (groupId: string) => {
    const { data } = await (supabase as any).from("dm_group_messages").select("*").eq("group_id", groupId).order("created_at", { ascending: true });
    if (!data) return;
    const senderIds = [...new Set(data.map((m: any) => m.sender_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, email").in("user_id", senderIds as string[]);
    const pMap: Record<string, string> = {};
    profiles?.forEach(p => { pMap[p.user_id] = p.display_name || p.email.split("@")[0]; });
    setGroupMessages(data.map((m: any) => ({ ...m, sender_name: pMap[m.sender_id] || "?" })));
  };

  const loadUsers = async () => {
    const { data } = await supabase.from("profiles").select("user_id, display_name, email");
    if (!data || !user) return;
    const filtered = data.filter(p => {
      if (p.user_id === user.id) return false;
      if (blockedUsers.includes(p.user_id)) return false;
      if (p.email === CREATOR_EMAIL && !userIsVP && !userIsAdmin) return false;
      if (vpEmails.includes(p.email) && !userIsAdmin && !userIsVP) return false;
      return true;
    });
    setUsers(filtered);
  };

  const startConversation = async (otherUserId: string) => {
    if (!user) return;
    const { data: existing } = await supabase.from("direct_conversations").select("id")
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
      .maybeSingle();
    if (existing) { setSelectedConvId(existing.id); setShowNewChat(false); return; }
    const { data: newConv, error } = await supabase.from("direct_conversations")
      .insert({ user1_id: user.id, user2_id: otherUserId }).select().single();
    if (error) { toast.error("Erreur"); return; }
    setShowNewChat(false);
    setSelectedConvId(newConv.id);
    loadConversations();
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    
    if (selectedGroupId) {
      if (!user) { setSending(false); return; }
      const { error } = await (supabase as any).from("dm_group_messages").insert({
        group_id: selectedGroupId, sender_id: user.id, content: input.trim(),
      });
      if (error) toast.error("Erreur d'envoi");
      else {
        await (supabase as any).from("dm_groups").update({ updated_at: new Date().toISOString() }).eq("id", selectedGroupId);
      }
    } else if (selectedConvId && user) {
      const { error } = await supabase.from("direct_messages").insert({
        conversation_id: selectedConvId, sender_id: user.id, content: input.trim(),
      });
      if (error) toast.error("Erreur d'envoi");
      else await supabase.from("direct_conversations").update({ updated_at: new Date().toISOString() }).eq("id", selectedConvId);
    }
    
    setInput("");
    setSending(false);
  };

  const blockUser = async () => {
    if (!user || !selectedConv?.other_user_id) return;
    const { error } = await (supabase as any).from("dm_user_blocks").insert({
      blocker_id: user.id, blocked_id: selectedConv.other_user_id, conversation_id: selectedConvId,
    });
    if (error) toast.error("Erreur");
    else {
      toast.success("Utilisateur bloqué");
      setShowConvSettings(false);
      setSelectedConvId(null);
      loadConversations();
      loadBlockedUsers();
    }
  };

  const banConversation = async () => {
    if (!user || !selectedConv?.other_user_id || !selectedConvId) return;
    if (!confirm("Bannir cette conversation ? Elle sera supprimée et vous ne pourrez plus communiquer.")) return;
    // Block both ways
    await (supabase as any).from("dm_user_blocks").upsert([
      { blocker_id: user.id, blocked_id: selectedConv.other_user_id, conversation_id: selectedConvId, reason: "banned" },
    ], { onConflict: "blocker_id,blocked_id" });
    // Delete conversation
    await supabase.from("direct_conversations").delete().eq("id", selectedConvId);
    toast.success("Conversation bannie");
    setShowConvSettings(false);
    setSelectedConvId(null);
    loadConversations();
    loadBlockedUsers();
  };

  const filteredUsers = users.filter(u =>
    (u.display_name || u.email).toLowerCase().includes(userSearch.toLowerCase())
  );

  const selectedConv = conversations.find(c => c.id === selectedConvId);
  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const wallpaperClass = convSettings?.wallpaper_url ? WALLPAPER_STYLES[convSettings.wallpaper_url] || "" : "";
  const fontClass = convSettings?.font_family ? FONT_MAP[convSettings.font_family] || "" : "";

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={cn(
        "w-full md:w-80 border-r border-border flex flex-col",
        (selectedConvId || selectedGroupId) ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="font-bold text-lg flex-1">Messages</h1>
          <Button size="icon" variant="outline" onClick={() => { setShowNewChat(true); loadUsers(); }}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {/* Groups */}
          {groups.length > 0 && (
            <div className="px-3 pt-2 pb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Groupes</span>
            </div>
          )}
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => selectGroup(g.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50",
                g.id === selectedGroupId && "bg-muted"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm truncate block">{g.name}</span>
                <p className="text-xs text-muted-foreground truncate">{g.last_message || `${g.member_count} membres`}</p>
              </div>
            </button>
          ))}

          {/* Conversations */}
          {conversations.length > 0 && (
            <div className="px-3 pt-2 pb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Conversations</span>
            </div>
          )}
          {conversations.length === 0 && groups.length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-sm">
              Aucune conversation. Appuyez sur + pour démarrer.
            </div>
          )}
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50",
                c.id === selectedConvId && "bg-muted"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                {(c.other_display_name || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{c.other_display_name}</span>
                  {(c.unread_count || 0) > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0">
                      {c.unread_count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.last_message || "Nouvelle conversation"}</p>
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className={cn(
        "flex-1 flex flex-col",
        !(selectedConvId || selectedGroupId) ? "hidden md:flex" : "flex"
      )}>
        {!(selectedConvId || selectedGroupId) ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Sélectionnez une conversation
          </div>
        ) : selectedGroupId ? (
          // Group chat
          <>
            <div className="p-3 border-b border-border flex items-center gap-3">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedGroupId(null)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <button onClick={() => setShowGroupSettings(true)} className="font-semibold text-sm hover:underline flex-1 text-left">
                {selectedGroup?.name}
              </button>
              <Button variant="ghost" size="icon" onClick={() => setShowGroupSettings(true)}>
                <Settings className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-2 max-w-2xl mx-auto">
                {groupMessages.map(msg => {
                  const isMine = msg.sender_id === user.id;
                  return (
                    <div key={msg.id} className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
                      {!isMine && <span className="text-xs text-muted-foreground mb-0.5 px-2">{msg.sender_name}</span>}
                      <div className={cn(
                        "max-w-[75%] px-3.5 py-2 rounded-2xl text-sm",
                        isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
                      )}>
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <span className="text-[10px] opacity-60 block text-right mt-1">
                          {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-border flex gap-2">
              <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Écrire un message..." className="rounded-full"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
              <Button size="icon" className="rounded-full shrink-0" onClick={sendMessage} disabled={!input.trim() || sending}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          // DM chat
          <>
            <div className="p-3 border-b border-border flex items-center gap-3">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConvId(null)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                {(selectedConv?.other_display_name || "?")[0].toUpperCase()}
              </div>
              <button onClick={() => setShowConvSettings(true)} className="font-semibold text-sm hover:underline flex-1 text-left">
                {selectedConv?.other_display_name}
              </button>
              <Button variant="ghost" size="icon" onClick={() => setShowConvSettings(true)}>
                <Settings className="w-4 h-4" />
              </Button>
            </div>

            <ScrollArea className={cn("flex-1 p-4", wallpaperClass)}>
              <div className={cn("space-y-2 max-w-2xl mx-auto", fontClass)}>
                {messages.map(msg => {
                  const isMine = msg.sender_id === user.id;
                  return (
                    <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[75%] px-3.5 py-2 rounded-2xl text-sm",
                        isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"
                      )}>
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className={cn("flex items-center gap-1 mt-1", isMine ? "justify-end" : "justify-start")}>
                          <span className="text-[10px] opacity-60">
                            {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isMine && (msg.is_read ? <CheckCheck className="w-3 h-3 opacity-60" /> : <Check className="w-3 h-3 opacity-40" />)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-border flex gap-2">
              <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Écrire un message..." className="rounded-full"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
              <Button size="icon" className="rounded-full shrink-0" onClick={sendMessage} disabled={!input.trim() || sending}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* New chat dialog */}
      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouvelle conversation</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant="outline" className="flex-1" onClick={() => { setShowNewChat(false); setShowCreateGroup(true); }}>
              <Users className="w-4 h-4 mr-2" /> Créer un groupe
            </Button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Rechercher un utilisateur..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9" />
          </div>
          <ScrollArea className="max-h-64">
            {filteredUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun utilisateur trouvé</p>
            ) : (
              filteredUsers.map(u => (
                <button key={u.user_id} onClick={() => startConversation(u.user_id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {(u.display_name || u.email.split("@")[0])[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{u.display_name || u.email.split("@")[0]}</span>
                </button>
              ))
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Create group dialog */}
      <CreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        userId={user.id}
        onGroupCreated={loadGroups}
      />

      {/* Conversation settings */}
      {selectedConvId && selectedConv && (
        <ConversationSettingsDialog
          open={showConvSettings}
          onOpenChange={(o) => { setShowConvSettings(o); if (!o) loadConvSettings(selectedConvId); }}
          conversationId={selectedConvId}
          userId={user.id}
          otherUserName={selectedConv.other_display_name || ""}
          otherUserId={selectedConv.other_user_id || ""}
          onBlock={blockUser}
          onBan={banConversation}
        />
      )}

      {/* Group settings */}
      {selectedGroupId && (
        <GroupSettingsDialog
          open={showGroupSettings}
          onOpenChange={setShowGroupSettings}
          groupId={selectedGroupId}
          userId={user.id}
          isCreator={selectedGroup?.created_by === user.id || isAdmin}
          onUpdate={() => { loadGroups(); if (!groups.find(g => g.id === selectedGroupId)) setSelectedGroupId(null); }}
        />
      )}

      {/* PIN unlock dialog */}
      <Dialog open={showPinUnlock} onOpenChange={setShowPinUnlock}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> Conversation verrouillée</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input type="password" inputMode="numeric" maxLength={6} placeholder="Entrez le code PIN"
              value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => { if (e.key === "Enter") handlePinUnlock(); }} />
            <Button className="w-full" onClick={handlePinUnlock}>Déverrouiller</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
