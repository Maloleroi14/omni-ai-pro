import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Bot, ArrowLeft, Briefcase, MapPin, Clock, Send, Heart, Rocket, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const jobs = [
  { id: "1", title: "Développeur Full-Stack Senior", location: "Remote", type: "CDI", department: "Engineering", description: "Rejoignez notre équipe technique pour développer de nouvelles fonctionnalités IA et améliorer notre plateforme." },
  { id: "2", title: "Designer UI/UX", location: "Remote", type: "CDI", department: "Design", description: "Créez des interfaces utilisateur intuitives et élégantes pour nos produits IA." },
  { id: "3", title: "Chef de Produit IA", location: "Remote", type: "CDI", department: "Product", description: "Définissez la vision produit et travaillez avec les équipes techniques pour livrer des fonctionnalités innovantes." },
  { id: "4", title: "Ingénieur Machine Learning", location: "Remote", type: "CDI", department: "AI Research", description: "Développez et optimisez nos modèles d'IA pour offrir des réponses toujours plus précises." },
  { id: "5", title: "Community Manager", location: "Remote", type: "CDD", department: "Marketing", description: "Animez notre communauté d'utilisateurs et développez notre présence sur les réseaux sociaux." },
  { id: "6", title: "Stagiaire Développeur", location: "Remote", type: "Stage", department: "Engineering", description: "Apprenez aux côtés de notre équipe et contribuez à des projets concrets." },
];

const values = [
  { icon: Rocket, title: "Innovation", desc: "Nous repoussons les limites de l'IA chaque jour." },
  { icon: Users, title: "Collaboration", desc: "On construit ensemble, dans la transparence." },
  { icon: Heart, title: "Passion", desc: "L'IA est notre passion, pas juste un job." },
  { icon: Zap, title: "Impact", desc: "Chaque contribution compte et fait la différence." },
];

export default function Careers() {
  const navigate = useNavigate();
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { toast.error("Remplissez tous les champs"); return; }
    setSending(true);
    const job = jobs.find(j => j.id === selectedJob);
    await supabase.from("contact_submissions").insert({
      name: form.name,
      email: form.email,
      subject: `Candidature : ${job?.title || "Poste inconnu"}`,
      message: form.message,
    });
    toast.success("Candidature envoyée ! Nous vous contacterons bientôt.");
    setForm({ name: "", email: "", message: "" });
    setSelectedJob(null);
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background grain-overlay">
      <nav className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-2xl">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold font-display">Carrières</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-3xl sm:text-5xl font-bold font-display mb-4">
            Rejoignez l'aventure <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">OmniAI Pro</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Nous construisons l'avenir de l'IA. Venez écrire cette histoire avec nous.
          </p>
        </motion.div>

        {/* Values */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {values.map((v, i) => (
            <motion.div key={v.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 text-center hover:border-primary/30 transition-all">
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <v.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold mb-1">{v.title}</h3>
              <p className="text-sm text-muted-foreground">{v.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Jobs */}
        <h2 className="text-2xl font-bold font-display mb-6">Postes ouverts</h2>
        <div className="space-y-3 mb-12">
          {jobs.map((job, i) => (
            <motion.div key={job.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm p-5 hover:border-primary/20 transition-all cursor-pointer group"
              onClick={() => setSelectedJob(selectedJob === job.id ? null : job.id)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold group-hover:text-primary transition-colors">{job.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{job.department}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{job.type}</span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium shrink-0">{job.type}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-3">{job.description}</p>

              {selectedJob === job.id && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-5 pt-5 border-t border-border/40 space-y-3" onSubmit={handleApply}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input placeholder="Votre nom" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    <Input type="email" placeholder="Votre email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <Textarea placeholder="Présentez-vous et expliquez votre motivation..." rows={4} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
                  <Button type="submit" disabled={sending} className="gap-2">
                    <Send className="w-4 h-4" /> Envoyer ma candidature
                  </Button>
                </motion.form>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
