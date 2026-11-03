import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Clock, CheckCircle2, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Submission = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
};

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: "Nouveau", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  read: { label: "Lu", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  replied: { label: "Répondu", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
};

export function AdminContactSection() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = async () => {
    const { data } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    setSubmissions((data as Submission[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchSubmissions(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("contact_submissions").update({ status }).eq("id", id);
    toast.success("Statut mis à jour");
    fetchSubmissions();
  };

  const deleteSubmission = async (id: string) => {
    await supabase.from("contact_submissions").delete().eq("id", id);
    toast.success("Message supprimé");
    fetchSubmissions();
  };

  const openMessage = (sub: Submission) => {
    setSelected(sub);
    if (sub.status === "new") updateStatus(sub.id, "read");
  };

  const newCount = submissions.filter(s => s.status === "new").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" />
            Messages de contact
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {submissions.length} message(s) · {newCount} nouveau(x)
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Chargement...</p>
      ) : submissions.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Aucun message reçu.</p>
      ) : (
        <div className="space-y-3">
          {submissions.map(sub => {
            const cfg = statusConfig[sub.status] || statusConfig.new;
            return (
              <Card key={sub.id} className={`cursor-pointer hover:shadow-md transition-shadow ${sub.status === "new" ? "border-primary/30" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0" onClick={() => openMessage(sub)}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm truncate">{sub.name}</span>
                        <Badge variant="outline" className={cfg.color + " text-xs"}>
                          {cfg.label}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{sub.subject}</p>
                      <p className="text-xs text-muted-foreground truncate">{sub.email}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(sub.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openMessage(sub)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {sub.status !== "replied" && (
                        <Button variant="ghost" size="icon" onClick={() => updateStatus(sub.id, "replied")}>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteSubmission(sub.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.subject}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium">{selected.name}</span>
                <span className="text-muted-foreground">{selected.email}</span>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                {selected.message}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    window.open(`mailto:${selected.email}?subject=Re: ${selected.subject}`, "_blank");
                    updateStatus(selected.id, "replied");
                  }}
                >
                  <Mail className="w-4 h-4 mr-1" /> Répondre par email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
