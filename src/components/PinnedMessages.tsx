import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pin, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface PinnedMessage {
  id: string;
  content: string;
  createdAt?: string;
}

interface PinnedMessagesProps {
  messages: PinnedMessage[];
  onUnpin: (messageId: string) => void;
}

export function PinnedMessages({ messages, onUnpin }: PinnedMessagesProps) {
  if (messages.length === 0) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 animate-in slide-in-from-top-2 duration-300"
        >
          <Pin className="w-3.5 h-3.5 fill-current text-primary" />
          <span className="hidden sm:inline">Épinglés</span>
          <span className="w-5 h-5 rounded-full bg-primary/20 text-xs flex items-center justify-center text-primary font-medium">
            {messages.length}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Pin className="w-5 h-5 fill-current text-primary" />
            Messages épinglés ({messages.length})
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="p-3 rounded-lg border bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 text-sm prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>
                      {msg.content.length > 300 ? msg.content.slice(0, 300) + "..." : msg.content}
                    </ReactMarkdown>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 shrink-0"
                    onClick={() => onUnpin(msg.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                {msg.createdAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(msg.createdAt).toLocaleString("fr-FR")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
