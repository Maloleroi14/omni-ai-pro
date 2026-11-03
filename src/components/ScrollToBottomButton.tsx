import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScrollToBottomButtonProps {
  visible: boolean;
  onClick: () => void;
}

export function ScrollToBottomButton({ visible, onClick }: ScrollToBottomButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      variant="secondary"
      className={cn(
        "fixed bottom-24 right-6 z-40 rounded-full shadow-lg transition-all duration-300",
        "hover:scale-110 hover:shadow-xl",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        visible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <ChevronDown className="w-5 h-5" />
    </Button>
  );
}
