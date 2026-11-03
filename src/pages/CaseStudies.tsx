import { motion } from "framer-motion";
import { Bot, ArrowLeft, ArrowRight, Building2, GraduationCap, ShoppingBag, Stethoscope, Palette, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const caseStudies = [
  {
    sector: "E-commerce",
    icon: ShoppingBag,
    company: "ModaStyle",
    gradient: "from-pink-500 to-rose-500",
    challenge: "Service client submergé par les demandes récurrentes sur les commandes et les retours.",
    solution: "Intégration d'OmniAI Pro comme assistant client 24/7 capable de répondre instantanément aux questions sur les commandes, suivis et politique de retour.",
    results: [
      { metric: "-65%", label: "Tickets support" },
      { metric: "+40%", label: "Satisfaction client" },
      { metric: "24/7", label: "Disponibilité" },
    ],
    quote: "OmniAI Pro a transformé notre service client. Nos clients obtiennent des réponses en secondes au lieu d'heures.",
  },
  {
    sector: "Éducation",
    icon: GraduationCap,
    company: "EduTech Academy",
    gradient: "from-blue-500 to-cyan-500",
    challenge: "Difficultés à personnaliser l'apprentissage pour chaque étudiant dans des classes de 30+.",
    solution: "Utilisation d'OmniAI Pro comme tuteur intelligent qui s'adapte au niveau de chaque étudiant et génère des exercices personnalisés.",
    results: [
      { metric: "+35%", label: "Notes moyennes" },
      { metric: "2x", label: "Engagement" },
      { metric: "-50%", label: "Décrochage" },
    ],
    quote: "Chaque étudiant a maintenant un tuteur personnel disponible à tout moment. Les résultats parlent d'eux-mêmes.",
  },
  {
    sector: "Santé",
    icon: Stethoscope,
    company: "MedConsult Pro",
    gradient: "from-green-500 to-emerald-500",
    challenge: "Les médecins passaient trop de temps sur la documentation et les rapports cliniques.",
    solution: "OmniAI Pro assiste les praticiens dans la rédaction de comptes-rendus, la recherche médicale et la synthèse de dossiers patients.",
    results: [
      { metric: "-3h/jour", label: "Temps admin" },
      { metric: "+25%", label: "Patients vus" },
      { metric: "98%", label: "Précision" },
    ],
    quote: "Je peux enfin me concentrer sur mes patients plutôt que sur la paperasse. C'est révolutionnaire.",
  },
  {
    sector: "Design & Créatif",
    icon: Palette,
    company: "CreativeFlow Studio",
    gradient: "from-violet-500 to-purple-500",
    challenge: "Processus de création trop long, de l'idéation au prototype final.",
    solution: "Génération d'images, maquettes et prototypes web en quelques secondes avec OmniAI Pro pour accélérer chaque étape créative.",
    results: [
      { metric: "5x", label: "Plus rapide" },
      { metric: "+80%", label: "Propositions client" },
      { metric: "-70%", label: "Coût prototype" },
    ],
    quote: "En 10 minutes, je génère ce qui me prenait 2 jours. Mes clients sont bluffés par la rapidité.",
  },
  {
    sector: "Juridique",
    icon: Scale,
    company: "LexiJuris Cabinet",
    gradient: "from-amber-500 to-orange-500",
    challenge: "Analyse chronophage de documents juridiques longs et complexes.",
    solution: "OmniAI Pro analyse et résume les contrats, identifie les clauses critiques et suggère des modifications.",
    results: [
      { metric: "-75%", label: "Temps d'analyse" },
      { metric: "+90%", label: "Clauses détectées" },
      { metric: "3x", label: "Dossiers traités" },
    ],
    quote: "L'IA ne remplace pas l'avocat, mais elle le rend dix fois plus efficace.",
  },
  {
    sector: "Immobilier",
    icon: Building2,
    company: "ImmoVision",
    gradient: "from-teal-500 to-cyan-500",
    challenge: "Création d'annonces immobilières attractives et gestion des demandes de visites.",
    solution: "OmniAI Pro génère des descriptions professionnelles, des visuels et répond automatiquement aux demandes de renseignements.",
    results: [
      { metric: "+45%", label: "Leads qualifiés" },
      { metric: "-80%", label: "Temps rédaction" },
      { metric: "+30%", label: "Ventes" },
    ],
    quote: "Chaque annonce est maintenant un chef-d'œuvre. Les demandes de visite ont explosé.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function CaseStudies() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background grain-overlay">
      <nav className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-2xl">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold font-display">Études de cas</span>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-3xl sm:text-5xl font-bold font-display mb-4">
            Cas d'usage <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">concrets</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Découvrez comment des entreprises de tous secteurs utilisent OmniAI Pro pour transformer leur activité.
          </p>
        </motion.div>

        <div className="space-y-8">
          {caseStudies.map((cs, i) => (
            <motion.div
              key={cs.company}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp}
              custom={i}
              className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden hover:border-primary/20 transition-all"
            >
              <div className="p-6 sm:p-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cs.gradient} flex items-center justify-center shrink-0`}>
                    <cs.icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold font-display">{cs.company}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{cs.sector}</span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {/* Challenge */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-destructive flex items-center gap-1.5">🔴 Défi</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{cs.challenge}</p>
                  </div>
                  {/* Solution */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-primary flex items-center gap-1.5">💡 Solution</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{cs.solution}</p>
                  </div>
                  {/* Results */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-green-500 flex items-center gap-1.5">📈 Résultats</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {cs.results.map(r => (
                        <div key={r.label} className="text-center p-2 rounded-xl bg-muted/50">
                          <div className="text-lg font-black text-primary">{r.metric}</div>
                          <div className="text-[10px] text-muted-foreground">{r.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quote */}
                <div className="mt-6 pt-5 border-t border-border/40">
                  <p className="text-sm italic text-muted-foreground">"{cs.quote}"</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mt-16">
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/10 p-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Votre entreprise aussi peut en profiter</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">Rejoignez les entreprises qui ont déjà transformé leur activité avec OmniAI Pro.</p>
            <Button size="lg" className="gap-2 rounded-full" onClick={() => navigate("/auth")}>
              Commencer gratuitement <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
