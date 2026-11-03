
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Zap } from "lucide-react";

const TEMPLATES = [
  { label: "📝 Résumer", text: "Résume ce contenu de manière concise" },
  { label: "🌍 Traduire EN", text: "Traduis en anglais :" },
  { label: "🌍 Traduire FR", text: "Traduis en français :" },
  { label: "📊 Analyser", text: "Analyse les points clés de ce texte :" },
  { label: "✍️ Réécrire", text: "Réécris ce texte de manière plus professionnelle :" },
  { label: "💡 Idées", text: "Donne-moi 5 idées créatives pour :" },
  { label: "🐛 Debug", text: "Trouve et corrige les bugs dans ce code :" },
  { label: "📧 Email", text: "Rédige un email professionnel pour :" },
];

interface MessageTemplatesProps {
  onSelect: (text: string) => void;
}

export function MessageTemplates({ onSelect }: MessageTemplatesProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Templates rapides">
          <Zap className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="end">
        <div className="space-y-0.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
              onClick={() => { onSelect(t.text); setOpen(false); }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
