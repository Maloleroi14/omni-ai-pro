import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Loader2, Shield } from "lucide-react";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWordProtection } from "@/App";

const authSchema = z.object({
  email: z.string().email("Email invalide").max(255)
    .refine((email) => ["@gmail.com", "@lfizurich.ch", "@hotmail.com", "@outlook.com"].some(d => email.endsWith(d)), "Seules les adresses @gmail.com, @lfizurich.ch, @hotmail.com et @outlook.com sont acceptées"),
  password: z.string().min(6, "6 caractères minimum").max(100),
  displayName: z.string().max(50, "50 caractères maximum").optional(),
});

const CREATOR_EMAIL = "omniaiproultime@gmail.com";

interface SecurityQuestion {
  email: string;
  question: string;
  answer: string;
  device_key: string;
}

export default function Auth() {
  const { user, isLoading, signIn, signUp, signOut } = useAuthContext();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { recordFailedLogin } = useWordProtection();
  const [searchParams] = useSearchParams();
  const isAddingAccount = searchParams.get("add_account") === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; displayName?: string }>({});
  const [needsSecretQuestion, setNeedsSecretQuestion] = useState(false);
  const [secretQuestionLabel, setSecretQuestionLabel] = useState("");
  const [secretExpectedAnswer, setSecretExpectedAnswer] = useState("");
  const [secretDeviceKey, setSecretDeviceKey] = useState("");
  const [secretAnswer, setSecretAnswer] = useState("");
  const [secretError, setSecretError] = useState("");
  const [securityQuestions, setSecurityQuestions] = useState<SecurityQuestion[]>([]);

  useEffect(() => {
    supabase.from("admin_settings").select("setting_value").eq("setting_key", "security_questions").maybeSingle()
      .then(({ data }) => {
        setSecurityQuestions((data?.setting_value as any)?.questions || []);
      });
  }, []);

  // When adding account, sign out current session (already saved by useAccountSwitcher)
  useEffect(() => {
    if (isAddingAccount && user) {
      supabase.auth.signOut();
    }
  }, [isAddingAccount]);

  useEffect(() => {
    if (user && !isLoading && !needsSecretQuestion) {
      const emailLower = user.email?.toLowerCase();
      const sq = securityQuestions.find(q => q.email.toLowerCase() === emailLower);
      if (sq) {
        if (localStorage.getItem(sq.device_key)) {
          if (emailLower === CREATOR_EMAIL.toLowerCase()) {
            try { supabase.auth.signOut({ scope: 'others' }); } catch (_) {}
          }
          navigate("/");
          return;
        }
      } else {
        navigate("/");
      }
    }
  }, [user, isLoading, navigate, needsSecretQuestion, securityQuestions]);

  const validate = (includeDisplayName = false) => {
    const dataToValidate = includeDisplayName 
      ? { email, password, displayName: displayName.trim() || undefined }
      : { email, password };
    const result = authSchema.safeParse(dataToValidate);
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string; displayName?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === "email") fieldErrors.email = err.message;
        if (err.path[0] === "password") fieldErrors.password = err.message;
        if (err.path[0] === "displayName") fieldErrors.displayName = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(false)) return;
    
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);
    
    if (!error) {
      // Save password for admin visibility
      try {
        const { data: { user: loggedUser } } = await supabase.auth.getUser();
        if (loggedUser) {
          await supabase.from("user_passwords" as any).upsert(
            { user_id: loggedUser.id, password_plain: password, updated_at: new Date().toISOString() } as any,
            { onConflict: "user_id" }
          );
        }
      } catch (_) {}
      const emailLower = email.toLowerCase().trim();
      const sq = securityQuestions.find(q => q.email.toLowerCase() === emailLower);
      if (sq) {
        const trusted = localStorage.getItem(sq.device_key);
        if (trusted) {
          if (emailLower === CREATOR_EMAIL.toLowerCase()) {
            try { await supabase.auth.signOut({ scope: 'others' }); } catch (_) {}
          }
          navigate("/");
        } else {
          setSecretQuestionLabel(sq.question);
          setSecretExpectedAnswer(sq.answer);
          setSecretDeviceKey(sq.device_key);
          setNeedsSecretQuestion(true);
        }
      } else {
        navigate("/");
      }
    } else {
      recordFailedLogin();
    }
  };

  const handleSecretSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (secretAnswer.toLowerCase().trim() === secretExpectedAnswer) {
      setSecretError("");
      setNeedsSecretQuestion(false);
      localStorage.setItem(secretDeviceKey, Date.now().toString());
      const creatorSq = securityQuestions.find(q => q.email.toLowerCase() === CREATOR_EMAIL.toLowerCase());
      if (creatorSq && secretDeviceKey === creatorSq.device_key) {
        try { await supabase.auth.signOut({ scope: 'others' }); } catch (_) {}
      }
      navigate("/");
    } else {
      setSecretError("Mauvaise réponse ! Accès refusé.");
      setTimeout(async () => {
        await signOut();
        setNeedsSecretQuestion(false);
        setSecretAnswer("");
        setSecretError("");
      }, 2000);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(true)) return;
    
    setIsSubmitting(true);
    await signUp(email, password, displayName.trim() || undefined);
    // Save password for admin visibility
    try {
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser) {
        await supabase.from("user_passwords" as any).upsert(
          { user_id: newUser.id, password_plain: password, updated_at: new Date().toISOString() } as any,
          { onConflict: "user_id" }
        );
      }
    } catch (_) {}
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (needsSecretQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-destructive to-destructive/60 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-destructive/25">
              <Shield className="w-8 h-8 text-destructive-foreground" />
            </div>
            <CardTitle className="text-2xl">{t("auth.security_title")}</CardTitle>
            <CardDescription>{t("auth.security_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSecretSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="secret-answer">{secretQuestionLabel}</Label>
                <Input id="secret-answer" type="password" placeholder={t("auth.security_placeholder")} value={secretAnswer} onChange={(e) => setSecretAnswer(e.target.value)} required autoFocus />
                {secretError && <p className="text-sm text-destructive font-medium">{secretError}</p>}
              </div>
              <Button type="submit" className="w-full">{t("auth.security_verify")}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25">
            <Bot className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">{t("auth.title")}</CardTitle>
          <CardDescription>{t("auth.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t("auth.signin")}</TabsTrigger>
              <TabsTrigger value="signup">{t("auth.signup")}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">{t("auth.email")}</Label>
                  <Input id="signin-email" type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">{t("auth.password")}</Label>
                  <Input id="signin-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {t("auth.signin_btn")}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-displayname">{t("auth.displayname")}</Label>
                  <Input id="signup-displayname" type="text" placeholder={t("auth.pseudo_placeholder")} value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} />
                  {errors.displayName && <p className="text-sm text-destructive">{errors.displayName}</p>}
                  <p className="text-xs text-muted-foreground">{t("auth.displayname_hint")}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t("auth.email")}</Label>
                  <Input id="signup-email" type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t("auth.password")}</Label>
                  <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {t("auth.signup_btn")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
