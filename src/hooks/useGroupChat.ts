import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GroupMessage = {
  id: string;
  content: string;
  user_id: string | null;
  user_email: string | null;
  created_at: string;
  role: string;
};

export type GroupChat = {
  id: string;
  title: string;
  type: "group_all" | "group_admin" | "group_cocreator" | "group_creator_only";
};

const GROUP_ALL_ID = "00000000-0000-0000-0000-000000000001";
const GROUP_ADMIN_ID = "00000000-0000-0000-0000-000000000002";
const GROUP_COCREATOR_ID = "00000000-0000-0000-0000-000000000006";

export function useGroupChat() {
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Load available group chats based on user role
  const loadGroupChats = useCallback(async (isAdmin: boolean, isCoCreator?: boolean, isVicePresident?: boolean, isCreator?: boolean) => {
    const chats: GroupChat[] = [
      { id: GROUP_ALL_ID, title: "💬 Chat Général", type: "group_all" },
    ];
    
    if (isAdmin) {
      chats.push({ id: GROUP_ADMIN_ID, title: "🛡️ Chat Admins", type: "group_admin" });
    }

    // Co-creator chat: accessible to co-creators, VPs, and admin/creator
    if (isCoCreator || isVicePresident || isCreator || isAdmin) {
      chats.push({ id: GROUP_COCREATOR_ID, title: "✨ Chat Co-créateurs", type: "group_cocreator" });
    }
    
    setGroupChats(chats);
  }, []);

  // Load messages for a group chat
  const loadGroupMessages = useCallback(async (groupId: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", groupId)
      .order("created_at", { ascending: true });
    
    if (!error && data) {
      setMessages(data.map(m => ({
        id: m.id,
        content: m.content,
        user_id: m.user_id,
        user_email: m.user_email,
        created_at: m.created_at,
        role: m.role,
      })));
    }
    setCurrentGroupId(groupId);
    setIsLoading(false);
    
    // Clear unread count for this group
    setUnreadCounts(prev => ({ ...prev, [groupId]: 0 }));
  }, []);

  // Send a message to group chat
  const sendGroupMessage = useCallback(async (content: string, userId: string, userEmail: string) => {
    if (!currentGroupId || !content.trim()) return;

    const { data, error } = await supabase.from("messages").insert({
      conversation_id: currentGroupId,
      content: content.trim(),
      role: "user",
      user_id: userId,
      user_email: userEmail,
    }).select().single();

    if (!error && data) {
      setMessages(prev => [...prev, {
        id: data.id,
        content: data.content,
        user_id: data.user_id,
        user_email: data.user_email,
        created_at: data.created_at,
        role: data.role,
      }]);
    }
  }, [currentGroupId]);

  // Delete a message (creator can delete any message)
  const deleteMessage = useCallback(async (messageId: string, userId: string, isCreator?: boolean) => {
    let query = supabase.from("messages").delete().eq("id", messageId);
    if (!isCreator) {
      query = query.eq("user_id", userId);
    }
    const { error } = await query;

    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    }
    return !error;
  }, []);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!currentGroupId) return;

    const channel = supabase
      .channel(`group-${currentGroupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${currentGroupId}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              id: newMsg.id,
              content: newMsg.content,
              user_id: newMsg.user_id,
              user_email: newMsg.user_email,
              created_at: newMsg.created_at,
              role: newMsg.role,
            }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentGroupId]);

  const closeGroupChat = useCallback(() => {
    setCurrentGroupId(null);
    setMessages([]);
  }, []);

  return {
    groupChats,
    currentGroupId,
    messages,
    isLoading,
    unreadCounts,
    loadGroupChats,
    loadGroupMessages,
    sendGroupMessage,
    deleteMessage,
    closeGroupChat,
  };
}
