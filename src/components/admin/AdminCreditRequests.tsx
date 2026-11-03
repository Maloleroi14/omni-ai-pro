import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Loader2, RefreshCw, Clock } from "lucide-react";

interface CreditRequest {
  id: string;
  user_id: string;
  user_email: string;
  amount: number;
  total_price: number;
  status: string;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
}

export function AdminCreditRequests() {
  const { user } = useAuthContext();
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("credit_requests" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setRequests((data as unknown as CreditRequest[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadRequests(); }, []);

  const handleAction = async (req: CreditRequest, action: "approved" | "rejected") => {
    if (!user) return;
    setProcessing(req.id);

    if (action === "approved") {
      // Add credits to user
      const { data: current } = await supabase
        .from("user_credits")
        .select("credits")
        .eq("user_id", req.user_id)
        .single();

      const newCredits = (current?.credits || 0) + req.amount;
      await supabase
        .from("user_credits")
        .update({ credits: newCredits })
        .eq("user_id", req.user_id);
    }

    // Update request status
    await supabase
      .from("credit_requests" as any)
      .update({
        status: action,
        processed_at: new Date().toISOString(),
        processed_by: user.id,
      })
      .eq("id", req.id);

    toast.success(action === "approved" ? `${req.amount} crédits ajoutés à ${req.user_email}` : "Demande refusée");
    setProcessing(null);
    loadRequests();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />En attente</Badge>;
      case "approved": return <Badge className="bg-primary/10 text-primary gap-1"><Check className="w-3 h-3" />Approuvé</Badge>;
      case "rejected": return <Badge variant="destructive" className="gap-1"><X className="w-3 h-3" />Refusé</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Demandes d'achat de crédits</CardTitle>
          <CardDescription>Valide les paiements Twint reçus</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={loadRequests} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucune demande</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{req.user_email}</span>
                    {statusBadge(req.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {req.amount} crédits • {req.total_price.toFixed(2)} CHF • {new Date(req.created_at).toLocaleDateString("fr-CH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {req.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => handleAction(req, "approved")} disabled={processing === req.id} className="gap-1">
                      {processing === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Valider
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleAction(req, "rejected")} disabled={processing === req.id} className="gap-1">
                      <X className="w-3 h-3" />
                      Refuser
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
