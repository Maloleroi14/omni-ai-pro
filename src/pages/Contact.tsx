import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, CheckCircle2, Mail, User, MessageSquare, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(100),
  email: z.string().trim().email("Adresse email invalide").max(255),
  subject: z.string().trim().min(1, "Le sujet est requis").max(200),
  message: z.string().trim().min(10, "Le message doit contenir au moins 10 caractères").max(2000),
});

type ContactForm = z.infer<typeof contactSchema>;

export default function Contact() {
  const navigate = useNavigate();
  const [form, setForm] = useState<ContactForm>({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleChange = (field: keyof ContactForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof ContactForm;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSending(true);
    try {
      const id = crypto.randomUUID();

      // Save to contact_submissions
      const { error: dbError } = await supabase.from("contact_submissions").insert({
        id,
        name: result.data.name,
        email: result.data.email,
        subject: result.data.subject,
        message: result.data.message,
      });

      if (dbError) throw dbError;

      // Also create a support ticket so it appears in admin Support tab
      await supabase.from("support_tickets").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id || "00000000-0000-0000-0000-000000000000",
        user_email: result.data.email,
        subject: `[Contact] ${result.data.subject}`,
        message: `De: ${result.data.name} (${result.data.email})\n\n${result.data.message}`,
        status: "open",
        priority: "normal",
      } as any);

      // Send confirmation email via Brevo
      await supabase.functions.invoke("send-brevo-email", {
        body: {
          to: result.data.email,
          toName: result.data.name,
          subject: "Merci pour votre message — Omni AI Pro",
          templateName: "contact-confirmation",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #6C5CE7, #A29BFE); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Merci, ${result.data.name} !</h1>
              </div>
              <div style="background: #ffffff; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 16px 16px;">
                <p style="color: #333; font-size: 16px; line-height: 1.6;">
                  Nous avons bien reçu votre message concernant <strong>"${result.data.subject}"</strong>.
                </p>
                <p style="color: #555; font-size: 14px; line-height: 1.6;">
                  Notre équipe vous répondra dans les plus brefs délais. En attendant, n'hésitez pas à consulter notre 
                  <a href="https://project-123.lovable.app/faq" style="color: #6C5CE7; text-decoration: none; font-weight: bold;">FAQ</a>.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />
                <p style="color: #999; font-size: 12px; text-align: center;">
                  Cet email a été envoyé automatiquement par Omni AI Pro.
                </p>
              </div>
            </div>
          `,
        },
      });

      setSent(true);
      toast.success("Message envoyé avec succès !");
    } catch (err: any) {
      console.error("Contact form error:", err);
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Mail className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-lg">Contact</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 space-y-6"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Message envoyé !</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Merci pour votre message. Un email de confirmation a été envoyé à votre adresse.
                Nous vous répondrons dans les plus brefs délais.
              </p>
              <div className="flex gap-3 justify-center pt-4">
                <Button variant="outline" onClick={() => navigate("/")}>
                  Retour à l'accueil
                </Button>
                <Button onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}>
                  Envoyer un autre message
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">Contactez-nous</h2>
                <p className="text-muted-foreground">
                  Une question, une suggestion ou un problème ? Remplissez le formulaire ci-dessous et nous vous répondrons rapidement.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5" /> Nom
                    </Label>
                    <Input
                      id="name"
                      placeholder="Votre nom"
                      value={form.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" /> Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject" className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" /> Sujet
                  </Label>
                  <Input
                    id="subject"
                    placeholder="Le sujet de votre message"
                    value={form.subject}
                    onChange={(e) => handleChange("subject", e.target.value)}
                    className={errors.subject ? "border-destructive" : ""}
                  />
                  {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5" /> Message
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Décrivez votre demande en détail..."
                    rows={6}
                    value={form.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    className={errors.message ? "border-destructive" : ""}
                  />
                  <div className="flex justify-between">
                    {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
                    <p className="text-xs text-muted-foreground ml-auto">{form.message.length}/2000</p>
                  </div>
                </div>

                <Button type="submit" disabled={sending} className="w-full sm:w-auto gap-2">
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Envoyer le message
                    </>
                  )}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
