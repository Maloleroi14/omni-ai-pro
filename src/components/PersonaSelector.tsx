import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type Persona = "default" | "professor" | "coach" | "friend" | "expert" | "creative";

export const PERSONAS: { value: Persona; label: string; emoji: string; description: string }[] = [
  { value: "default", label: "Par défaut", emoji: "🤖", description: "Assistant IA polyvalent" },
  { value: "professor", label: "Professeur", emoji: "👨‍🏫", description: "Pédagogue et structuré" },
  { value: "coach", label: "Coach", emoji: "💪", description: "Motivant et encourageant" },
  { value: "friend", label: "Ami", emoji: "😄", description: "Décontracté et familier" },
  { value: "expert", label: "Expert", emoji: "🧑‍🔬", description: "Technique et précis" },
  { value: "creative", label: "Créatif", emoji: "🎨", description: "Imaginatif et original" },
];

export function getPersonaPrompt(persona: Persona): string {
  switch (persona) {
    case "professor":
      return "Tu es un professeur patient et pédagogue. Tu structures tes réponses avec des explications claires, des exemples concrets et des analogies. Tu encourages l'apprentissage et poses des questions pour vérifier la compréhension.";
    case "coach":
      return "Tu es un coach de vie motivant et bienveillant. Tu encourages, tu pousses à l'action et tu célèbres les réussites. Tu utilises un ton dynamique et positif. Tu poses des questions pour comprendre les objectifs.";
    case "friend":
      return "Tu es un ami proche et décontracté. Tu utilises un langage familier, des emojis, tu plaisantes et tu es très empathique. Tu tutoies naturellement et tu réagis avec enthousiasme.";
    case "expert":
      return "Tu es un expert technique de haut niveau. Tu donnes des réponses précises, détaillées et factuelles. Tu cites des sources quand possible et tu n'hésites pas à être technique.";
    case "creative":
      return "Tu es un artiste créatif débordant d'imagination. Tu proposes des idées originales, tu utilises des métaphores, tu penses en dehors des sentiers battus. Tes réponses sont colorées et inspirantes.";
    default:
      return "";
  }
}

interface PersonaSelectorProps {
  persona: Persona;
  onChange: (persona: Persona) => void;
}

export function PersonaSelector({ persona, onChange }: PersonaSelectorProps) {
  const current = PERSONAS.find(p => p.value === persona) || PERSONAS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-9 text-xs"
        >
          <span>{current.emoji}</span>
          <span className="hidden sm:inline">{current.label}</span>
          <Sparkles className="w-3 h-3 text-primary" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {PERSONAS.map((p) => (
          <DropdownMenuItem
            key={p.value}
            onClick={() => onChange(p.value)}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              persona === p.value && "bg-primary/10"
            )}
          >
            <span className="text-lg">{p.emoji}</span>
            <div>
              <p className="font-medium text-sm">{p.label}</p>
              <p className="text-xs text-muted-foreground">{p.description}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
