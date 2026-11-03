import { useState, useEffect } from "react";
import { X, Maximize2, Minimize2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  videoId: string;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function VideoPlayer({ videoId, title, isOpen, onClose }: VideoPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(true);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 animate-in fade-in duration-300">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-semibold truncate max-w-md">
            {title || "Vidéo"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank")}
          >
            <ExternalLink className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Video Container */}
      <div 
        className={cn(
          "absolute flex items-center justify-center transition-all duration-300",
          isFullscreen 
            ? "inset-0 p-0" 
            : "inset-8 md:inset-16 lg:inset-24"
        )}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className={cn(
          "relative w-full bg-black rounded-lg overflow-hidden shadow-2xl",
          isFullscreen ? "h-full" : "max-w-5xl aspect-video"
        )}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={title || "Vidéo YouTube"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-white/50 text-sm">
          Appuyez sur <kbd className="px-2 py-1 bg-white/10 rounded text-white/70">Échap</kbd> pour fermer
        </p>
      </div>
    </div>
  );
}
