import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, HelpCircle, Search, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const categoryLabels: Record<string, { label: string; emoji: string }> = {
  general: { label: "Général", emoji: "📌" },
  account: { label: "Compte", emoji: "👤" },
  credits: { label: "Crédits", emoji: "💰" },
  features: { label: "Fonctionnalités", emoji: "⚡" },
  security: { label: "Sécurité", emoji: "🔒" },
  other: { label: "Autre", emoji: "📎" },
};

export default function FAQ() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("faq_items")
        .select("id, question, answer, category")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setItems((data as FaqItem[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const categories = [...new Set(items.map((i) => i.category))];

  const filtered = items.filter((item) => {
    const matchSearch =
      !search ||
      item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !activeCategory || item.category === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Centre d'aide</h1>
              <p className="text-xs text-muted-foreground">Questions fréquentes</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une question..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 text-base rounded-xl"
          />
        </div>

        {/* Category filters */}
        {categories.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={activeCategory === null ? "default" : "outline"}
              className="cursor-pointer px-3 py-1.5 text-sm"
              onClick={() => setActiveCategory(null)}
            >
              Tout ({items.length})
            </Badge>
            {categories.map((cat) => {
              const info = categoryLabels[cat] || { label: cat, emoji: "📎" };
              const count = items.filter((i) => i.category === cat).length;
              return (
                <Badge
                  key={cat}
                  variant={activeCategory === cat ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5 text-sm"
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                >
                  {info.emoji} {info.label} ({count})
                </Badge>
              );
            })}
          </div>
        )}

        {/* FAQ items */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <HelpCircle className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground">
              {search ? "Aucun résultat pour cette recherche" : "Aucune question pour le moment"}
            </p>
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-3">
            {filtered.map((item) => {
              const info = categoryLabels[item.category] || { label: item.category, emoji: "📎" };
              return (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="border border-border/50 rounded-xl px-5 bg-card/50 backdrop-blur-sm data-[state=open]:bg-card data-[state=open]:shadow-md transition-all"
                >
                  <AccordionTrigger className="text-left text-[15px] font-medium hover:no-underline py-4">
                    <div className="flex items-start gap-3 pr-2">
                      <span className="text-lg shrink-0 mt-0.5">{info.emoji}</span>
                      <span>{item.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4 pl-9 whitespace-pre-line">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {/* Contact CTA */}
        <div className="text-center pt-6 pb-4 space-y-3">
          <p className="text-sm text-muted-foreground">Tu ne trouves pas ta réponse ?</p>
          <Button variant="outline" onClick={() => navigate("/")}>
            <MessageCircle className="w-4 h-4 mr-2" />
            Contacte le support
          </Button>
        </div>
      </div>
    </div>
  );
}