import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ArrowLeft, Search, ChevronDown, BookOpen, MessageCircle, CreditCard, Shield, User, Zap, Globe, Code } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Article {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const categories = [
  { id: "all", label: "Tout", icon: BookOpen },
  { id: "general", label: "Général", icon: Zap },
  { id: "credits", label: "Crédits", icon: CreditCard },
  { id: "security", label: "Sécurité", icon: Shield },
  { id: "account", label: "Compte", icon: User },
  { id: "chat", label: "Chat IA", icon: MessageCircle },
  { id: "sites", label: "Sites web", icon: Globe },
  { id: "code", label: "Code", icon: Code },
];

const quickLinks = [
  { title: "Comment créer un site web ?", category: "sites" },
  { title: "Comment fonctionne le système de crédits ?", category: "credits" },
  { title: "Comment modifier mon profil ?", category: "account" },
  { title: "L'IA est-elle sécurisée ?", category: "security" },
];

export default function HelpCenter() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("faq_items").select("*").eq("is_active", true).order("sort_order");
      if (data) setArticles(data);
    };
    load();
  }, []);

  const filtered = articles.filter(a => {
    const matchSearch = !search || a.question.toLowerCase().includes(search.toLowerCase()) || a.answer.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || a.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-background grain-overlay">
      <nav className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-2xl">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold font-display">Centre d'aide</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold font-display mb-3">Comment pouvons-nous vous aider ?</h1>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">Trouvez des réponses à toutes vos questions sur OmniAI Pro.</p>
          
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un article..."
              className="pl-12 h-12 rounded-xl text-base"
            />
          </div>
        </motion.div>

        {/* Quick links */}
        {!search && category === "all" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {quickLinks.map((ql, i) => (
              <motion.button key={ql.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => { setCategory(ql.category); }}
                className="p-4 rounded-xl border border-border/60 bg-card/50 text-left hover:border-primary/30 transition-all text-sm font-medium"
              >
                {ql.title}
              </motion.button>
            ))}
          </div>
        )}

        {/* Categories */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <button key={cat.id} onClick={() => setCategory(cat.id)} className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all",
                category === cat.id ? "bg-primary text-primary-foreground border-primary" : "bg-card/60 border-border/60 hover:border-primary/40"
              )}>
                <Icon className="w-3.5 h-3.5" />{cat.label}
              </button>
            );
          })}
        </div>

        {/* Articles */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun article trouvé.</p>
            </div>
          )}
          {filtered.map((article, i) => (
            <motion.div key={article.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
              className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden hover:border-primary/20 transition-all"
            >
              <button
                onClick={() => setOpenId(openId === article.id ? null : article.id)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left"
              >
                <span className="font-medium text-sm pr-4">{article.question}</span>
                <ChevronDown className={cn("w-4 h-4 shrink-0 text-muted-foreground transition-transform", openId === article.id && "rotate-180")} />
              </button>
              <AnimatePresence>
                {openId === article.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-4">
                      {article.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Contact */}
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mt-16 p-8 rounded-2xl border border-border/60 bg-card/50">
          <h3 className="text-lg font-bold mb-2">Vous n'avez pas trouvé votre réponse ?</h3>
          <p className="text-sm text-muted-foreground mb-4">Notre équipe est là pour vous aider.</p>
          <Button onClick={() => navigate("/contact")} className="gap-2 rounded-full">
            <MessageCircle className="w-4 h-4" /> Contactez-nous
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
