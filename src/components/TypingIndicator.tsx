import { Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn(
      "flex gap-3 p-4 rounded-2xl bg-muted max-w-[85%] animate-in fade-in slide-in-from-bottom-2 message-glow",
      className
    )}>
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center relative animate-glow-ring">
        <Bot className="w-4 h-4 text-primary" />
        <Sparkles className="w-3 h-3 text-primary absolute -top-1 -right-1 animate-pulse" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium font-display mb-2">OmniAI réfléchit...</p>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-1.5 h-4 rounded-full bg-primary animate-wave"
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
          <div className="h-1 flex-1 bg-muted-foreground/20 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary/50 via-primary to-primary/50 animate-[shimmer_2s_infinite] w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}
