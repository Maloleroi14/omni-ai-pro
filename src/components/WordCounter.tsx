
import { Badge } from "@/components/ui/badge";
import { Hash } from "lucide-react";

interface WordCounterProps {
  messages: { role: string; content: string }[];
}

export function WordCounter({ messages }: WordCounterProps) {
  if (messages.length === 0) return null;

  const totalWords = messages.reduce((sum, m) => sum + m.content.split(/\s+/).filter(Boolean).length, 0);
  const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
  const userMsgs = messages.filter(m => m.role === "user").length;
  const aiMsgs = messages.filter(m => m.role === "assistant").length;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Hash className="w-3 h-3" />
      <span>{totalWords} mots</span>
      <span>·</span>
      <span>{userMsgs}↑ {aiMsgs}↓</span>
    </div>
  );
}
