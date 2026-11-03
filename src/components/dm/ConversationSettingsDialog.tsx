import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Unlock, Ban, Palette, Type, Shield } from "lucide-react";

const FONT_OPTIONS = [
  { value: "default", label: "Par défaut" },
  { value: "serif", label: "Serif (Times)" },
  { value: "mono", label: "Monospace (Code)" },
  { value: "cursive", label: "Cursive" },
  { value: "comic", label: "Comic Sans" },
  { value: "georgia", label: "Georgia" },
  { value: "verdana", label: "Verdana" },
];

const WALLPAPER_OPTIONS = [
  { value: "", label: "Aucun" },
  { value: "gradient-blue", label: "🔵 Dégradé bleu" },
  { value: "gradient-purple", label: "🟣 Dégradé violet" },
  { value: "gradient-green", label: "🟢 Dégradé vert" },
  { value: "gradient-orange", label: "🟠 Dégradé orange" },
  { value: "gradient-dark", label: "⚫ Dégradé sombre" },
  { value: "gradient-rose", label: "🌸 Dégradé rose" },
  { value: "pattern-dots", label: "⚪ Motif points" },
  { value: "pattern-grid", label: "📐 Motif grille" },
];

interface ConversationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  userId: string;
  otherUserName: string;
  otherUserId: string;
  onBlock: () => void;
  onBan: () => void;
}

export function ConversationSettingsDialog({
  open, onOpenChange, conversationId, userId, otherUserName, otherUserId, onBlock, onBan,
}: ConversationSettingsDialogProps) {
  const [wallpaper, setWallpaper] = useState("");
  const [font, setFont] = useState("default");
  const [isLocked, setIsLocked] = useState(false);
  const [lockPin, setLockPin] = useState("");
  const [showPinInput, setShowPinInput] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) loadSettings();
  }, [open, conversationId]);

  const loadSettings = async () => {
    const { data } = await (supabase as any)
      .from("dm_conversation_settings")
      .select("*")
      .eq("user_id", userId)
      .eq("conversation_id", conversationId)
      .maybeSingle();
    
    if (data) {
      setWallpaper(data.wallpaper_url || "");
      setFont(data.font_family || "default");
      setIsLocked(data.is_locked || false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await (supabase as any).from("dm_conversation_settings").upsert({
      user_id: userId,
      conversation_id: conversationId,
      wallpaper_url: wallpaper || null,
      font_family: font,
      is_locked: isLocked,
      lock_pin: lockPin || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,conversation_id" });

    setSaving(false);
    if (error) {
      toast.error("Erreur de sauvegarde");
    } else {
      toast.success("Paramètres enregistrés");
      onOpenChange(false);
    }
  };

  const handleLockToggle = (checked: boolean) => {
    if (checked) {
      setShowPinInput(true);
    } else {
      setIsLocked(false);
      setLockPin("");
      setShowPinInput(false);
    }
  };

  const confirmLock = () => {
    if (lockPin.length < 4) {
      toast.error("Le code PIN doit avoir au moins 4 chiffres");
      return;
    }
    setIsLocked(true);
    setShowPinInput(false);
    toast.success("Conversation verrouillée");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Paramètres — {otherUserName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Wallpaper */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Palette className="w-4 h-4" /> Fond d'écran</Label>
            <Select value={wallpaper} onValueChange={setWallpaper}>
              <SelectTrigger><SelectValue placeholder="Choisir un fond" /></SelectTrigger>
              <SelectContent>
                {WALLPAPER_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value || "none"}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Type className="w-4 h-4" /> Police du texte</Label>
            <Select value={font} onValueChange={setFont}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lock */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                Verrouiller la conversation
              </Label>
              <Switch checked={isLocked || showPinInput} onCheckedChange={handleLockToggle} />
            </div>
            {showPinInput && (
              <div className="flex gap-2">
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Code PIN (4-6 chiffres)"
                  value={lockPin}
                  onChange={e => setLockPin(e.target.value.replace(/\D/g, ""))}
                />
                <Button size="sm" onClick={confirmLock}>OK</Button>
              </div>
            )}
            {isLocked && !showPinInput && (
              <p className="text-xs text-muted-foreground">🔒 Conversation verrouillée par code PIN</p>
            )}
          </div>

          {/* Block & Ban */}
          <div className="border-t pt-4 space-y-2">
            <Label className="flex items-center gap-2 text-destructive"><Shield className="w-4 h-4" /> Actions</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={onBlock}>
                <Lock className="w-3 h-3 mr-1" /> Bloquer
              </Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={onBan}>
                <Ban className="w-3 h-3 mr-1" /> Bannir
              </Button>
            </div>
          </div>

          <Button className="w-full" onClick={saveSettings} disabled={saving}>
            {saving ? "Sauvegarde..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
