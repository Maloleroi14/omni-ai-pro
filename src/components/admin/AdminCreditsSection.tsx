import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import { UserCreditsManager } from "./UserCreditsManager";
import { AdminCreditRequests } from "./AdminCreditRequests";

interface CreditCosts {
  message: number;
  generation: number;
  coding: number;
}

export function AdminCreditsSection() {
  const [creditCosts, setCreditCosts] = useState<CreditCosts>({ message: 1, generation: 3, coding: 5 });
  const [dailyCredits, setDailyCredits] = useState(15);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from("admin_settings").select("*");
    if (data) {
      data.forEach((row) => {
        if (row.setting_key === "credit_costs") {
          setCreditCosts(row.setting_value as unknown as CreditCosts);
        } else if (row.setting_key === "daily_credits") {
          setDailyCredits((row.setting_value as any)?.amount || 15);
        }
      });
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    await supabase.from("admin_settings").update({ setting_value: JSON.parse(JSON.stringify(creditCosts)) }).eq("setting_key", "credit_costs");
    await supabase.from("admin_settings").update({ setting_value: JSON.parse(JSON.stringify({ amount: dailyCredits })) }).eq("setting_key", "daily_credits");
    setIsSaving(false);
    toast.success("Paramètres sauvegardés !");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Configuration des Crédits</h2>
      <Card>
        <CardHeader>
          <CardTitle>Paramètres</CardTitle>
          <CardDescription>Définissez les coûts et limites</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Crédits par jour</Label>
            <Input type="number" value={dailyCredits} onChange={(e) => setDailyCredits(parseInt(e.target.value) || 0)} />
          </div>
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Coût par action</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Message normal</Label>
                <Input type="number" value={creditCosts.message} onChange={(e) => setCreditCosts({ ...creditCosts, message: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Génération image</Label>
                <Input type="number" value={creditCosts.generation} onChange={(e) => setCreditCosts({ ...creditCosts, generation: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Codage</Label>
                <Input type="number" value={creditCosts.coding} onChange={(e) => setCreditCosts({ ...creditCosts, coding: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
          <Button onClick={saveSettings} disabled={isSaving} className="w-full">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Sauvegarder
          </Button>
        </CardContent>
      </Card>
      <AdminCreditRequests />
      <UserCreditsManager />
    </div>
  );
}
