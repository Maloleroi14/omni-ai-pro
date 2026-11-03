import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { HelpCircle, Plus, Pencil, Trash2, GripVertical, X, Loader2 } from "lucide-react";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const categories = [
  { value: "general", label: "📌 Général" },
  { value: "account", label: "👤 Compte" },
  { value: "credits", label: "💰 Crédits" },
  { value: "features", label: "⚡ Fonctionnalités" },
  { value: "security", label: "🔒 Sécurité" },
  { value: "other", label: "📎 Autre" },
];

export function AdminFaqSection() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("general");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("faq_items")
      .select("*")
      .order("sort_order", { ascending: true });
    setItems((data as FaqItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setQuestion("");
    setAnswer("");
    setCategory("general");
  };

  const startEdit = (item: FaqItem) => {
    setEditingId(item.id);
    setQuestion(item.question);
    setAnswer(item.answer);
    setCategory(item.category);
  };

  const handleSubmit = async () => {
    if (!question.trim() || !answer.trim()) {
      toast.error("Question et réponse requises");
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("faq_items")
        .update({ question: question.trim(), answer: answer.trim(), category, updated_at: new Date().toISOString() } as any)
        .eq("id", editingId);
      if (error) toast.error("Erreur: " + error.message);
      else { toast.success("Question modifiée ✅"); resetForm(); load(); }
    } else {
      const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) + 1 : 0;
      const { error } = await supabase
        .from("faq_items")
        .insert({ question: question.trim(), answer: answer.trim(), category, sort_order: maxOrder } as any);
      if (error) toast.error("Erreur: " + error.message);
      else { toast.success("Question ajoutée ✅"); resetForm(); load(); }
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("faq_items").update({ is_active: !active } as any).eq("id", id);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("faq_items").delete().eq("id", id);
    toast.success("Question supprimée");
    if (editingId === id) resetForm();
    load();
  };

  const moveItem = async (id: string, direction: "up" | "down") => {
    const idx = items.findIndex(i => i.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const a = items[idx];
    const b = items[swapIdx];
    await Promise.all([
      supabase.from("faq_items").update({ sort_order: b.sort_order } as any).eq("id", a.id),
      supabase.from("faq_items").update({ sort_order: a.sort_order } as any).eq("id", b.id),
    ]);
    load();
  };

  const getCategoryLabel = (val: string) => categories.find(c => c.value === val)?.label || val;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">FAQ</h1>
          <p className="text-sm text-muted-foreground">Gestion des questions fréquentes</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {editingId ? "Modifier la question" : "Ajouter une question"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Question</Label>
            <Input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ex: Comment obtenir plus de crédits ?"
              maxLength={300}
            />
          </div>
          <div className="space-y-2">
            <Label>Réponse</Label>
            <Textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Réponse détaillée..."
              className="min-h-[100px]"
              maxLength={2000}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1">
              {editingId ? "Sauvegarder" : "Ajouter"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                <X className="w-4 h-4 mr-2" /> Annuler
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Questions ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune question ajoutée</p>
          ) : (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    editingId === item.id ? "ring-2 ring-primary bg-card" : "bg-card/50"
                  } ${!item.is_active ? "opacity-50" : ""}`}
                >
                  <div className="flex flex-col gap-1 pt-1">
                    <button
                      onClick={() => moveItem(item.id, "up")}
                      disabled={idx === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium">{item.question}</span>
                      <Badge variant="outline" className="text-[10px]">{getCategoryLabel(item.category)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.answer}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(item)}>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Switch checked={item.is_active} onCheckedChange={() => handleToggle(item.id, item.is_active)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}