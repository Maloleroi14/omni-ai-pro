import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Send, Clock, CheckCircle, MessageCircle, Heart, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_response: string | null;
  created_at: string;
}

interface SupportTicketDialogProps {
  triggerAsMenuItem?: boolean;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function SupportTicketDialog({ triggerAsMenuItem, externalOpen, onExternalOpenChange }: SupportTicketDialogProps) {
  const { user } = useAuthContext();
  const isControlled = externalOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (isControlled && onExternalOpenChange) onExternalOpenChange(v);
    else setInternalOpen(v);
  };
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tab, setTab] = useState<"new" | "history">("new");
  const [showThankYou, setShowThankYou] = useState(false);

  useEffect(() => {
    if (open && user) loadTickets();
    if (!open) setShowThankYou(false);
  }, [open, user]);

  const loadTickets = async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setTickets((data as any[]) || []);
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Sujet et message requis");
      return;
    }
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user!.id,
      user_email: user!.email!,
      subject,
      message,
      priority,
    } as any);

    if (error) {
      toast.error("Erreur: " + error.message);
    } else {
      setSubject("");
      setMessage("");
      setPriority("normal");
      setShowThankYou(true);
      loadTickets();
      setTimeout(() => {
        setShowThankYou(false);
        setTab("history");
      }, 3000);
    }
  };

  const statusIcon = (s: string) => {
    if (s === "open") return <Clock className="w-3 h-3 text-yellow-500" />;
    if (s === "answered") return <MessageCircle className="w-3 h-3 text-blue-500" />;
    return <CheckCircle className="w-3 h-3 text-green-500" />;
  };

  const statusLabel = (s: string) => {
    if (s === "open") return "En attente";
    if (s === "answered") return "Répondu";
    return "Fermé";
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {triggerAsMenuItem ? (
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }}>
              <HelpCircle className="w-4 h-4 mr-2" />
              Aide
            </DropdownMenuItem>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Support">
              <HelpCircle className="w-4 h-4" />
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        {showThankYou ? (
          <div className="flex flex-col items-center justify-center py-10 gap-4 animate-scale-in">
            <div className="relative">
              <Heart className="w-16 h-16 text-red-500 animate-bounce" fill="currentColor" />
              <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
              <Sparkles className="w-5 h-5 text-yellow-400 absolute -bottom-1 -left-3 animate-pulse" style={{ animationDelay: "0.5s" }} />
            </div>
            <h3 className="text-xl font-bold text-foreground">Merci beaucoup ! 💖</h3>
            <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-xs">
              Votre message nous aide à améliorer le site. Nous vous répondrons très bientôt !
            </p>
            <div className="flex gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Aide & Support
              </DialogTitle>
            </DialogHeader>

            <div className="flex gap-2 mb-4">
              <Button variant={tab === "new" ? "default" : "outline"} size="sm" onClick={() => setTab("new")}>
                Nouveau message
              </Button>
              <Button variant={tab === "history" ? "default" : "outline"} size="sm" onClick={() => setTab("history")}>
                Mes messages ({tickets.length})
              </Button>
            </div>

            {tab === "new" ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs text-muted-foreground">
                    💡 Une suggestion, un bug ou une question ? Écrivez-nous et nous vous répondrons rapidement !
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Sujet</Label>
                  <Input placeholder="Décrivez brièvement..." value={subject} onChange={e => setSubject(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea placeholder="Détaillez votre demande..." value={message} onChange={e => setMessage(e.target.value)} rows={4} />
                </div>
                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Basse</SelectItem>
                      <SelectItem value="normal">Normale</SelectItem>
                      <SelectItem value="high">Haute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun message envoyé</p>
                ) : (
                  tickets.map(t => (
                    <div key={t.id} className="p-3 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm truncate flex-1">{t.subject}</h4>
                        <Badge variant="outline" className="text-xs flex items-center gap-1 ml-2">
                          {statusIcon(t.status)}
                          {statusLabel(t.status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{t.message}</p>
                      {t.admin_response && (
                        <div className="p-2 rounded bg-primary/10 border border-primary/20">
                          <p className="text-xs font-medium text-primary mb-1">Réponse de l'équipe :</p>
                          <p className="text-xs">{t.admin_response}</p>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
