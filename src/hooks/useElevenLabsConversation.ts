import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { VoiceLanguage } from "@/hooks/useCustomization";
import { VOICE_LANGUAGES } from "@/hooks/useCustomization";

export type VoiceGender = "masculine" | "feminine";

interface ChatMessage {
  role: string;
  content: string;
}

interface UseElevenLabsConversationOptions {
  onTranscript?: (text: string, isUser: boolean) => void;
  onStatusChange?: (status: "idle" | "connecting" | "connected" | "speaking" | "listening") => void;
  voiceGender?: VoiceGender;
  userId?: string;
  voiceLanguage?: VoiceLanguage;
  messages?: ChatMessage[];
}

// ElevenLabs Agent ID par défaut
const DEFAULT_AGENT_ID = "agent_3201kgwf1pg3erxtfd9y37wks7qn";

export function useElevenLabsConversation(options: UseElevenLabsConversationOptions = {}) {
  const { onTranscript, onStatusChange, userId, voiceLanguage = "auto", messages: chatMessages = [] } = options;
  const [isConnecting, setIsConnecting] = useState(false);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const conversation = useConversation({
    onConnect: () => {
      console.log("[ElevenLabs] ✅ Connected to agent");
      onStatusChange?.("connected");
      toast.success("Conversation vocale démarrée !");
      
      // Send periodic activity signals to prevent timeout
      keepAliveRef.current = setInterval(() => {
        try {
          conversation.sendUserActivity();
          console.log("[ElevenLabs] 💓 Keep-alive sent");
        } catch (e) {
          console.log("[ElevenLabs] Keep-alive failed (connection may be closing)");
        }
      }, 10000); // Every 10 seconds (was 15)
    },
    onDisconnect: () => {
      console.log("[ElevenLabs] ❌ Disconnected from agent - THIS IS THE DISCONNECT EVENT");
      console.trace("[ElevenLabs] Disconnect stack trace:");
      onStatusChange?.("idle");
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
        keepAliveRef.current = null;
      }
    },
    onMessage: (message) => {
      console.log("[ElevenLabs] 📨 Message:", JSON.stringify(message).slice(0, 500));
      
      const msg = message as unknown as Record<string, unknown>;
      
      if (msg.source === "user" && msg.message) {
        onTranscript?.(msg.message as string, true);
      } else if (msg.source === "ai" && msg.message) {
        onTranscript?.(msg.message as string, false);
      } else if (msg.user_transcription_event) {
        const event = msg.user_transcription_event as { user_transcript?: string };
        if (event.user_transcript) {
          onTranscript?.(event.user_transcript, true);
        }
      } else if (msg.agent_response_event) {
        const event = msg.agent_response_event as { agent_response?: string };
        if (event.agent_response) {
          onTranscript?.(event.agent_response, false);
        }
      }
    },
    onError: (error) => {
      console.error("[ElevenLabs] 🔥 Error:", error);
      console.error("[ElevenLabs] Error details:", JSON.stringify(error));
      toast.error("Erreur de conversation vocale");
      onStatusChange?.("idle");
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
        keepAliveRef.current = null;
      }
    },
  });

  const fetchAllUserMessages = useCallback(async (): Promise<string> => {
    if (!userId) {
      if (!chatMessages || chatMessages.length === 0) return "";
      const recent = chatMessages.slice(-50);
      return recent.map(m => `${m.role === "user" ? "Utilisateur" : "OmniAI"}: ${m.content}`).join("\n");
    }

    try {
      const { data: userConversations } = await supabase
        .from("conversations")
        .select("id, title")
        .eq("user_id", userId);

      if (!userConversations || userConversations.length === 0) return "";

      const convIds = userConversations.map(c => c.id);
      const convTitles = new Map(userConversations.map(c => [c.id, c.title]));

      const { data: allMessages, error } = await supabase
        .from("messages")
        .select("role, content, conversation_id, created_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: true });

      if (error || !allMessages || allMessages.length === 0) return "";

      const recentMessages = allMessages.slice(-80);
      return recentMessages.map(m => {
        const role = m.role === "user" ? "Utilisateur" : "OmniAI";
        const convTitle = convTitles.get(m.conversation_id) || "Conversation";
        return `[${convTitle}] ${role}: ${m.content}`;
      }).join("\n");
    } catch (err) {
      console.error("Error fetching all messages:", err);
      return "";
    }
  }, [userId, chatMessages]);

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    onStatusChange?.("connecting");

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL for WebSocket connection
      const { data, error } = await supabase.functions.invoke("elevenlabs-conversation-token", {
        body: { agentId: DEFAULT_AGENT_ID },
      });

      if (error || !data?.signed_url) {
        throw new Error(error?.message || "Failed to get signed URL");
      }

      // Fetch context for contextual update after connection
      const conversationContext = await fetchAllUserMessages();
      const selectedLanguage = VOICE_LANGUAGES.find(l => l.value === voiceLanguage);
      const languageInstruction = voiceLanguage === "auto" 
        ? "Détecte automatiquement la langue de l'utilisateur et réponds dans la même langue."
        : `Réponds UNIQUEMENT en ${selectedLanguage?.label || voiceLanguage}.`;

      console.log("Starting ElevenLabs session with WebSocket signed URL...");

      // Use WebSocket with signed URL (WebRTC fails with "v1 RTC path not found")
      await conversation.startSession({
        signedUrl: data.signed_url,
      });

      // After connection, send context as a contextual update (doesn't trigger a response)
      try {
        const contextMessage = `CONTEXTE: ${languageInstruction} Créateur = "Inconnu". ${conversationContext ? `Historique récent: ${conversationContext.slice(0, 2000)}` : ""}`;
        conversation.sendContextualUpdate(contextMessage);
        console.log("Sent contextual update with conversation history");
      } catch (e) {
        console.log("Could not send contextual update:", e);
      }

    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast.error("Impossible de démarrer la conversation");
      onStatusChange?.("idle");
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, onStatusChange, fetchAllUserMessages, voiceLanguage]);

  const stopConversation = useCallback(async () => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    await conversation.endSession();
    onStatusChange?.("idle");
  }, [conversation, onStatusChange]);

  return {
    status: conversation.status === "connected" 
      ? (conversation.isSpeaking ? "speaking" : "listening") 
      : (isConnecting ? "connecting" : "idle"),
    isConnected: conversation.status === "connected",
    isSpeaking: conversation.isSpeaking,
    connect: startConversation,
    disconnect: stopConversation,
  };
}