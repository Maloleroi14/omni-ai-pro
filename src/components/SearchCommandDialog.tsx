import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MessageCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/hooks/useChat";

interface SearchCommandDialogProps {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  onSelect: (id: string) => void;
}

export function SearchCommandDialog({ open, onClose, conversations, onSelect }: SearchCommandDialogProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="p-0 max-w-md gap-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une conversation..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 p-0 h-auto text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun résultat</p>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted transition-colors"
                onClick={() => { onSelect(c.id); onClose(); }}
              >
                <MessageCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t text-[10px] text-muted-foreground">
          Ctrl+K pour ouvrir · Échap pour fermer
        </div>
      </DialogContent>
    </Dialog>
  );
}
