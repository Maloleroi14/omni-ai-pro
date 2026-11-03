import { Shield, Lock, Eye, Server } from "lucide-react";
import { motion } from "framer-motion";

const badges = [
  { icon: Lock, label: "Chiffrement TLS 1.3", description: "Données chiffrées en transit et au repos" },
  { icon: Shield, label: "Conforme RGPD", description: "Protection des données européenne" },
  { icon: Eye, label: "Vie privée", description: "Aucune revente de données personnelles" },
  { icon: Server, label: "Serveurs UE", description: "Infrastructure hébergée en Europe" },
];

export function SecurityBadges() {
  return (
    <section className="py-16 px-4 sm:px-6">
      <motion.div
        className="max-w-5xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Sécurité & Confiance</h2>
          <p className="text-muted-foreground text-sm">Tes données sont entre de bonnes mains</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((b, i) => (
            <motion.div
              key={b.label}
              className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm p-5 text-center hover:border-primary/20 transition-all"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -2 }}
            >
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <b.icon className="w-5 h-5 text-green-500" />
              </div>
              <p className="font-semibold text-sm mb-1">{b.label}</p>
              <p className="text-[11px] text-muted-foreground">{b.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
