import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileText, Send, Save, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsData {
  version: number;
  title: string;
  content: string;
  updated_at: string;
}

export function AdminTermsSection() {
  const [terms, setTerms] = useState<TermsData>({
    version: 1,
    title: "Conditions d'utilisation",
    content: "",
    updated_at: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [stats, setStats] = useState({ total: 0, accepted: 0 });

  useEffect(() => {
    loadTerms();
    loadStats();
  }, []);

  const loadTerms = async () => {
    const { data } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "terms_of_use")
      .single();

    if (data?.setting_value) {
      setTerms(data.setting_value as unknown as TermsData);
    }
  };

  const loadStats = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("terms_accepted, terms_version");

    if (profiles) {
      setStats({
        total: profiles.length,
        accepted: profiles.filter((p: any) => p.terms_accepted).length,
      });
    }
  };

  const saveTerms = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("admin_settings")
      .update({
        setting_value: {
          ...terms,
          updated_at: new Date().toISOString(),
        } as any,
      })
      .eq("setting_key", "terms_of_use");

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Conditions sauvegardées !");
    }
    setLoading(false);
  };

  const forceReaccept = async () => {
    setLoading(true);
    const newVersion = terms.version + 1;
    
    // Update terms version
    const { error: termsError } = await supabase
      .from("admin_settings")
      .update({
        setting_value: {
          ...terms,
          version: newVersion,
          updated_at: new Date().toISOString(),
        } as any,
      })
      .eq("setting_key", "terms_of_use");

    if (termsError) {
      toast.error("Erreur lors de la mise à jour");
      setLoading(false);
      return;
    }

    // Reset all users' acceptance (including creator)
    const { error: profilesError } = await supabase
      .from("profiles")
      .update({ 
        terms_accepted: false,
        terms_version: 0,
      } as any)
      .gte("created_at", "2000-01-01"); // Match all rows

    if (profilesError) {
      toast.error("Erreur lors de la réinitialisation : " + profilesError.message);
    } else {
      setTerms(prev => ({ ...prev, version: newVersion }));
      toast.success(`Conditions v${newVersion} envoyées ! Tous les utilisateurs devront ré-accepter.`);
      loadStats();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          Conditions d'utilisation
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Gérez les conditions que les utilisateurs doivent accepter.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Utilisateurs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.accepted}</p>
            <p className="text-xs text-muted-foreground">Acceptées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{stats.total - stats.accepted}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
      </div>

      {/* Version info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Version actuelle : v{terms.version}</CardTitle>
          <CardDescription>
            Modifiez le contenu et sauvegardez, ou forcez une ré-acceptation pour tous.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Edit form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Titre</label>
            <Input
              value={terms.title}
              onChange={(e) => setTerms(prev => ({ ...prev, title: e.target.value }))}
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">Contenu (Markdown)</label>
              <Button variant="ghost" size="sm" onClick={() => setPreview(!preview)}>
                {preview ? "Éditer" : "Aperçu"}
              </Button>
            </div>
            {preview ? (
              <ScrollArea className="h-64 border rounded-lg p-4 bg-muted/30">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{terms.content}</ReactMarkdown>
                </div>
              </ScrollArea>
            ) : (
              <Textarea
                value={terms.content}
                onChange={(e) => setTerms(prev => ({ ...prev, content: e.target.value }))}
                rows={12}
                className="font-mono text-xs"
                placeholder="Écrivez vos conditions en Markdown..."
              />
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={saveTerms} disabled={loading} className="gap-2 flex-1">
              <Save className="w-4 h-4" />
              Sauvegarder
            </Button>
            <Button 
              onClick={forceReaccept} 
              disabled={loading} 
              variant="destructive" 
              className="gap-2 flex-1"
            >
              <Send className="w-4 h-4" />
              Renvoyer à tous (v{terms.version + 1})
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
