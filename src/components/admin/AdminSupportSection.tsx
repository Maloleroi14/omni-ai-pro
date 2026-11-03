import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle, MessageCircle, Clock, CheckCircle, Send, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Ticket {
  id: string;
  user_email: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_response: string | null;
  created_at: string;
}

export function AdminSupportSection() {
  const { user } = useAuthContext();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState("all");
  const [responses, setResponses] = useState<Record<string, string>>({});

  useEffect(() => { loadTickets(); }, [filter]);

  const loadTickets = async () => {
    let query = supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);
    const { data } = await query.limit(100);
    setTickets((data as any[]) || []);
  };

  const handleRespond = async (ticketId: string) => {
    const response = responses[ticketId];
    if (!response?.trim()) { toast.error("Réponse vide"); return; }
    
    await supabase.from("support_tickets").update({
      admin_response: response,
      status: "answered",
      responded_by: user!.id,
      updated_at: new Date().toISOString(),
    } as any).eq("id", ticketId);
    
    toast.success("Réponse envoyée");
    setResponses(prev => ({ ...prev, [ticketId]: "" }));
    loadTickets();
  };

  const handleClose = async (ticketId: string) => {
    await supabase.from("support_tickets").update({
      status: "closed",
      closed_at: new Date().toISOString(),
    } as any).eq("id", ticketId);
    toast.success("Ticket fermé");
    loadTickets();
  };

  const priorityColor = (p: string) => {
    if (p === "high") return "destructive";
    if (p === "low") return "secondary";
    return "outline";
  };

  const statusIcon = (s: string) => {
    if (s === "open") return <Clock className="w-3 h-3 text-yellow-500" />;
    if (s === "answered") return <MessageCircle className="w-3 h-3 text-blue-500" />;
    return <CheckCircle className="w-3 h-3 text-green-500" />;
  };

  const openCount = tickets.filter(t => t.status === "open").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Tickets de support
            {openCount > 0 && <Badge variant="destructive">{openCount} en attente</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {["all", "open", "answered", "closed"].map(f => (
              <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
                {f === "all" ? "Tous" : f === "open" ? "En attente" : f === "answered" ? "Répondus" : "Fermés"}
              </Button>
            ))}
          </div>

          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun ticket</p>
          ) : (
            <div className="space-y-4">
              {tickets.map(t => (
                <div key={t.id} className="p-4 rounded-lg border space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {statusIcon(t.status)}
                        <h4 className="font-medium text-sm">{t.subject}</h4>
                        <Badge variant={priorityColor(t.priority) as any} className="text-xs">
                          {t.priority === "high" ? "Haute" : t.priority === "low" ? "Basse" : "Normale"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{t.user_email}</p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(t.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  
                  <p className="text-sm bg-muted/50 p-3 rounded">{t.message}</p>
                  
                  {t.admin_response && (
                    <div className="p-3 rounded bg-primary/10 border border-primary/20">
                      <p className="text-xs font-medium text-primary mb-1">Votre réponse :</p>
                      <p className="text-sm">{t.admin_response}</p>
                    </div>
                  )}

                  {t.status !== "closed" && (
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Répondre au ticket..."
                        value={responses[t.id] || ""}
                        onChange={e => setResponses(prev => ({ ...prev, [t.id]: e.target.value }))}
                        rows={2}
                        className="flex-1"
                      />
                      <div className="flex flex-col gap-1">
                        <Button size="sm" onClick={() => handleRespond(t.id)} disabled={!responses[t.id]?.trim()}>
                          <Send className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleClose(t.id)}>
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
