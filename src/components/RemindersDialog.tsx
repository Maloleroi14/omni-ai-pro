import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { StickyNote, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Reminder {
  id: string;
  content: string;
}

interface RemindersDialogProps {
  userId: string;
}

export function RemindersDialog({ userId }: RemindersDialogProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newReminder, setNewReminder] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) loadReminders();
  }, [open]);

  const loadReminders = async () => {
    const { data } = await supabase
      .from("sticky_notes")
      .select("id, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    setReminders(data || []);
  };

  const addReminder = async () => {
    if (!newReminder.trim()) return;
    const { error } = await supabase.from("sticky_notes").insert({
      user_id: userId,
      content: newReminder.trim(),
      color: "yellow",
    });
    if (error) { toast.error("Erreur"); return; }
    setNewReminder("");
    loadReminders();
  };

  const deleteReminder = async (id: string) => {
    await supabase.from("sticky_notes").delete().eq("id", id);
    loadReminders();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="w-full justify-start px-2 py-1.5 h-auto font-normal text-sm">
          <StickyNote className="w-4 h-4 mr-2" />
          Mes rappels
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5" />
            Mes rappels
          </SheetTitle>
        </SheetHeader>
        <p className="text-xs text-muted-foreground mt-2">
          Le chatbot te rappellera ces notes avant chaque réponse.
        </p>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto mt-4">
          {reminders.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Aucun rappel. Ajoutes-en un !</p>
          )}
          {reminders.map((r) => (
            <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted text-sm">
              <span className="flex-1">{r.content}</span>
              <button onClick={() => deleteReminder(r.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <Input
            placeholder="Nouveau rappel..."
            value={newReminder}
            onChange={(e) => setNewReminder(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addReminder()}
          />
          <Button onClick={addReminder} disabled={!newReminder.trim()} size="icon" className="shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
