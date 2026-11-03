
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Message {
  role: string;
  content: string;
  createdAt?: string;
}

interface ConversationExportProps {
  messages: Message[];
  title?: string;
}

export function ConversationExport({ messages, title }: ConversationExportProps) {
  const exportAsText = () => {
    if (messages.length === 0) return;
    
    const header = `=== ${title || "Conversation"} ===\nExporté le ${new Date().toLocaleString("fr-FR")}\n${"=".repeat(40)}\n\n`;
    const body = messages.map((m) => {
      const role = m.role === "user" ? "👤 Vous" : "🤖 IA";
      const time = m.createdAt ? ` (${new Date(m.createdAt).toLocaleString("fr-FR")})` : "";
      return `${role}${time}\n${m.content}\n`;
    }).join("\n---\n\n");

    const blob = new Blob([header + body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Conversation exportée !" });
  };

  if (messages.length === 0) return null;

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exportAsText} title="Exporter la conversation">
      <Download className="w-4 h-4" />
    </Button>
  );
}
