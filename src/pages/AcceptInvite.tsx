import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, Code } from "lucide-react";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading, refreshCredits } = useAuthContext();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "login_required">("loading");
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setStatus("login_required");
      return;
    }
    if (token) acceptInvitation();
  }, [user, isLoading, token]);

  const acceptInvitation = async () => {
    if (!user || !token) return;
    setStatus("loading");

    try {
      // Find the invitation
      const { data: invitation, error: findError } = await supabase
        .from("project_invitations")
        .select("*, user_projects(name)")
        .eq("invitation_token", token)
        .eq("status", "pending")
        .single();

      if (findError || !invitation) {
        setStatus("error");
        return;
      }

      setProjectName((invitation as any).user_projects?.name || "Projet");

      // Update invitation status
      await supabase
        .from("project_invitations")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", invitation.id);

      // Add as collaborator
      await supabase
        .from("project_collaborators")
        .insert({
          project_id: invitation.project_id,
          user_id: user.id,
        });

      // Award 5 credits to the accepted user
      const { data: currentCredits } = await supabase
        .from("user_credits")
        .select("credits")
        .eq("user_id", user.id)
        .single();

      if (currentCredits) {
        await supabase
          .from("user_credits")
          .update({ credits: currentCredits.credits + 5 })
          .eq("user_id", user.id);
        await refreshCredits();
      }

      setStatus("success");
      toast.success("Invitation acceptée ! +5 crédits gagnés 🎁");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Code className="w-6 h-6 text-primary" />
            Invitation de projet
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Traitement de l'invitation...</p>
            </>
          )}
          {status === "login_required" && (
            <>
              <XCircle className="w-12 h-12 text-amber-500 mx-auto" />
              <p>Vous devez être connecté pour accepter cette invitation.</p>
              <Button onClick={() => navigate(`/auth?redirect=/accept-invite?token=${token}`)}>
                Se connecter
              </Button>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-lg font-medium">Bienvenue sur "{projectName}" !</p>
              <p className="text-muted-foreground text-sm">Vous avez gagné 5 crédits bonus 🎁</p>
              <Button onClick={() => navigate("/code-editor")} className="w-full">
                Ouvrir l'éditeur de code
              </Button>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 text-destructive mx-auto" />
              <p>Cette invitation est invalide ou a déjà été utilisée.</p>
              <Button variant="outline" onClick={() => navigate("/")}>
                Retour à l'accueil
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
