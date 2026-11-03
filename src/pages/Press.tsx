import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Download, ExternalLink, Bot, Newspaper, Image, FileText } from "lucide-react";
import { motion } from "framer-motion";

const pressReleases = [
  { date: "Mars 2026", title: "Omni AI Pro lance son système de badges et gamification", excerpt: "La plateforme récompense désormais ses utilisateurs les plus actifs avec un système de badges et de crédits." },
  { date: "Février 2026", title: "Nouvelle fonctionnalité : Création de sites web par IA", excerpt: "Les utilisateurs peuvent désormais créer des sites web complets en quelques secondes grâce à l'IA générative." },
  { date: "Janvier 2026", title: "Lancement d'Omni AI Pro", excerpt: "Omni AI Pro, la plateforme tout-en-un d'intelligence artificielle, ouvre ses portes au public." },
];

const brandAssets = [
  { name: "Logo principal", format: "SVG / PNG", icon: Image },
  { name: "Guide de marque", format: "PDF", icon: FileText },
  { name: "Captures d'écran", format: "ZIP", icon: Image },
];

const stats = [
  { label: "Utilisateurs actifs", value: "500+" },
  { label: "Messages traités", value: "100K+" },
  { label: "Sites générés", value: "1,000+" },
  { label: "Disponibilité", value: "99.9%" },
];

export default function Press() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-20">
        <Button variant="ghost" className="mb-8 gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Newspaper className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Presse & Médias</h1>
              <p className="text-muted-foreground text-sm">Ressources pour les journalistes et médias</p>
            </div>
          </div>
        </motion.div>

        {/* About */}
        <motion.section className="mt-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <h2 className="text-xl font-semibold mb-4">À propos d'Omni AI Pro</h2>
          <Card className="border-border/60">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
                  <Bot className="w-7 h-7 text-primary-foreground" />
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Omni AI Pro est une plateforme d'intelligence artificielle tout-en-un qui permet aux utilisateurs de converser avec une IA avancée, générer des images, créer des sites web et explorer le web — le tout depuis une seule interface intuitive. Notre mission est de démocratiser l'accès à l'IA et de rendre la technologie accessible à tous.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Key stats */}
        <motion.section className="mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <h2 className="text-xl font-semibold mb-4">Chiffres clés</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <Card key={i} className="border-border/60">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.section>

        {/* Press releases */}
        <motion.section className="mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <h2 className="text-xl font-semibold mb-4">Communiqués de presse</h2>
          <div className="space-y-4">
            {pressReleases.map((pr, i) => (
              <Card key={i} className="border-border/60 hover:border-primary/20 transition-colors">
                <CardContent className="p-5">
                  <span className="text-xs text-primary font-medium">{pr.date}</span>
                  <h3 className="font-semibold mt-1 mb-2">{pr.title}</h3>
                  <p className="text-sm text-muted-foreground">{pr.excerpt}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.section>

        {/* Brand assets */}
        <motion.section className="mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <h2 className="text-xl font-semibold mb-4">Kit presse</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {brandAssets.map((a, i) => (
              <Card key={i} className="border-border/60 hover:border-primary/20 transition-colors cursor-pointer">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <a.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.format}</p>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.section>

        {/* Contact presse */}
        <motion.section className="mt-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold mb-2">Contact Presse</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Pour toute demande presse, interview ou collaboration médias
              </p>
              <Button onClick={() => navigate("/contact")} className="gap-2">
                <ExternalLink className="w-4 h-4" /> Nous contacter
              </Button>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </div>
  );
}
