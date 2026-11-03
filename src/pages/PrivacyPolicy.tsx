import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { motion } from "framer-motion";

const sections = [
  {
    title: "1. Collecte des données",
    content: `Nous collectons les données suivantes lorsque vous utilisez Omni AI Pro :
• Adresse e-mail et nom d'affichage lors de l'inscription
• Contenu des conversations avec l'IA (lié à votre compte)
• Données d'utilisation anonymisées (pages visitées, fonctionnalités utilisées)
• Informations techniques (type de navigateur, système d'exploitation)

Nous ne collectons jamais de données bancaires directement — les paiements sont gérés par nos partenaires certifiés.`,
  },
  {
    title: "2. Utilisation des données",
    content: `Vos données sont utilisées exclusivement pour :
• Fournir et améliorer nos services d'intelligence artificielle
• Personnaliser votre expérience utilisateur
• Assurer la sécurité et prévenir les abus
• Vous envoyer des communications liées à votre compte (avec votre consentement)
• Générer des statistiques anonymisées pour améliorer la plateforme`,
  },
  {
    title: "3. Stockage et sécurité",
    content: `Vos données sont stockées de manière sécurisée :
• Chiffrement en transit (TLS 1.3) et au repos (AES-256)
• Hébergement sur des serveurs conformes aux normes européennes
• Accès restreint aux données par un système de contrôle d'accès basé sur les rôles (RBAC)
• Sauvegardes régulières et plan de reprise d'activité
• Audits de sécurité réguliers`,
  },
  {
    title: "4. Partage des données",
    content: `Nous ne vendons jamais vos données personnelles. Nous pouvons partager des données avec :
• Nos sous-traitants techniques (hébergement, envoi d'e-mails) sous contrat de confidentialité
• Les autorités compétentes si requis par la loi
• Des tiers avec votre consentement explicite

Nous ne partageons aucune donnée avec des annonceurs ou des courtiers en données.`,
  },
  {
    title: "5. Vos droits (RGPD)",
    content: `Conformément au Règlement Général sur la Protection des Données, vous disposez des droits suivants :
• Droit d'accès : obtenir une copie de vos données personnelles
• Droit de rectification : corriger vos données inexactes
• Droit à l'effacement : supprimer votre compte et toutes vos données
• Droit à la portabilité : exporter vos données dans un format lisible
• Droit d'opposition : vous opposer à certains traitements
• Droit à la limitation : restreindre le traitement de vos données

Pour exercer ces droits, contactez-nous via la page Contact ou à l'adresse indiquée ci-dessous.`,
  },
  {
    title: "6. Cookies",
    content: `Omni AI Pro utilise des cookies essentiels pour :
• Maintenir votre session de connexion
• Mémoriser vos préférences (thème, langue)
• Assurer la sécurité de votre navigation

Nous n'utilisons pas de cookies publicitaires ni de trackers tiers.`,
  },
  {
    title: "7. Conservation des données",
    content: `Vos données sont conservées :
• Données de compte : tant que votre compte est actif
• Conversations : jusqu'à suppression manuelle ou suppression du compte
• Logs de connexion : 12 mois
• Données anonymisées : indéfiniment pour des fins statistiques

Après suppression de votre compte, toutes vos données personnelles sont effacées sous 30 jours.`,
  },
  {
    title: "8. Contact",
    content: `Pour toute question relative à vos données personnelles :
• Page Contact : /contact
• Responsable du traitement : Omni AI Pro
• Dernière mise à jour : mars 2026`,
  },
];

export default function PrivacyPolicy() {
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
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Politique de Confidentialité</h1>
              <p className="text-muted-foreground text-sm">Dernière mise à jour : mars 2026</p>
            </div>
          </div>

          <p className="text-muted-foreground mb-10 leading-relaxed">
            Chez Omni AI Pro, la protection de vos données personnelles est une priorité absolue. 
            Cette politique décrit comment nous collectons, utilisons et protégeons vos informations.
          </p>

          <div className="space-y-8">
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
