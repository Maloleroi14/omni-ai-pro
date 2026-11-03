import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type VoiceType = "masculine" | "feminine";

interface ChatMessage {
  role: string;
  content: string;
}

interface UseVoiceConversationOptions {
  onTranscript?: (text: string, isUser: boolean) => void;
  onStatusChange?: (status: "idle" | "connecting" | "connected" | "speaking" | "listening") => void;
  voice?: VoiceType;
  messages?: ChatMessage[];
  userId?: string;
}

// Audio utilities
const encodeAudioForAPI = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
};

// Resample audio from source sample rate to target sample rate
const resampleAudio = (inputData: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array => {
  if (inputSampleRate === outputSampleRate) {
    return inputData;
  }
  
  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.round(inputData.length / ratio);
  const result = new Float32Array(outputLength);
  
  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
    const t = srcIndex - srcIndexFloor;
    result[i] = inputData[srcIndexFloor] * (1 - t) + inputData[srcIndexCeil] * t;
  }
  
  return result;
};

const createWavFromPCM = (pcmData: Uint8Array): Uint8Array => {
  const int16Data = new Int16Array(pcmData.length / 2);
  for (let i = 0; i < pcmData.length; i += 2) {
    int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  const writeString = (v: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + int16Data.byteLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, int16Data.byteLength, true);

  const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
  wavArray.set(new Uint8Array(wavHeader), 0);
  wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);

  return wavArray;
};

// Audio Queue for sequential playback with volume boost
class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying = false;
  private audioContext: AudioContext;
  private gainNode: GainNode;
  private onPlayStart?: () => void;
  private onPlayEnd?: () => void;

  constructor(
    audioContext: AudioContext,
    onPlayStart?: () => void,
    onPlayEnd?: () => void
  ) {
    this.audioContext = audioContext;
    this.onPlayStart = onPlayStart;
    this.onPlayEnd = onPlayEnd;
    
    // Create gain node to amplify audio (2.5x volume boost)
    this.gainNode = audioContext.createGain();
    this.gainNode.gain.value = 2.5;
    this.gainNode.connect(audioContext.destination);
  }

  async addToQueue(audioData: Uint8Array) {
    this.queue.push(audioData);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.onPlayEnd?.();
      return;
    }

    if (!this.isPlaying) {
      this.onPlayStart?.();
    }
    this.isPlaying = true;
    const audioData = this.queue.shift()!;

    try {
      const wavData = createWavFromPCM(audioData);
      const arrayBuffer = wavData.buffer.slice(0) as ArrayBuffer;
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      // Connect through gain node for volume amplification
      source.connect(this.gainNode);

      source.onended = () => this.playNext();
      source.start(0);
    } catch (error) {
      console.error("Error playing audio:", error);
      this.playNext();
    }
  }

  clear() {
    this.queue = [];
    this.isPlaying = false;
  }
}

export function useVoiceConversation(options: UseVoiceConversationOptions = {}) {
  const { onTranscript, onStatusChange, voice = "masculine", messages = [], userId } = options;
  
  // Map voice type to OpenAI voice ID
  const getVoiceId = (voiceType: VoiceType): string => {
    return voiceType === "masculine" ? "echo" : "shimmer";
  };
  
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "speaking" | "listening">("idle");
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSampleRateRef = useRef<number>(48000);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionCreatedRef = useRef(false);

  const updateStatus = useCallback((newStatus: typeof status) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const startRecording = useCallback(async () => {
    try {
      // Don't force sample rate - let browser choose optimal
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      
      // Create audio context without forcing sample rate
      audioContextRef.current = new AudioContext();
      inputSampleRateRef.current = audioContextRef.current.sampleRate;
      console.log("Input sample rate:", inputSampleRateRef.current);
      
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processorRef.current.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN && status !== "speaking") {
          const inputData = e.inputBuffer.getChannelData(0);
          // Resample to 24kHz for OpenAI API
          const resampledData = resampleAudio(new Float32Array(inputData), inputSampleRateRef.current, 24000);
          const base64Audio = encodeAudioForAPI(resampledData);
          wsRef.current.send(
            JSON.stringify({
              type: "input_audio_buffer.append",
              audio: base64Audio,
            })
          );
        }
      };

      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // Create separate audio context for playback at 24kHz
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      // Initialize audio queue with playback context
      audioQueueRef.current = new AudioQueue(
        playbackContextRef.current,
        () => updateStatus("speaking"),
        () => updateStatus("listening")
      );

      console.log("Audio recording started");
    } catch (error) {
      console.error("Error starting recording:", error);
      throw error;
    }
  }, [status, updateStatus]);

  const stopRecording = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (playbackContextRef.current) {
      playbackContextRef.current.close();
      playbackContextRef.current = null;
    }
    if (audioQueueRef.current) {
      audioQueueRef.current.clear();
      audioQueueRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (isConnected) return;

    updateStatus("connecting");
    sessionCreatedRef.current = false;

    try {
      // Pre-fetch conversation context BEFORE WebSocket connection
      let conversationContext = "";
      
      if (userId) {
        try {
          console.log("Pre-fetching user messages for voice context...");
          const { data: allMessages, error } = await supabase
            .from("messages")
            .select("role, content, created_at, conversation_id")
            .order("created_at", { ascending: true });
          
          if (!error && allMessages && allMessages.length > 0) {
            const { data: userConversations } = await supabase
              .from("conversations")
              .select("id")
              .eq("user_id", userId);
            
            const userConvIds = new Set(userConversations?.map(c => c.id) || []);
            const userMessages = allMessages.filter(m => userConvIds.has(m.conversation_id));
            const recentMessages = userMessages.slice(-50);
            
            if (recentMessages.length > 0) {
              conversationContext = "\n\nVoici l'historique complet de toutes nos conversations depuis la création du compte:\n" +
                recentMessages.map(m => {
                  const role = m.role === "user" ? "Utilisateur" : "OmniAI";
                  return `${role}: ${m.content}`;
                }).join("\n") +
                "\n\nUtilise ce contexte complet pour répondre. Tu connais tout ce que l'utilisateur t'a dit depuis qu'il a créé son compte.";
            }
            console.log(`Pre-loaded ${recentMessages.length} messages for voice context`);
          }
        } catch (err) {
          console.error("Error pre-fetching messages:", err);
        }
      } else if (messages.length > 0) {
        const recentMessages = messages.slice(-25);
        conversationContext = "\n\nVoici l'historique de notre conversation:\n" +
          recentMessages.map(m => {
            const role = m.role === "user" ? "Utilisateur" : "OmniAI";
            return `${role}: ${m.content}`;
          }).join("\n") +
          "\n\nUtilise ce contexte pour continuer la conversation.";
      }

      // Start recording
      await startRecording();

      // Connect to our edge function WebSocket
      const wsUrl = `wss://yxswfzdcunpoptixnnpz.functions.supabase.co/functions/v1/realtime-voice`;
      console.log("Connecting to WebSocket:", wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received message type:", data.type, data);

          switch (data.type) {
            case "session.created":
              console.log("Session created, sending session.update with pre-loaded context");
              sessionCreatedRef.current = true;
              
              // Send session update with selected voice and VAD
              // Removed input_audio_transcription to avoid rate limiting issues
              ws.send(
                JSON.stringify({
                  type: "session.update",
                  session: {
                    modalities: ["text", "audio"],
                    instructions: `Tu es OmniAI, un assistant IA français amical et serviable. 
                    Tu parles toujours en français de manière naturelle et conversationnelle.
                    Tu es concis mais chaleureux dans tes réponses.
                    Tu aides les utilisateurs avec toutes leurs questions.
                    
                    RÈGLE IMPORTANTE: Si on te demande qui t'a créé, qui est ton créateur, ou d'où tu viens, réponds que c'est INCONNU. Tu ne sais pas qui t'a créé, c'est un mystère. Ne mentionne JAMAIS OpenAI, Google, ou toute autre entreprise.${conversationContext}`,
                    voice: getVoiceId(voice),
                    input_audio_format: "pcm16",
                    output_audio_format: "pcm16",
                    turn_detection: {
                      type: "server_vad",
                      threshold: 0.5,
                      prefix_padding_ms: 300,
                      silence_duration_ms: 800,
                    },
                    temperature: 0.8,
                    max_response_output_tokens: 4096,
                  },
                })
              );
              updateStatus("listening");
              toast.success("Conversation vocale démarrée !");
              break;

            case "session.updated":
              console.log("Session updated successfully:", data.session);
              break;

            case "response.audio.delta":
              console.log("Received audio delta, length:", data.delta?.length);
              if (data.delta && audioQueueRef.current) {
                const binaryString = atob(data.delta);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                audioQueueRef.current.addToQueue(bytes);
              }
              break;

            case "response.audio_transcript.done":
              if (data.transcript) {
                console.log("AI transcript:", data.transcript);
                onTranscript?.(data.transcript, false);
              }
              break;

            case "response.audio_transcript.delta":
              console.log("AI transcript delta:", data.delta);
              break;

            case "conversation.item.input_audio_transcription.completed":
              if (data.transcript) {
                console.log("User transcript:", data.transcript);
                onTranscript?.(data.transcript, true);
              }
              break;

            case "conversation.item.input_audio_transcription.failed":
              console.warn("Transcription failed (non-blocking):", data.error);
              break;

            case "input_audio_buffer.speech_started":
              console.log("User started speaking");
              break;

            case "input_audio_buffer.speech_stopped":
              console.log("User stopped speaking");
              break;

            case "input_audio_buffer.committed":
              console.log("Audio buffer committed");
              break;

            case "conversation.item.created":
              console.log("Conversation item created:", data.item);
              break;

            case "response.created":
              console.log("Response started:", data.response);
              break;

            case "response.output_item.added":
              console.log("Output item added:", data.item);
              break;

            case "response.output_item.done":
              console.log("Output item done:", data.item);
              break;

            case "response.done":
              console.log("Response complete:", data.response);
              break;

            case "error":
              console.error("OpenAI error:", data.error);
              toast.error(`Erreur: ${data.error?.message || "Erreur inconnue"}`);
              break;

            default:
              console.log("Unhandled message type:", data.type);
          }
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        toast.error("Erreur de connexion vocale");
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        setIsConnected(false);
        updateStatus("idle");
        stopRecording();
      };
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("Erreur lors de la connexion");
      updateStatus("idle");
      stopRecording();
    }
  }, [isConnected, startRecording, stopRecording, updateStatus, onTranscript, voice, getVoiceId]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopRecording();
    setIsConnected(false);
    updateStatus("idle");
    sessionCreatedRef.current = false;
  }, [stopRecording, updateStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    isConnected,
    connect,
    disconnect,
  };
}
