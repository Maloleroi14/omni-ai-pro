import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VoiceRecordButtonProps {
  onTranscription: (text: string) => void;
  onAudioRecorded?: (base64: string) => void;
  disabled?: boolean;
}

export function VoiceRecordButton({ 
  onTranscription, 
  onAudioRecorded,
  disabled 
}: VoiceRecordButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType 
        });

        if (audioBlob.size < 1000) {
          toast.error("Enregistrement trop court");
          setIsRecording(false);
          setRecordingTime(0);
          return;
        }

        setIsProcessing(true);

        try {
          // Convert to base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64Data = result.split(",")[1];
              resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
          });

          if (onAudioRecorded) {
            onAudioRecorded(base64);
          }

          // Send to transcription API
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ 
                audio: base64,
                mimeType: mediaRecorder.mimeType,
              }),
            }
          );

          if (!response.ok) {
            throw new Error("Transcription failed");
          }

          const result = await response.json();
          
          if (result.text && result.text.trim()) {
            onTranscription(result.text.trim());
            toast.success("Message vocal transcrit !");
          } else {
            toast.error("Aucun texte détecté dans l'enregistrement");
          }
        } catch (error) {
          console.error("Transcription error:", error);
          toast.error("Erreur lors de la transcription");
        } finally {
          setIsProcessing(false);
          setRecordingTime(0);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success("Enregistrement démarré");
    } catch (error) {
      console.error("Error starting recording:", error);
      if ((error as Error).name === "NotAllowedError") {
        toast.error("Permission microphone refusée");
      } else {
        toast.error("Erreur lors du démarrage de l'enregistrement");
      }
    }
  }, [onTranscription, onAudioRecorded]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isProcessing) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0"
        disabled
      >
        <Loader2 className="w-5 h-5 animate-spin" />
      </Button>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-500 font-mono animate-pulse">
          ● {formatTime(recordingTime)}
        </span>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={stopRecording}
        >
          <Square className="w-4 h-4" fill="currentColor" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-10 w-10 shrink-0 transition-colors",
        "hover:bg-primary/10 hover:text-primary"
      )}
      onClick={startRecording}
      disabled={disabled}
      title="Envoyer un message vocal"
    >
      <Mic className="w-5 h-5" />
    </Button>
  );
}
