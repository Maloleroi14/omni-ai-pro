import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface TermsData {
  version: number;
  title: string;
  content: string;
}

export function TermsDialog() {
  const { user, profile } = useAuthContext();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [terms, setTerms] = useState<TermsData | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;

    const checkTerms = async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "terms_of_use")
        .single();

      if (!data?.setting_value) return;

      const termsData = data.setting_value as unknown as TermsData;
      setTerms(termsData);

      // Check profile from DB directly to get latest terms_version
      const { data: profileData } = await supabase
        .from("profiles")
        .select("terms_accepted, terms_version")
        .eq("user_id", user.id)
        .single();

      if (profileData) {
        const userVersion = (profileData as any).terms_version || 0;
        const userAccepted = (profileData as any).terms_accepted || false;
        if (!userAccepted || userVersion < termsData.version) {
          setOpen(true);
        }
      }
    };

    checkTerms();
  }, [user, profile]);

  const handleAccept = async () => {
    if (!user || !terms) return;
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: terms.version,
      } as any)
      .eq("user_id", user.id);

    if (error) {
      toast.error(t("terms.error"));
    } else {
      toast.success(t("terms.success"));
      setOpen(false);
    }
    setLoading(false);
  };

  if (!terms) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-lg w-[95vw] max-h-[85vh] flex flex-col overflow-hidden p-4 sm:p-6" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg">{terms.title}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {t("terms.read")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div 
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain border rounded-lg bg-muted/30 p-3 sm:p-4"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            maxHeight: 'calc(85vh - 220px)',
            minHeight: '120px',
          }}
        >
          <div className="prose prose-sm dark:prose-invert max-w-none pr-1 sm:pr-3">
            <ReactMarkdown>{terms.content}</ReactMarkdown>
          </div>
        </div>

        <div className="flex items-start gap-3 py-2 shrink-0">
          <Checkbox
            id="accept-terms"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
          />
          <label htmlFor="accept-terms" className="text-xs sm:text-sm text-muted-foreground cursor-pointer leading-tight">
            {t("terms.accept_label")}
          </label>
        </div>

        <DialogFooter className="shrink-0">
          <Button onClick={handleAccept} disabled={!accepted || loading} className="w-full">
            {loading ? t("terms.accepting") : t("terms.accept")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
