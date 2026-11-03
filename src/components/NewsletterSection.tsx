import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error("Adresse e-mail invalide");
      return;
    }
    setLoading(true);
    await supabase.from("contact_submissions").insert({
      name: "Newsletter",
      email: email.trim(),
      subject: "Inscription Newsletter",
      message: `Nouvelle inscription newsletter: ${email.trim()}`,
    });
    setLoading(false);
    setDone(true);
    toast.success("Inscrit avec succès !");
  };

  return (
    <section className="py-16 px-4 sm:px-6">
      <motion.div
        className="max-w-2xl mx-auto text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">Reste informé</h2>
        <p className="text-muted-foreground text-sm sm:text-base mb-6">
          Reçois les dernières nouveautés, mises à jour et conseils IA directement dans ta boîte mail.
        </p>

        {done ? (
          <motion.div
            className="flex items-center justify-center gap-2 text-green-500"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
          >
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Merci ! Tu es inscrit.</span>
          </motion.div>
        ) : (
          <form onSubmit={subscribe} className="flex gap-2 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              required
            />
            <Button type="submit" disabled={loading} className="gap-2 shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              S'inscrire
            </Button>
          </form>
        )}

        <p className="text-[11px] text-muted-foreground/60 mt-3">
          Pas de spam. Désinscription en un clic.
        </p>
      </motion.div>
    </section>
  );
}
