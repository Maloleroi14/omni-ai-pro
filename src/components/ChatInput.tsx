import { useState, KeyboardEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { FileUploadButton, UploadedFile } from "./FileUploadButton";
import { VoiceConversationButton } from "./VoiceConversationButton";
import type { VoiceLanguage } from "@/hooks/useCustomization";
import { useWordProtection } from "@/App";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const CREATOR_EMAIL = "omniaiproultime@gmail.com";

interface Message {
  role: string;
  content: string;
}

interface ChatInputProps {
  onSend: (message: string, file?: UploadedFile) => void;
  isLoading: boolean;
  messages?: Message[];
  userId?: string;
  voiceLanguage?: VoiceLanguage;
}

export function ChatInput({ onSend, isLoading, messages = [], userId, voiceLanguage = "auto" }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const { checkMessage, recordMessage } = useWordProtection();
  const { isAdmin, user } = useAuthContext();
  const { t } = useLanguage();
  const isCreator = user?.email === CREATOR_EMAIL;

  const handleSend = async () => {
    if ((input.trim() || uploadedFile) && !isLoading) {
      // Check for blocked words before sending
      if (input.trim() && !isCreator) {
        const result = await checkMessage(input, userId);
        if (result === "block") return;
        if (result === "warn") {
          const warnCount = parseInt(localStorage.getItem("device_warn_count") || "0", 10);
          const remaining = 3 - warnCount;
          toast.warning(`⚠️ Attention : votre message contient un terme inapproprié. Veuillez reformuler. (${remaining} avertissement${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""})`, { duration: 5000 });
          return;
        }
      }
      recordMessage();
      onSend(input, uploadedFile || undefined);
      setInput("");
      setUploadedFile(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceTranscript = (_text: string, _isUser: boolean) => {
    // Voice conversation is handled entirely by ElevenLabs in real-time
    // Don't write transcripts to the text input
  };

  return (
    <div className="flex flex-col gap-2 p-4 border-t bg-background/80 backdrop-blur-sm">
      {/* File preview */}
      {uploadedFile && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
          {uploadedFile.type === "image" ? (
            <img 
              src={`data:${uploadedFile.mimeType};base64,${uploadedFile.base64}`}
              alt={uploadedFile.name}
              className="h-16 w-16 object-cover rounded"
            />
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">{uploadedFile.name}</span>
            </div>
          )}
        </div>
      )}
      
      <div className="flex gap-2 items-end">
        <FileUploadButton
          onFileSelect={setUploadedFile}
          disabled={isLoading}
          currentFile={uploadedFile}
          onClearFile={() => setUploadedFile(null)}
        />
        
        <VoiceConversationButton
          onTranscript={handleVoiceTranscript}
          disabled={isLoading}
          messages={messages}
          userId={userId}
          voiceLanguage={voiceLanguage}
        />
        
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("chat.placeholder")}
          className="min-h-[56px] max-h-32 resize-none rounded-xl border-2 focus:border-primary transition-colors flex-1"
          disabled={isLoading}
        />
        
        <Button
          onClick={handleSend}
          disabled={(!input.trim() && !uploadedFile) || isLoading}
          size="icon"
          className="h-14 w-14 rounded-xl shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
