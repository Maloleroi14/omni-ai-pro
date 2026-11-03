import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Eye, Image, Globe, Download, ExternalLink, Code, Play, ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PresentationSlide {
  title: string;
  content: string;
  bulletPoints?: string[];
  imageUrl?: string;
}

export interface PreviewItem {
  id: string;
  type: "image" | "website" | "search" | "code" | "video" | "presentation";
  title: string;
  content: string;
  url?: string;
  imageUrl?: string;
  videoId?: string;
  videoThumbnail?: string;
  videoUrl?: string;
  slides?: PresentationSlide[];
  timestamp: Date;
}

interface PreviewPanelProps {
  items: PreviewItem[];
  onClear: () => void;
}

function FullscreenPresentation({ 
  slides, 
  title, 
  onClose 
}: { 
  slides: PresentationSlide[]; 
  title: string; 
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(0);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      setCurrent(prev => Math.min(slides.length - 1, prev + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setCurrent(prev => Math.max(0, prev - 1));
    } else if (e.key === "Escape") {
      onClose();
    }
  }, [slides.length, onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const slide = slides[current];

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Close button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white/60 hover:text-white transition-colors p-2"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Slide */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Background image (blurred) */}
        {slide?.imageUrl && (
          <img 
            src={slide.imageUrl} 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover opacity-20 blur-2xl scale-110"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}

        <div className="relative w-full max-w-5xl mx-auto px-8 py-12 flex gap-8 items-center">
          {/* Image */}
          {slide?.imageUrl && (
            <div className="hidden md:block w-2/5 flex-shrink-0">
              <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
                <img 
                  src={slide.imageUrl} 
                  alt={slide.title}
                  className="w-full aspect-[4/3] object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className={cn("flex-1 text-white", !slide?.imageUrl && "text-center max-w-3xl mx-auto")}>
            <p className="text-sm font-medium text-white/40 mb-3 uppercase tracking-widest">
              {title}
            </p>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              {slide?.title}
            </h2>
            <p className="text-lg md:text-xl text-white/70 mb-6 leading-relaxed">
              {slide?.content}
            </p>
            {slide?.bulletPoints && slide.bulletPoints.length > 0 && (
              <ul className="space-y-3">
                {slide.bulletPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-white/80 text-base md:text-lg">
                    <span className="w-2 h-2 rounded-full bg-primary mt-2.5 flex-shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Mobile image below content */}
            {slide?.imageUrl && (
              <div className="md:hidden mt-6 rounded-xl overflow-hidden border border-white/10">
                <img 
                  src={slide.imageUrl} 
                  alt={slide.title}
                  className="w-full aspect-video object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between px-8 py-4 bg-black/80 border-t border-white/10">
        <Button
          size="sm"
          variant="ghost"
          className="text-white/60 hover:text-white hover:bg-white/10"
          disabled={current === 0}
          onClick={() => setCurrent(prev => Math.max(0, prev - 1))}
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Précédent
        </Button>

        {/* Slide indicators */}
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all",
                i === current ? "bg-primary scale-125" : "bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
          <span className="text-white/40 text-sm ml-3">
            {current + 1}/{slides.length}
          </span>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="text-white/60 hover:text-white hover:bg-white/10"
          disabled={current === slides.length - 1}
          onClick={() => setCurrent(prev => Math.min(slides.length - 1, prev + 1))}
        >
          Suivant
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

export function PreviewPanel({ items, onClear }: PreviewPanelProps) {
  const [selectedItem, setSelectedItem] = useState<PreviewItem | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [fullscreenPresentation, setFullscreenPresentation] = useState<PreviewItem | null>(null);

  if (items.length === 0 && !fullscreenPresentation) return null;

  const getIcon = (type: PreviewItem["type"]) => {
    switch (type) {
      case "image":
        return <Image className="w-4 h-4" />;
      case "code":
        return <Code className="w-4 h-4" />;
      case "video":
        return <Play className="w-4 h-4" />;
      case "presentation":
        return <Eye className="w-4 h-4" />;
      case "website":
      case "search":
        return <Globe className="w-4 h-4" />;
    }
  };

  const downloadImage = (imageUrl: string, title: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `${title.replace(/\s+/g, "_")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Fullscreen presentation overlay */}
      {fullscreenPresentation && fullscreenPresentation.slides && (
        <FullscreenPresentation
          slides={fullscreenPresentation.slides}
          title={fullscreenPresentation.title}
          onClose={() => setFullscreenPresentation(null)}
        />
      )}

      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 animate-in slide-in-from-top-2 duration-300 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Preview</span>
            <span className="w-5 h-5 rounded-full bg-primary-foreground/20 text-xs flex items-center justify-center">
              {items.length}
            </span>
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader className="flex flex-row items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Contenus générés
            </SheetTitle>
            {items.length > 0 && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                Tout effacer
              </Button>
            )}
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50",
                    selectedItem?.id === item.id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.timestamp.toLocaleTimeString("fr-FR", { 
                          hour: "2-digit", 
                          minute: "2-digit" 
                        })}
                      </p>
                    </div>
                  </div>

                  {selectedItem?.id === item.id && (
                    <div className="mt-3 space-y-3 animate-in fade-in duration-200">
                      {item.type === "image" && item.imageUrl && (
                        <div className="space-y-2">
                          <img 
                            src={item.imageUrl} 
                            alt={item.title}
                            className="w-full rounded-lg border"
                          />
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="flex-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadImage(item.imageUrl!, item.title);
                              }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Télécharger
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(item.imageUrl, "_blank");
                              }}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {item.type === "video" && item.videoId && (
                        <div className="space-y-2">
                          <AspectRatio ratio={16 / 9}>
                            <iframe
                              src={`https://www.youtube.com/embed/${item.videoId}?autoplay=0`}
                              title={item.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="w-full h-full rounded-lg border"
                            />
                          </AspectRatio>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`https://www.youtube.com/watch?v=${item.videoId}`, "_blank");
                            }}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Ouvrir sur YouTube
                          </Button>
                        </div>
                      )}

                      {item.type === "presentation" && item.slides && item.slides.length > 0 && (
                        <div className="space-y-3">
                          {/* Slide viewer */}
                          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg overflow-hidden">
                            {item.slides[currentSlide]?.imageUrl && (
                              <div className="w-full h-36 overflow-hidden">
                                <img 
                                  src={item.slides[currentSlide].imageUrl} 
                                  alt={item.slides[currentSlide].title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              </div>
                            )}
                            <div className="p-4">
                              <h3 className="text-lg font-bold mb-2 text-primary">
                                {item.slides[currentSlide]?.title}
                              </h3>
                              <p className="text-sm mb-3">{item.slides[currentSlide]?.content}</p>
                              {item.slides[currentSlide]?.bulletPoints && (
                                <ul className="space-y-1">
                                  {item.slides[currentSlide].bulletPoints!.map((point, idx) => (
                                    <li key={idx} className="text-sm flex items-start gap-2">
                                      <span className="text-primary mt-1">•</span>
                                      <span>{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                          
                          {/* Navigation + Fullscreen */}
                          <div className="flex items-center justify-between">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={currentSlide === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentSlide(prev => Math.max(0, prev - 1));
                              }}
                            >
                              <ChevronLeft className="w-4 h-4 mr-1" />
                              Préc.
                            </Button>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {currentSlide + 1} / {item.slides.length}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFullscreenPresentation(item);
                                }}
                                title="Plein écran"
                              >
                                <Maximize2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={currentSlide === item.slides.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentSlide(prev => Math.min(item.slides!.length - 1, prev + 1));
                              }}
                            >
                              Suiv.
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {(item.type === "website" || item.type === "search" || item.type === "code") && (
                        <div className="space-y-2">
                          <div className="p-3 bg-muted rounded-lg text-sm max-h-48 overflow-y-auto font-mono whitespace-pre-wrap">
                            {item.content.slice(0, 500)}
                            {item.content.length > 500 && "..."}
                          </div>
                          {item.url && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(item.url, "_blank");
                              }}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ouvrir le site
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
