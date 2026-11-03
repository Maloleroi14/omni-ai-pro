import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Scale } from "lucide-react";
import { motion } from "framer-motion";

const sections = [
  {
    title: "1. Éditeur du site",
    content: `Omni AI Pro est édité par :
• Raison sociale : Omni AI Pro
• Statut : Projet indépendant
• Responsable de la publication : Malo Michel
• Contact : omniaiproultime@gmail.com`,
  },
  {
    title: "2. Hébergement",
    content: `Le site est hébergé par :
• Lovable (lovable.dev) pour le frontend
• Supabase pour l'infrastructure backend
• Les serveurs sont situés dans l'Union Européenne`,
  },
  {
    title: "3. Propriété intellectuelle",
    content: `L'ensemble des éléments composant le site Omni AI Pro (textes, graphismes, logiciels, images, sons, animations, etc.) sont la propriété exclusive de Omni AI Pro, à l'exception des contenus générés par les utilisateurs.

Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site est interdite, sauf autorisation écrite préalable.

Les contenus générés par l'IA à travers notre plateforme appartiennent à l'utilisateur qui les a créés, sous réserve des conditions d'utilisation.`,
  },
  {
    title: "4. Responsabilité",
    content: `Omni AI Pro s'efforce de fournir des informations aussi précises que possible. Toutefois, nous ne pouvons garantir l'exactitude, la complétude ou l'actualité des informations fournies par notre intelligence artificielle.

L'utilisation des informations et contenus disponibles sur le site se fait sous l'entière responsabilité de l'utilisateur.

Omni AI Pro ne saurait être tenu responsable :
• Des inexactitudes dans les réponses générées par l'IA
• Des dommages résultant de l'utilisation des contenus générés
• Des interruptions temporaires du service
• Des contenus des sites tiers vers lesquels des liens hypertextes peuvent renvoyer`,
  },
  {
    title: "5. Données personnelles",
    content: `Le traitement de vos données personnelles est détaillé dans notre Politique de Confidentialité. 
Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité de vos données.

Pour exercer ces droits, rendez-vous sur notre page de contact ou envoyez un e-mail à omniaiproultime@gmail.com.`,
  },
  {
    title: "6. Cookies",
    content: `Le site utilise des cookies strictement nécessaires au fonctionnement du service. 
Ces cookies ne collectent aucune donnée à des fins publicitaires.
Pour plus d'informations, consultez notre Politique de Confidentialité.`,
  },
  {
    title: "7. Droit applicable",
    content: `Les présentes mentions légales sont soumises au droit français. 
En cas de litige, et après tentative de résolution amiable, les tribunaux français seront seuls compétents.`,
  },
  {
    title: "8. Crédits",
    content: `• Design & Développement : Omni AI Pro
• Icônes : Lucide Icons
• Composants UI : shadcn/ui
• Framework : React + TypeScript + Tailwind CSS`,
  },
];

export default function LegalNotice() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-20">
        <Button variant="ghost" className="mb-8 gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" /> Retour
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Scale className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Mentions Légales</h1>
              <p className="text-muted-foreground text-sm">Dernière mise à jour : mars 2026</p>
            </div>
          </div>

          <div className="space-y-8 mt-10">
            {sections.map((s, i) => (
              <motion.section
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <h2 className="text-xl font-semibold mb-3">{s.title}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">{s.content}</p>
              </motion.section>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
