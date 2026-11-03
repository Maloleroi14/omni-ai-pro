import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileDown, Loader2, Sparkles, ChevronLeft, ChevronRight, Search, Palette, Send, Check, Image, Pencil, X, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlidePreview {
  title: string;
  bullets?: string[];
  subtitle?: string;
  layout?: string;
  imageUrl?: string | null;
  imageQuery?: string;
}

interface PptxEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: string;
}

type Step = "idle" | "generating" | "searching-images" | "preview" | "sending" | "done";

const PPTX_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pptx`;

export function PptxEmailDialog({ open, onOpenChange, topic }: PptxEmailDialogProps) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [slides, setSlides] = useState<SlidePreview[]>([]);
  const [title, setTitle] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [error, setError] = useState("");
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBullets, setEditBullets] = useState<string[]>([]);
  const [editSubtitle, setEditSubtitle] = useState("");

  const reset = () => {
    setStep("idle");
    setSlides([]);
    setTitle("");
    setCurrentSlide(0);
    setError("");
    setEmail("");
    setEditingSlide(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const startEditing = (index: number) => {
    const slide = slides[index];
    setEditTitle(slide.title);
    setEditBullets([...(slide.bullets || [])]);
    setEditSubtitle(slide.subtitle || "");
    setEditingSlide(index);
  };

  const saveEditing = () => {
    if (editingSlide === null) return;
    setSlides(prev => prev.map((s, i) =>
      i === editingSlide
        ? { ...s, title: editTitle, bullets: editBullets.filter(b => b.trim()), subtitle: editSubtitle }
        : s
    ));
    setEditingSlide(null);
  };

  const cancelEditing = () => setEditingSlide(null);

  const addBullet = () => setEditBullets(prev => [...prev, ""]);
  const removeBullet = (idx: number) => setEditBullets(prev => prev.filter((_, i) => i !== idx));
  const updateBullet = (idx: number, val: string) => setEditBullets(prev => prev.map((b, i) => i === idx ? val : b));

  const generatePreview = async () => {
    setStep("generating");
    setError("");
    setTimeout(() => setStep("searching-images"), 2500);

    try {
      const resp = await fetch(PPTX_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ topic, mode: "preview" }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erreur");

      setTitle(data.title);
      setSlides(data.slides);
      setCurrentSlide(0);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setStep("idle");
      toast.error("Erreur lors de la génération");
    }
  };

  const sendEmail_ = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error("Adresse email invalide");
      return;
    }
    setStep("sending");

    try {
      const resp = await fetch(PPTX_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ topic, email: email.trim(), mode: "send", title, slides }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erreur");

      setStep("done");
      toast.success(`Présentation envoyée à ${email} !`);
      setTimeout(() => handleClose(false), 2500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur d'envoi");
      setStep("preview");
    }
  };

  const isGenerating = step === "generating" || step === "searching-images";
  const isEditing = editingSlide !== null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <FileDown className="w-4 h-4 text-primary" />
              </div>
              {step === "preview" || step === "sending" || step === "done" ? title : "Créer un PowerPoint"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {step === "idle" && "Générez une présentation professionnelle avec photos"}
              {step === "preview" && !isEditing && `${slides.length} slides • Cliquez sur ✏️ pour modifier`}
              {step === "preview" && isEditing && "Modifiez le contenu de cette slide"}
              {step === "sending" && "Envoi en cours..."}
              {step === "done" && `Envoyé à ${email}`}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Progress */}
        {isGenerating && (
          <div className="px-5 pb-4">
            <div className="space-y-3">
              <ProgressStep icon={<Sparkles className="w-3.5 h-3.5" />} label="Génération du contenu" active={step === "generating"} done={step === "searching-images"} />
              <ProgressStep icon={<Search className="w-3.5 h-3.5" />} label="Recherche d'images" active={step === "searching-images"} done={false} />
              <ProgressStep icon={<Palette className="w-3.5 h-3.5" />} label="Mise en page" active={false} done={false} />
            </div>
            <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-1000 ease-out" style={{ width: step === "generating" ? "35%" : "70%" }} />
            </div>
          </div>
        )}

        {/* Idle */}
        {step === "idle" && (
          <div className="px-5 pb-5 space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-[11px] text-muted-foreground mb-0.5">Sujet</p>
              <p className="text-sm font-medium leading-snug">{topic}</p>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button onClick={generatePreview} className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Générer la présentation
            </Button>
          </div>
        )}

        {/* Preview with editing */}
        {step === "preview" && slides.length > 0 && (
          <div className="flex flex-col">
            {isEditing ? (
              /* Edit mode */
              <ScrollArea className="px-5 max-h-[45vh]">
                <div className="space-y-3 py-1">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Titre de la slide</label>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-sm" />
                  </div>
                  {editSubtitle !== undefined && (
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Sous-titre</label>
                      <Input value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)} className="text-sm" placeholder="Optionnel" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-muted-foreground">Points clés</label>
                      <button onClick={addBullet} className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-0.5">
                        <Plus className="w-3 h-3" /> Ajouter
                      </button>
                    </div>
                    <div className="space-y-2">
                      {editBullets.map((b, bi) => (
                        <div key={bi} className="flex gap-1.5">
                          <Textarea
                            value={b}
                            onChange={(e) => updateBullet(bi, e.target.value)}
                            className="text-xs min-h-[36px] py-2 resize-none flex-1"
                            rows={1}
                          />
                          <button onClick={() => removeBullet(bi)} className="text-muted-foreground hover:text-destructive shrink-0 mt-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={saveEditing} className="flex-1 text-xs h-8">
                      <Check className="w-3.5 h-3.5 mr-1" /> Sauvegarder
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEditing} className="text-xs h-8">
                      <X className="w-3.5 h-3.5 mr-1" /> Annuler
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              /* View mode */
              <>
                <div className="px-5">
                  <div className="relative aspect-[16/9] rounded-lg overflow-hidden border bg-background shadow-sm group">
                    <SlideCard slide={slides[currentSlide]} index={currentSlide} />

                    {/* Edit button */}
                    <button
                      onClick={() => startEditing(currentSlide)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/90 backdrop-blur-sm border shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-primary-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {slides.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                          disabled={currentSlide === 0}
                          className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm border shadow flex items-center justify-center disabled:opacity-30 hover:bg-background transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                          disabled={currentSlide === slides.length - 1}
                          className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm border shadow flex items-center justify-center disabled:opacity-30 hover:bg-background transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    <div className="absolute bottom-1.5 right-2 text-[10px] font-medium bg-background/70 backdrop-blur-sm px-2 py-0.5 rounded-full border">
                      {currentSlide + 1} / {slides.length}
                    </div>
                  </div>
                </div>

                <ScrollArea className="px-5 py-3">
                  <div className="flex gap-2">
                    {slides.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={cn(
                          "flex-shrink-0 w-16 h-10 rounded border text-[6px] p-1 text-left leading-tight truncate transition-all",
                          i === currentSlide
                            ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                            : "border-border hover:border-primary/50 bg-muted/30"
                        )}
                      >
                        <span className="font-bold block truncate">{s.title}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            {/* Email + send (only in view mode) */}
            {!isEditing && (
              <div className="px-5 pb-5 space-y-3 border-t pt-3">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="text-sm"
                    onKeyDown={(e) => e.key === "Enter" && sendEmail_()}
                  />
                  <Button onClick={sendEmail_} disabled={!email.trim()} className="shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  Compatible PowerPoint, Google Slides & Canva
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sending */}
        {step === "sending" && (
          <div className="px-5 pb-5 flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">Création et envoi en cours...</p>
              <p className="text-xs text-muted-foreground mt-1">Téléchargement des images et mise en page</p>
            </div>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="px-5 pb-5 flex flex-col items-center gap-3 py-8">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Présentation envoyée !</p>
              <p className="text-xs text-muted-foreground mt-1">Vérifiez votre boîte mail ({email})</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProgressStep({ icon, label, active, done }: { icon: React.ReactNode; label: string; active: boolean; done: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5 text-sm transition-all duration-300", done ? "text-primary" : active ? "text-foreground" : "text-muted-foreground/50")}>
      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300", done ? "bg-primary/15" : active ? "bg-primary/10 animate-pulse" : "bg-muted")}>
        {done ? <Check className="w-3.5 h-3.5" /> : icon}
      </div>
      <span className={cn("text-xs", (active || done) && "font-medium")}>
        {label}
        {active && <Loader2 className="w-3 h-3 ml-1.5 inline animate-spin" />}
      </span>
    </div>
  );
}

function SlideCard({ slide, index }: { slide: SlidePreview; index: number }) {
  const isTitle = slide.layout === "title" || index === 0;

  if (isTitle) {
    return (
      <div className="w-full h-full relative">
        {slide.imageUrl ? (
          <>
            <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.7)]" />
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-bold text-sm leading-tight drop-shadow-lg">{slide.title}</h3>
          {slide.subtitle && <p className="text-white/70 text-[9px] mt-1 italic">{slide.subtitle}</p>}
        </div>
      </div>
    );
  }

  const hasImage = slide.layout === "image-right" || slide.layout === "image-left" || !!slide.imageUrl;

  return (
    <div className="w-full h-full flex flex-col p-3">
      <div className="w-full h-0.5 bg-primary/40 rounded-full mb-2" />
      <h3 className="font-bold text-[10px] text-foreground leading-tight mb-1.5">{slide.title}</h3>
      <div className={cn("flex-1 flex gap-2 min-h-0")}>
        <div className={cn("flex-1 min-w-0", hasImage && "flex-[1.2]")}>
          {slide.bullets && slide.bullets.length > 0 && (
            <ul className="space-y-0.5">
              {slide.bullets.map((b, bi) => (
                <li key={bi} className="text-[7px] text-muted-foreground leading-tight flex gap-1">
                  <span className="text-primary/70 mt-px">•</span>
                  <span className="line-clamp-2">{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {hasImage && slide.imageUrl && (
          <div className="flex-1 rounded overflow-hidden bg-muted">
            <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
        )}
        {hasImage && !slide.imageUrl && (
          <div className="flex-1 rounded bg-muted/50 flex items-center justify-center">
            <Image className="w-4 h-4 text-muted-foreground/30" />
          </div>
        )}
      </div>
      {slide.subtitle && <p className="text-[6px] text-muted-foreground italic mt-1 truncate">{slide.subtitle}</p>}
    </div>
  );
}
