import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Save, Loader2, Sparkles, Plus, Trash2, Eye, Wand2, PartyPopper, Palette, Zap, Calendar, Clock, Cake, Gift } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

interface SiteEvent {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  start_date?: string | null;
  end_date?: string | null;
  is_scheduled?: boolean;
  is_birthday?: boolean;
  birthday_name?: string;
  styles: EventStyles;
}

interface EventStyles {
  primary_color: string;
  secondary_color: string;
  background_gradient: string;
  animation_type: string;
  ai_persona: string;
  ai_greeting: string;
  particle_effect: string;
  font_style: string;
  border_style: string;
  glow_effect: boolean;
}

const defaultStyles: EventStyles = {
  primary_color: "#8B5CF6",
  secondary_color: "#EC4899",
  background_gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  animation_type: "none",
  ai_persona: "default",
  ai_greeting: "",
  particle_effect: "none",
  font_style: "default",
  border_style: "default",
  glow_effect: false,
};

const animationOptions = [
  { value: "none", label: "Aucune" },
  { value: "snow", label: "❄️ Neige" },
  { value: "confetti", label: "🎉 Confetti" },
  { value: "hearts", label: "❤️ Cœurs" },
  { value: "stars", label: "⭐ Étoiles" },
  { value: "fireworks", label: "🎆 Feux d'artifice" },
  { value: "bubbles", label: "🫧 Bulles" },
  { value: "matrix", label: "💻 Matrix" },
];

const particleOptions = [
  { value: "none", label: "Aucun" },
  { value: "sparkle", label: "✨ Étincelles" },
  { value: "glow", label: "🔆 Lueur" },
  { value: "neon", label: "💡 Néon" },
  { value: "rainbow", label: "🌈 Arc-en-ciel" },
];

const fontOptions = [
  { value: "default", label: "Par défaut" },
  { value: "elegant", label: "✨ Élégant (Playfair Display)" },
  { value: "futuristic", label: "🚀 Futuriste (Orbitron)" },
  { value: "playful", label: "🎈 Ludique (Bubblegum Sans)" },
  { value: "bold", label: "💪 Gras (Permanent Marker)" },
];

const borderOptions = [
  { value: "default", label: "Par défaut" },
  { value: "rounded", label: "Très arrondi" },
  { value: "sharp", label: "Angles vifs" },
  { value: "gradient", label: "Bordure dégradée" },
  { value: "neon", label: "Bordure néon" },
];

const prebuiltEvents: Omit<SiteEvent, "id" | "created_at">[] = [
  {
    name: "🎄 Noël",
    description: "Ambiance festive de Noël avec neige et couleurs rouges/vertes",
    is_active: false,
    styles: {
      primary_color: "#DC2626",
      secondary_color: "#16A34A",
      background_gradient: "linear-gradient(135deg, #1a472a 0%, #2d5016 30%, #DC2626 100%)",
      animation_type: "snow",
      ai_persona: "Tu es le Père Noël ! Tu parles avec joie, tu dis 'Ho ho ho !' souvent. Tu souhaites un joyeux Noël à tout le monde et tu fais des références à Noël dans tes réponses.",
      ai_greeting: "🎅 Ho ho ho ! Joyeux Noël ! Que puis-je faire pour toi en cette belle période des fêtes ?",
      particle_effect: "sparkle",
      font_style: "elegant",
      border_style: "rounded",
      glow_effect: true,
    },
  },
  {
    name: "🐣 Pâques",
    description: "Thème printanier de Pâques avec couleurs pastel",
    is_active: false,
    styles: {
      primary_color: "#F59E0B",
      secondary_color: "#A78BFA",
      background_gradient: "linear-gradient(135deg, #fdf2f8 0%, #ede9fe 50%, #ecfccb 100%)",
      animation_type: "confetti",
      ai_persona: "Tu es joyeux et printanier ! Tu fais des références aux œufs de Pâques, aux lapins et au chocolat. Tu utilises des emojis comme 🐰🥚🌸",
      ai_greeting: "🐰 Joyeuses Pâques ! As-tu trouvé tous les œufs en chocolat ? Comment puis-je t'aider aujourd'hui ?",
      particle_effect: "rainbow",
      font_style: "playful",
      border_style: "rounded",
      glow_effect: false,
    },
  },
  {
    name: "🐟 Poisson d'Avril",
    description: "1er Avril ! Blagues et farces partout",
    is_active: false,
    styles: {
      primary_color: "#3B82F6",
      secondary_color: "#06B6D4",
      background_gradient: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #06b6d4 100%)",
      animation_type: "bubbles",
      ai_persona: "Tu es un farceur ! Tu glisses subtilement des petites blagues et des jeux de mots dans tes réponses. Tu peux dire des choses absurdes de temps en temps avant de révéler que c'est une blague. Utilise 🐟 souvent.",
      ai_greeting: "🐟 Poisson d'Avril ! Attention, aujourd'hui tout est possible... même mes réponses ! 😄",
      particle_effect: "sparkle",
      font_style: "playful",
      border_style: "rounded",
      glow_effect: true,
    },
  },
  {
    name: "🎃 Halloween",
    description: "Thème sombre et effrayant pour Halloween",
    is_active: false,
    styles: {
      primary_color: "#F97316",
      secondary_color: "#7C3AED",
      background_gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #F97316 100%)",
      animation_type: "stars",
      ai_persona: "Tu es mystérieux et un peu effrayant ! Tu parles avec un ton sombre mais amusant. Tu fais des références aux monstres, fantômes et citrouilles. Utilise 🎃👻🦇",
      ai_greeting: "🎃 Boo ! Bienvenue dans la nuit d'Halloween... N'aie pas peur, je suis là pour t'aider ! 👻",
      particle_effect: "neon",
      font_style: "futuristic",
      border_style: "neon",
      glow_effect: true,
    },
  },
  {
    name: "🎆 Nouvel An",
    description: "Célébration du Nouvel An avec feux d'artifice",
    is_active: false,
    styles: {
      primary_color: "#EAB308",
      secondary_color: "#F59E0B",
      background_gradient: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #EAB308 100%)",
      animation_type: "fireworks",
      ai_persona: "Tu célèbres le Nouvel An ! Tu es enthousiaste, tu souhaites une bonne année à tout le monde et tu parles de résolutions, de nouveaux départs.",
      ai_greeting: "🎆 Bonne Année ! 🥂 Que cette nouvelle année soit remplie de succès ! Comment puis-je t'aider ?",
      particle_effect: "sparkle",
      font_style: "elegant",
      border_style: "gradient",
      glow_effect: true,
    },
  },
  {
    name: "💖 Saint-Valentin",
    description: "Thème romantique pour la Saint-Valentin",
    is_active: false,
    styles: {
      primary_color: "#EC4899",
      secondary_color: "#F43F5E",
      background_gradient: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 30%, #EC4899 100%)",
      animation_type: "hearts",
      ai_persona: "Tu es romantique et doux ! Tu parles avec tendresse, tu fais des références à l'amour et au romantisme. Utilise des emojis comme 💖💕🌹",
      ai_greeting: "💖 Joyeuse Saint-Valentin ! L'amour est dans l'air... Comment puis-je t'aider aujourd'hui ? 🌹",
      particle_effect: "glow",
      font_style: "elegant",
      border_style: "rounded",
      glow_effect: true,
    },
  },
];

export function AdminEventsSection() {
  const { user } = useAuthContext();
  const [events, setEvents] = useState<SiteEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAICreate, setShowAICreate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPrebuilt, setShowPrebuilt] = useState(false);
  const [showBirthday, setShowBirthday] = useState(false);
  const [previewEvent, setPreviewEvent] = useState<SiteEvent | null>(null);
  const [saving, setSaving] = useState(false);

  // Manual creation form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStyles, setNewStyles] = useState<EventStyles>({ ...defaultStyles });
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newIsScheduled, setNewIsScheduled] = useState(false);

  // Birthday
  const [birthdayName, setBirthdayName] = useState("");

  // AI creation
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<{ name: string; description: string; styles: EventStyles } | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  // Auto-scheduling check every 30s
  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      let changed = false;
      const updated = events.map((ev) => {
        if (!ev.is_scheduled || (!ev.start_date && !ev.end_date)) return ev;
        const start = ev.start_date ? new Date(ev.start_date) : null;
        const end = ev.end_date ? new Date(ev.end_date) : null;
        const shouldBeActive = (!start || now >= start) && (!end || now <= end);
        if (shouldBeActive !== ev.is_active) {
          changed = true;
          return { ...ev, is_active: shouldBeActive };
        }
        return ev;
      });
      if (changed) {
        // Deactivate others if one becomes active
        const activeScheduled = updated.find((e) => e.is_active && e.is_scheduled);
        if (activeScheduled) {
          const final = updated.map((e) =>
            e.id === activeScheduled.id ? e : { ...e, is_active: false }
          );
          saveEvents(final);
        } else {
          saveEvents(updated);
        }
      }
    };
    checkSchedule();
    const interval = setInterval(checkSchedule, 30000);
    return () => clearInterval(interval);
  }, [events]);

  const loadEvents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "site_events")
      .maybeSingle();

    if (data?.setting_value) {
      const val = data.setting_value as any;
      setEvents(val.events || []);
    }
    setLoading(false);
  };

  const saveEvents = async (updatedEvents: SiteEvent[]) => {
    setSaving(true);
    const { error } = await supabase.from("admin_settings").upsert(
      {
        setting_key: "site_events",
        setting_value: JSON.parse(JSON.stringify({ events: updatedEvents })),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "setting_key" }
    );
    if (!error) {
      setEvents(updatedEvents);
    } else {
      toast.error("Erreur lors de la sauvegarde");
    }
    setSaving(false);
  };

  const createEvent = async () => {
    if (!newName.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    const ev: SiteEvent = {
      id: crypto.randomUUID(),
      name: newName,
      description: newDesc,
      is_active: false,
      created_at: new Date().toISOString(),
      start_date: newIsScheduled && newStartDate ? newStartDate : null,
      end_date: newIsScheduled && newEndDate ? newEndDate : null,
      is_scheduled: newIsScheduled,
      styles: { ...newStyles },
    };
    await saveEvents([...events, ev]);
    setNewName("");
    setNewDesc("");
    setNewStyles({ ...defaultStyles });
    setNewStartDate("");
    setNewEndDate("");
    setNewIsScheduled(false);
    setShowCreate(false);
    toast.success(`Événement "${ev.name}" créé !`);
  };

  const addPrebuiltEvent = async (preset: Omit<SiteEvent, "id" | "created_at">) => {
    const exists = events.find((e) => e.name === preset.name);
    if (exists) {
      toast.error(`L'événement "${preset.name}" existe déjà`);
      return;
    }
    const ev: SiteEvent = {
      ...preset,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    await saveEvents([...events, ev]);
    toast.success(`Événement "${ev.name}" ajouté !`);
  };

  const createBirthdayEvent = async () => {
    if (!birthdayName.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    const ev: SiteEvent = {
      id: crypto.randomUUID(),
      name: `🎂 Anniversaire de ${birthdayName}`,
      description: `Joyeux anniversaire ${birthdayName} ! 🎉`,
      is_active: false,
      created_at: new Date().toISOString(),
      is_birthday: true,
      birthday_name: birthdayName,
      styles: {
        primary_color: "#F59E0B",
        secondary_color: "#EC4899",
        background_gradient: "linear-gradient(135deg, #fbbf24 0%, #ec4899 50%, #8b5cf6 100%)",
        animation_type: "confetti",
        ai_persona: `Tu célèbres l'anniversaire de ${birthdayName} ! Tu es super enthousiaste, tu souhaites un joyeux anniversaire à ${birthdayName} dans chaque réponse. Tu fais des références aux gâteaux, bougies et cadeaux. Utilise 🎂🎁🎉🥳`,
        ai_greeting: `🎂🎉 JOYEUX ANNIVERSAIRE ${birthdayName.toUpperCase()} ! 🥳 Aujourd'hui c'est la fête ! Comment puis-je t'aider ?`,
        particle_effect: "rainbow",
        font_style: "playful",
        border_style: "rounded",
        glow_effect: true,
      },
    };
    await saveEvents([...events, ev]);
    setBirthdayName("");
    setShowBirthday(false);
    toast.success(`Événement anniversaire de ${birthdayName} créé ! 🎂`);
  };

  const toggleEvent = async (id: string) => {
    const target = events.find((e) => e.id === id);
    if (!target) return;
    if (!target.is_active) {
      // Activate this one, deactivate all others
      const updated = events.map((e) => ({ ...e, is_active: e.id === id }));
      await saveEvents(updated);
    } else {
      // Deactivate
      const updated = events.map((e) => (e.id === id ? { ...e, is_active: false } : e));
      await saveEvents(updated);
    }
  };

  const deleteEvent = async (id: string) => {
    await saveEvents(events.filter((e) => e.id !== id));
    toast.success("Événement supprimé");
  };

  const openPreview = (ev: SiteEvent) => {
    setPreviewEvent(ev);
    setShowPreview(true);
  };

  // AI event generation
  const generateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Décris l'événement que tu veux créer");
      return;
    }
    setAiGenerating(true);
    setAiResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [
            {
              role: "system",
              content: `Tu es un designer d'événements pour un site web d'IA. L'utilisateur va te décrire un événement/thème et tu dois générer un JSON avec les propriétés suivantes.
Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après.

Format requis:
{
  "name": "Nom de l'événement (avec un emoji au début)",
  "description": "Description courte de l'événement",
  "styles": {
    "primary_color": "#hexcolor",
    "secondary_color": "#hexcolor",
    "background_gradient": "linear-gradient(...)",
    "animation_type": "none|snow|confetti|hearts|stars|fireworks|bubbles|matrix",
    "ai_persona": "description détaillée de la personnalité de l'IA pendant l'événement, comment elle doit parler, quels emojis utiliser",
    "ai_greeting": "message d'accueil spécial de l'IA avec emojis",
    "particle_effect": "none|sparkle|glow|neon|rainbow",
    "font_style": "default|elegant|futuristic|playful|bold",
    "border_style": "default|rounded|sharp|gradient|neon",
    "glow_effect": true/false
  }
}

Sois très créatif et cohérent avec le thème. Les couleurs doivent être en hex. Le gradient CSS valide. L'ai_persona doit être détaillée (2-3 phrases).`,
            },
            { role: "user", content: aiPrompt },
          ],
        },
      });

      if (error) throw error;

      let responseText = "";
      if (data && typeof data === "string") {
        const lines = data.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const parsed = JSON.parse(line.slice(6));
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) responseText += content;
            } catch {}
          }
        }
      } else if (data?.choices?.[0]?.message?.content) {
        responseText = data.choices[0].message.content;
      }

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setAiResult({
          name: parsed.name || "Événement IA",
          description: parsed.description || "",
          styles: { ...defaultStyles, ...parsed.styles, glow_effect: parsed.styles?.glow_effect === true },
        });
        toast.success("Événement généré par l'IA !");
      } else {
        throw new Error("Réponse IA invalide");
      }
    } catch (err: any) {
      console.error("AI generation error:", err);
      toast.error("Erreur: " + (err.message || "Réessaye"));
    }
    setAiGenerating(false);
  };

  const applyAIResult = async () => {
    if (!aiResult) return;
    const ev: SiteEvent = {
      id: crypto.randomUUID(),
      name: aiResult.name,
      description: aiResult.description,
      is_active: false,
      created_at: new Date().toISOString(),
      styles: aiResult.styles,
    };
    await saveEvents([...events, ev]);
    setAiResult(null);
    setAiPrompt("");
    setShowAICreate(false);
    toast.success(`Événement "${ev.name}" créé par l'IA !`);
  };

  const getPreviewStyle = (styles: EventStyles): React.CSSProperties => ({
    background: styles.background_gradient,
    color: "#fff",
    borderRadius: styles.border_style === "rounded" ? 24 : styles.border_style === "sharp" ? 0 : 12,
    border: styles.border_style === "neon" ? `2px solid ${styles.primary_color}` : styles.border_style === "gradient" ? "2px solid transparent" : "1px solid rgba(255,255,255,0.2)",
    boxShadow: styles.glow_effect ? `0 0 30px ${styles.primary_color}40, 0 0 60px ${styles.secondary_color}20` : "0 4px 20px rgba(0,0,0,0.3)",
    fontFamily: styles.font_style === "elegant" ? "Georgia, serif" : styles.font_style === "futuristic" ? "'Courier New', monospace" : styles.font_style === "playful" ? "'Comic Sans MS', cursive" : styles.font_style === "bold" ? "Impact, sans-serif" : "inherit",
  });

  const getAnimationEmoji = (type: string) => {
    const found = animationOptions.find((a) => a.value === type);
    return found?.label.split(" ")[0] || "🎨";
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return d; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <PartyPopper className="w-5 h-5" /> Événements
          </h2>
          <p className="text-sm text-muted-foreground">
            Créez des événements qui transforment l'apparence du site
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowBirthday(true)} variant="outline" size="sm" className="gap-1">
            <Cake className="w-4 h-4" /> Anniversaire
          </Button>
          <Button onClick={() => setShowPrebuilt(true)} variant="outline" size="sm" className="gap-1">
            <Gift className="w-4 h-4" /> Prédéfinis
          </Button>
          <Button onClick={() => setShowAICreate(true)} variant="outline" size="sm" className="gap-1">
            <Wand2 className="w-4 h-4" /> IA
          </Button>
          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1">
            <Plus className="w-4 h-4" /> Nouveau
          </Button>
        </div>
      </div>

      {/* Events list */}
      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PartyPopper className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun événement créé</p>
            <p className="text-sm text-muted-foreground mt-1">Utilisez les boutons ci-dessus pour commencer</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {events.map((ev) => (
            <Card key={ev.id} className={ev.is_active ? "border-primary ring-2 ring-primary/20" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {ev.name}
                    {ev.is_active && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">ACTIF</span>
                    )}
                    {ev.is_scheduled && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Programmé
                      </span>
                    )}
                    {ev.is_birthday && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">🎂</span>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openPreview(ev)} title="Prévisualiser">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Switch checked={ev.is_active} onCheckedChange={() => toggleEvent(ev.id)} />
                    <Button variant="ghost" size="icon" onClick={() => deleteEvent(ev.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {ev.description && <CardDescription>{ev.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded-md bg-muted flex items-center gap-1">
                    <Palette className="w-3 h-3" />
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: ev.styles.primary_color }} />
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: ev.styles.secondary_color }} />
                  </span>
                  {ev.styles.animation_type !== "none" && (
                    <span className="px-2 py-1 rounded-md bg-muted">
                      {animationOptions.find((a) => a.value === ev.styles.animation_type)?.label}
                    </span>
                  )}
                  {ev.is_scheduled && ev.start_date && (
                    <span className="px-2 py-1 rounded-md bg-muted flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(ev.start_date)}
                      {ev.end_date && ` → ${formatDate(ev.end_date)}`}
                    </span>
                  )}
                  {ev.is_birthday && ev.birthday_name && (
                    <span className="px-2 py-1 rounded-md bg-muted">🎂 {ev.birthday_name}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Prebuilt Events Dialog */}
      <Dialog open={showPrebuilt} onOpenChange={setShowPrebuilt}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Gift className="w-5 h-5" /> Événements prédéfinis</DialogTitle>
            <DialogDescription>Ajoutez un événement pré-configuré en un clic</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {prebuiltEvents.map((preset, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl" style={getPreviewStyle(preset.styles)}>
                <div>
                  <h3 className="font-bold">{preset.name}</h3>
                  <p className="text-sm opacity-80">{preset.description}</p>
                  <div className="flex gap-1 mt-1">
                    {preset.styles.animation_type !== "none" && (
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded">{animationOptions.find((a) => a.value === preset.styles.animation_type)?.label}</span>
                    )}
                  </div>
                </div>
                <Button onClick={() => addPrebuiltEvent(preset)} variant="secondary" size="sm" className="shrink-0">
                  <Plus className="w-4 h-4 mr-1" /> Ajouter
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Birthday Dialog */}
      <Dialog open={showBirthday} onOpenChange={setShowBirthday}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Cake className="w-5 h-5" /> Événement Anniversaire</DialogTitle>
            <DialogDescription>Créez un événement pour célébrer un anniversaire</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Qui fête son anniversaire ?</Label>
              <Input value={birthdayName} onChange={(e) => setBirthdayName(e.target.value)} placeholder="Ex: Marie, Papa, l'équipe..." />
              <p className="text-xs text-muted-foreground">Pas besoin d'être un utilisateur du site !</p>
            </div>
            {birthdayName && (
              <div className="p-4 rounded-xl text-white" style={{ background: "linear-gradient(135deg, #fbbf24 0%, #ec4899 50%, #8b5cf6 100%)" }}>
                <h3 className="font-bold text-lg">🎂 Anniversaire de {birthdayName}</h3>
                <p className="text-sm opacity-80">Joyeux anniversaire {birthdayName} ! 🎉</p>
                <div className="mt-2 px-3 py-2 rounded-lg bg-white/10 text-sm">
                  🤖 🎂🎉 JOYEUX ANNIVERSAIRE {birthdayName.toUpperCase()} ! 🥳
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBirthday(false)}>Annuler</Button>
            <Button onClick={createBirthdayEvent} disabled={saving || !birthdayName.trim()}>
              <Cake className="w-4 h-4 mr-2" /> Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5" /> Créer un événement</DialogTitle>
            <DialogDescription>Personnalisez chaque aspect de votre événement</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom de l'événement</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Noël, Halloween..." />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Courte description..." />
              </div>
            </div>

            {/* Scheduling */}
            <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2"><Clock className="w-4 h-4" /> Programmer l'événement</Label>
                <Switch checked={newIsScheduled} onCheckedChange={setNewIsScheduled} />
              </div>
              {newIsScheduled && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Date de début</Label>
                    <Input type="datetime-local" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date de fin</Label>
                    <Input type="datetime-local" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Couleur principale</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={newStyles.primary_color} onChange={(e) => setNewStyles({ ...newStyles, primary_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                  <Input value={newStyles.primary_color} onChange={(e) => setNewStyles({ ...newStyles, primary_color: e.target.value })} className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Couleur secondaire</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={newStyles.secondary_color} onChange={(e) => setNewStyles({ ...newStyles, secondary_color: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                  <Input value={newStyles.secondary_color} onChange={(e) => setNewStyles({ ...newStyles, secondary_color: e.target.value })} className="flex-1" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gradient d'arrière-plan</Label>
              <Input value={newStyles.background_gradient} onChange={(e) => setNewStyles({ ...newStyles, background_gradient: e.target.value })} placeholder="linear-gradient(135deg, #667eea, #764ba2)" />
              <div className="h-8 rounded-md" style={{ background: newStyles.background_gradient }} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Animation</Label>
                <select className="w-full px-3 py-2 rounded-md border bg-background text-foreground" value={newStyles.animation_type} onChange={(e) => setNewStyles({ ...newStyles, animation_type: e.target.value })}>
                  {animationOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Effet de particules</Label>
                <select className="w-full px-3 py-2 rounded-md border bg-background text-foreground" value={newStyles.particle_effect} onChange={(e) => setNewStyles({ ...newStyles, particle_effect: e.target.value })}>
                  {particleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Style de police</Label>
                <select className="w-full px-3 py-2 rounded-md border bg-background text-foreground" value={newStyles.font_style} onChange={(e) => setNewStyles({ ...newStyles, font_style: e.target.value })}>
                  {fontOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Style de bordure</Label>
                <select className="w-full px-3 py-2 rounded-md border bg-background text-foreground" value={newStyles.border_style} onChange={(e) => setNewStyles({ ...newStyles, border_style: e.target.value })}>
                  {borderOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Effet de lueur (glow)</Label>
              <Switch checked={newStyles.glow_effect} onCheckedChange={(v) => setNewStyles({ ...newStyles, glow_effect: v })} />
            </div>

            <div className="space-y-2">
              <Label>Personnalité IA pendant l'événement</Label>
              <Textarea value={newStyles.ai_persona} onChange={(e) => setNewStyles({ ...newStyles, ai_persona: e.target.value })} placeholder="Ex: L'IA parle comme le Père Noël..." rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Message d'accueil IA</Label>
              <Input value={newStyles.ai_greeting} onChange={(e) => setNewStyles({ ...newStyles, ai_greeting: e.target.value })} placeholder="Ex: Ho ho ho ! Joyeux Noël !" />
            </div>

            {/* Mini preview */}
            <div className="space-y-2">
              <Label>Aperçu</Label>
              <div className="p-6 rounded-xl" style={getPreviewStyle(newStyles)}>
                <h3 className="text-lg font-bold mb-2">{newName || "Mon événement"}</h3>
                <p className="text-sm opacity-80">{newDesc || "Description"}</p>
                {newStyles.ai_greeting && (
                  <div className="mt-3 px-3 py-2 rounded-lg bg-white/10 text-sm">🤖 {newStyles.ai_greeting}</div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button onClick={createEvent} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Créer l'événement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Create Dialog */}
      <Dialog open={showAICreate} onOpenChange={setShowAICreate}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wand2 className="w-5 h-5" /> Créer avec l'IA</DialogTitle>
            <DialogDescription>Décris l'événement et l'IA le créera</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Décris ton événement</Label>
              <Textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Ex: Un thème Halloween avec des couleurs orange et noir, des animations de fantômes..." rows={4} />
            </div>

            <Button onClick={generateWithAI} disabled={aiGenerating} className="w-full gap-2">
              {aiGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Génération...</> : <><Wand2 className="w-4 h-4" /> Générer</>}
            </Button>

            {aiResult && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Sparkles className="w-4 h-4" /> Résultat
                </div>
                <div className="p-6 rounded-xl" style={getPreviewStyle(aiResult.styles)}>
                  <h3 className="text-lg font-bold mb-2">{aiResult.name}</h3>
                  <p className="text-sm opacity-80">{aiResult.description}</p>
                  {aiResult.styles.ai_greeting && (
                    <div className="mt-3 px-3 py-2 rounded-lg bg-white/10 text-sm">🤖 {aiResult.styles.ai_greeting}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={generateWithAI} variant="outline" className="flex-1" disabled={aiGenerating}>
                    <Zap className="w-4 h-4 mr-2" /> Régénérer
                  </Button>
                  <Button onClick={applyAIResult} className="flex-1" disabled={saving}>
                    <Save className="w-4 h-4 mr-2" /> Appliquer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Aperçu : {previewEvent?.name}</DialogTitle>
            <DialogDescription>Voici à quoi ressemblera votre site</DialogDescription>
          </DialogHeader>
          {previewEvent && (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border" style={{ background: previewEvent.styles.background_gradient }}>
                <div className="p-4 text-white">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full" style={{ background: previewEvent.styles.primary_color }} />
                    <span className="font-bold">OmniAI Pro</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-end">
                      <div className="px-3 py-2 rounded-2xl text-sm max-w-[70%]" style={{ background: previewEvent.styles.primary_color }}>Bonjour !</div>
                    </div>
                    <div className="flex justify-start">
                      <div className="px-3 py-2 rounded-2xl text-sm max-w-[70%] bg-white/20" style={{
                        borderRadius: previewEvent.styles.border_style === "rounded" ? 24 : 16,
                        boxShadow: previewEvent.styles.glow_effect ? `0 0 15px ${previewEvent.styles.secondary_color}40` : "none",
                      }}>
                        {previewEvent.styles.ai_greeting || "Bonjour ! Comment puis-je vous aider ?"}
                      </div>
                    </div>
                  </div>
                  {previewEvent.styles.animation_type !== "none" && (
                    <div className="mt-3 text-center text-xs opacity-60">
                      Animation : {animationOptions.find((a) => a.value === previewEvent.styles.animation_type)?.label}
                    </div>
                  )}
                </div>
              </div>
              {previewEvent.styles.ai_persona !== "default" && (
                <div className="p-3 rounded-lg bg-muted text-sm">
                  <span className="font-medium">🤖 Personnalité IA :</span> {previewEvent.styles.ai_persona}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
