import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function usePushNotifications() {
  const { user } = useAuthContext();
  const permissionAsked = useRef(false);

  // Request browser notification permission on mount
  useEffect(() => {
    if (!user || permissionAsked.current) return;
    if ("Notification" in window && Notification.permission === "default") {
      permissionAsked.current = true;
      Notification.requestPermission();
    }
  }, [user]);

  // Listen for new DMs globally
  useEffect(() => {
    if (!user) return;

    const dmChannel = supabase
      .channel("push-dm-notifs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        async (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id === user.id) return;

          // Check if this conversation belongs to the user
          const { data: conv } = await supabase
            .from("direct_conversations")
            .select("user1_id, user2_id")
            .eq("id", msg.conversation_id)
            .maybeSingle();
          if (!conv) return;
          if (conv.user1_id !== user.id && conv.user2_id !== user.id) return;

          // Get sender name
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, email")
            .eq("user_id", msg.sender_id)
            .maybeSingle();
          const senderName = profile?.display_name || profile?.email?.split("@")[0] || "Quelqu'un";
          const preview = msg.content?.length > 60 ? msg.content.slice(0, 60) + "…" : msg.content;

          // In-app toast
          toast.message(`💬 ${senderName}`, { description: preview });

          // Browser notification if tab not focused
          if (document.hidden && "Notification" in window && Notification.permission === "granted") {
            new Notification(`💬 ${senderName}`, {
              body: preview,
              icon: "/placeholder.svg",
              tag: `dm-${msg.id}`,
            });
          }
        }
      )
      .subscribe();

    const groupChannel = supabase
      .channel("push-group-notifs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_group_messages" },
        async (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id === user.id) return;

          // Check if user is a member of this group (or admin)
          const { data: membership } = await (supabase as any)
            .from("dm_group_members")
            .select("id")
            .eq("group_id", msg.group_id)
            .eq("user_id", user.id)
            .maybeSingle();

          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);
          const isAdmin = roles?.some((r) => r.role === "admin");

          if (!membership && !isAdmin) return;

          // Get sender & group name
          const [{ data: profile }, { data: group }] = await Promise.all([
            supabase.from("profiles").select("display_name, email").eq("user_id", msg.sender_id).maybeSingle(),
            (supabase as any).from("dm_groups").select("name").eq("id", msg.group_id).maybeSingle(),
          ]);

          const senderName = profile?.display_name || profile?.email?.split("@")[0] || "Quelqu'un";
          const groupName = group?.name || "Groupe";
          const preview = msg.content?.length > 50 ? msg.content.slice(0, 50) + "…" : msg.content;

          toast.message(`👥 ${groupName}`, { description: `${senderName}: ${preview}` });

          if (document.hidden && "Notification" in window && Notification.permission === "granted") {
            new Notification(`👥 ${groupName}`, {
              body: `${senderName}: ${preview}`,
              icon: "/placeholder.svg",
              tag: `group-${msg.id}`,
            });
          }
        }
      )
      .subscribe();

    // Also listen for group chat (messages table) notifications
    const groupChatChannel = supabase
      .channel("push-groupchat-notifs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as any;
          if (msg.user_id === user.id) return;
          // Only notify for group conversations (the fixed group chats)
          const groupIds = [
            "00000000-0000-0000-0000-000000000001",
            "00000000-0000-0000-0000-000000000002",
            "00000000-0000-0000-0000-000000000006",
          ];
          if (!groupIds.includes(msg.conversation_id)) return;

          const groupNames: Record<string, string> = {
            "00000000-0000-0000-0000-000000000001": "💬 Chat Général",
            "00000000-0000-0000-0000-000000000002": "🛡️ Chat Admins",
            "00000000-0000-0000-0000-000000000006": "✨ Chat Co-créateurs",
          };

          const senderName = msg.user_email?.split("@")[0] || "Quelqu'un";
          const preview = msg.content?.length > 50 ? msg.content.slice(0, 50) + "…" : msg.content;
          const title = groupNames[msg.conversation_id] || "Chat de groupe";

          toast.message(title, { description: `${senderName}: ${preview}` });

          if (document.hidden && "Notification" in window && Notification.permission === "granted") {
            new Notification(title, {
              body: `${senderName}: ${preview}`,
              icon: "/placeholder.svg",
              tag: `gchat-${msg.id}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dmChannel);
      supabase.removeChannel(groupChannel);
      supabase.removeChannel(groupChatChannel);
    };
  }, [user]);
}
