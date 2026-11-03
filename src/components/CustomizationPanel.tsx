import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Settings, Lock, Unlock, Palette, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { ThemeMode, AccentColor, LayoutMode, VoiceLanguage } from "@/hooks/useCustomization";
import { VOICE_LANGUAGES } from "@/hooks/useCustomization";

interface CustomizationPanelProps {
  isUnlocked: boolean;
  theme: ThemeMode;
  accentColor: AccentColor;
  layout: LayoutMode;
  fontSize: number;
  voiceLanguage: VoiceLanguage;
  onUnlock: (password: string) => boolean;
  onLock: () => void;
  onThemeChange: (theme: ThemeMode) => void;
  onAccentColorChange: (color: AccentColor) => void;
  onLayoutChange: (layout: LayoutMode) => void;
  onFontSizeChange: (size: number) => void;
  onVoiceLanguageChange: (language: VoiceLanguage) => void;
  onReset: () => void;
}

export function CustomizationPanel({
  isUnlocked,
  theme,
  accentColor,
  layout,
  fontSize,
  voiceLanguage,
  onUnlock,
  onLock,
  onThemeChange,
  onAccentColorChange,
  onLayoutChange,
  onFontSizeChange,
  onVoiceLanguageChange,
  onReset,
}: CustomizationPanelProps) {
  const [password, setPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  const handleUnlock = () => {
    if (onUnlock(password)) {
      toast.success("Mode personnalisation déverrouillé !");
      setPassword("");
      setShowPasswordInput(false);
    } else {
      toast.error("Mot de passe incorrect");
    }
  };

  const accentColors: { value: AccentColor; label: string; color: string }[] = [
    { value: "purple", label: "Violet", color: "bg-purple-500" },
    { value: "blue", label: "Bleu", color: "bg-blue-500" },
    { value: "green", label: "Vert", color: "bg-green-500" },
    { value: "orange", label: "Orange", color: "bg-orange-500" },
    { value: "pink", label: "Rose", color: "bg-pink-500" },
    { value: "red", label: "Rouge", color: "bg-red-500" },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Settings className="w-5 h-5" />
          {isUnlocked && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Personnalisation
          </SheetTitle>
          <SheetDescription>
            {isUnlocked
              ? "Modifiez l'apparence de l'interface"
              : "Entrez le mot de passe pour débloquer"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {!isUnlocked ? (
            <div className="space-y-4">
              {showPasswordInput ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Entrez le mot de passe..."
                      onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleUnlock} className="flex-1">
                      <Unlock className="w-4 h-4 mr-2" />
                      Déverrouiller
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordInput(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setShowPasswordInput(true)}
                  className="w-full"
                  variant="outline"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Débloquer la personnalisation
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Theme */}
              <div className="space-y-2">
                <Label>Thème</Label>
                <Select value={theme} onValueChange={(v) => onThemeChange(v as ThemeMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">☀️ Clair</SelectItem>
                    <SelectItem value="dark">🌙 Sombre</SelectItem>
                    <SelectItem value="system">💻 Système</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Accent Color */}
              <div className="space-y-2">
                <Label>Couleur d'accent</Label>
                <div className="grid grid-cols-3 gap-2">
                  {accentColors.map((c) => (
                    <Button
                      key={c.value}
                      variant={accentColor === c.value ? "default" : "outline"}
                      className="h-auto py-2 flex-col gap-1"
                      onClick={() => onAccentColorChange(c.value)}
                    >
                      <span className={`w-4 h-4 rounded-full ${c.color}`} />
                      <span className="text-xs">{c.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Layout */}
              <div className="space-y-2">
                <Label>Disposition</Label>
                <Select value={layout} onValueChange={(v) => onLayoutChange(v as LayoutMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">📱 Par défaut</SelectItem>
                    <SelectItem value="compact">📐 Compact</SelectItem>
                    <SelectItem value="wide">🖥️ Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <Label>Taille du texte: {fontSize}px</Label>
                <Slider
                  value={[fontSize]}
                  onValueChange={([v]) => onFontSizeChange(v)}
                  min={12}
                  max={20}
                  step={1}
                />
              </div>

              {/* Voice Language */}
              <div className="space-y-2">
                <Label>🎤 Langue vocale</Label>
                <Select value={voiceLanguage} onValueChange={(v) => onVoiceLanguageChange(v as VoiceLanguage)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {VOICE_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.flag} {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {voiceLanguage === "auto" 
                    ? "L'IA détecte automatiquement votre langue" 
                    : "L'IA répondra toujours dans cette langue"}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onReset} className="flex-1">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Réinitialiser
                </Button>
                <Button variant="ghost" onClick={onLock}>
                  <Lock className="w-4 h-4 mr-2" />
                  Verrouiller
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
