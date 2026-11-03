import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Save, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SecurityQuestion {
  email: string;
  question: string;
  answer: string;
  device_key: string;
}

export function AdminSecurityQuestionsSection() {
  const [questions, setQuestions] = useState<SecurityQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    const { data } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "security_questions")
      .maybeSingle();
    setQuestions((data?.setting_value as any)?.questions || []);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("admin_settings")
      .upsert({
        setting_key: "security_questions",
        setting_value: { questions } as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: "setting_key" });
    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Questions de sécurité mises à jour !");
    }
  };

  const updateQuestion = (index: number, field: keyof SecurityQuestion, value: string) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev, { email: "", question: "", answer: "", device_key: "omniai_custom_" + Date.now() }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Questions de sécurité</h2>
          <p className="text-sm text-muted-foreground">Gérez les questions secrètes pour les comptes protégés</p>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                Compte protégé #{i + 1}
                <Button variant="ghost" size="icon" onClick={() => removeQuestion(i)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Email du compte</Label>
                <Input value={q.email} onChange={e => updateQuestion(i, "email", e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="space-y-1">
                <Label>Question secrète</Label>
                <Input value={q.question} onChange={e => updateQuestion(i, "question", e.target.value)} placeholder="Votre question..." />
              </div>
              <div className="space-y-1">
                <Label>Réponse attendue</Label>
                <Input value={q.answer} onChange={e => updateQuestion(i, "answer", e.target.value)} placeholder="Réponse..." />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={addQuestion}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un compte
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Sauvegarder
        </Button>
      </div>
    </div>
  );
}
