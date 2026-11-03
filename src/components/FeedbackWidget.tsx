import { useState } from "react";
import { MessageSquareHeart, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const emojis = [
  { value: 1, emoji: "😠", label: "Très insatisfait" },
  { value: 2, emoji: "😕", label: "Insatisfait" },
  { value: 3, emoji: "😐", label: "Neutre" },
  { value: 4, emoji: "😊", label: "Satisfait" },
  { value: 5, emoji: "🤩", label: "Très satisfait" },
];

const FEEDBACK_FIRST_SEEN_KEY = "feedback_widget_first_seen";
const FEEDBACK_SUBMITTED_KEY = "feedback_widget_submitted";
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export function FeedbackWidget() {
  const { user } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useState(() => {
    if (!user) return;
    if (localStorage.getItem(FEEDBACK_SUBMITTED_KEY) === "true") return;
    const firstSeen = localStorage.getItem(FEEDBACK_FIRST_SEEN_KEY);
    if (!firstSeen) {
      localStorage.setItem(FEEDBACK_FIRST_SEEN_KEY, Date.now().toString());
      setVisible(true);
    } else if (Date.now() - parseInt(firstSeen) < THREE_DAYS_MS) {
      setVisible(true);
    }
  });

  if (!user || !visible) return null;

  const handleSubmit = async () => {
    if (score === null) return;
    setLoading(true);
    await supabase.from("contact_submissions").insert({
      name: user.email || "Utilisateur",
      email: user.email || "",
      subject: `Feedback NPS: ${score}/5`,
      message: `Score: ${score}/5\n\n${comment || "(Pas de commentaire)"}`,
    });
    setLoading(false);
    setSubmitted(true);
    localStorage.setItem(FEEDBACK_SUBMITTED_KEY, "true");
    toast.success("Merci pour ton retour !");
    setTimeout(() => { setOpen(false); setVisible(false); }, 2000);
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.div
            className="fixed bottom-6 right-6 z-50"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Button
              size="icon"
              className="w-12 h-12 rounded-full shadow-lg shadow-primary/25"
              onClick={() => setOpen(true)}
            >
              <MessageSquareHeart className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">Ton avis compte !</h3>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {submitted ? (
              <div className="p-6 text-center">
                <span className="text-4xl">🎉</span>
                <p className="mt-2 font-medium">Merci !</p>
                <p className="text-sm text-muted-foreground">Ton retour nous aide à nous améliorer.</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground">Comment évalues-tu ton expérience sur Omni AI Pro ?</p>
                
                <div className="flex justify-between px-2">
                  {emojis.map((e) => (
                    <button
                      key={e.value}
                      className={cn(
                        "text-2xl transition-transform hover:scale-125 p-1 rounded-lg",
                        score === e.value && "bg-primary/10 scale-110 ring-2 ring-primary/30"
                      )}
                      onClick={() => setScore(e.value)}
                      title={e.label}
                    >
                      {e.emoji}
                    </button>
                  ))}
                </div>

                {score !== null && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                    <Textarea
                      placeholder="Un commentaire ? (optionnel)"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </motion.div>
                )}

                <Button
                  className="w-full gap-2"
                  disabled={score === null || loading}
                  onClick={handleSubmit}
                >
                  <Send className="w-4 h-4" />
                  Envoyer
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
