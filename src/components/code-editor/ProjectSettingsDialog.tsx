import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings, UserPlus, Users, Eye, Clock, Loader2, Trash2, Send, Gift } from "lucide-react";

interface ProjectSettingsDialogProps {
  projectId: string;
  projectName: string;
}

interface Invitation {
  id: string;
  invited_email: string;
  status: string;
  created_at: string;
}

interface Collaborator {
  id: string;
  user_id: string;
  added_at: string;
  profile?: { email: string; display_name: string | null };
}

interface VisitStats {
  total_visits: number;
  today_visits: number;
  avg_duration: number;
}

export function ProjectSettingsDialog({ projectId, projectName }: ProjectSettingsDialogProps) {
  const { user, refreshCredits } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [visitStats, setVisitStats] = useState<VisitStats>({ total_visits: 0, today_visits: 0, avg_duration: 0 });

  useEffect(() => {
    if (open && projectId) {
      loadInvitations();
      loadCollaborators();
      loadVisitStats();
    }
  }, [open, projectId]);

  const loadInvitations = async () => {
    const { data } = await supabase
      .from("project_invitations")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (data) setInvitations(data);
  };

  const loadCollaborators = async () => {
    const { data } = await supabase
      .from("project_collaborators")
      .select("id, user_id, added_at")
      .eq("project_id", projectId);
    
    if (data && data.length > 0) {
      const userIds = data.map(c => c.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .in("user_id", userIds);
      
      const enriched = data.map(c => ({
        ...c,
        profile: profiles?.find(p => p.user_id === c.user_id)
      }));
      setCollaborators(enriched);
    } else {
      setCollaborators([]);
    }
  };

  const loadVisitStats = async () => {
    const { data: allVisits } = await supabase
      .from("project_visits")
      .select("visited_at, duration_seconds")
      .eq("project_id", projectId);
    
    if (allVisits) {
      const today = new Date().toISOString().split("T")[0];
      const todayVisits = allVisits.filter(v => v.visited_at?.startsWith(today));
      const avgDuration = allVisits.length > 0
        ? Math.round(allVisits.reduce((sum, v) => sum + (v.duration_seconds || 0), 0) / allVisits.length)
        : 0;
      
      setVisitStats({
        total_visits: allVisits.length,
        today_visits: todayVisits.length,
        avg_duration: avgDuration,
      });
    }
  };

  const sendInvitation = async () => {
    if (!inviteEmail.trim() || !user) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error("Email invalide");
      return;
    }

    setIsSending(true);
    try {
      // Create invitation
      const { data: invitation, error } = await supabase
        .from("project_invitations")
        .insert({
          project_id: projectId,
          invited_by: user.id,
          invited_email: inviteEmail.trim().toLowerCase(),
        })
        .select()
        .single();

      if (error) throw error;

      // Send email via edge function
      await supabase.functions.invoke("send-project-invite", {
        body: {
          to_email: inviteEmail.trim().toLowerCase(),
          project_name: projectName,
          invitation_token: invitation.invitation_token,
          inviter_email: user.email,
        },
      });

      // Award 5 credits to inviter
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

      toast.success(`Invitation envoyée à ${inviteEmail} ! +5 crédits gagnés 🎁`);
      setInviteEmail("");
      loadInvitations();
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur lors de l'envoi de l'invitation");
    } finally {
      setIsSending(false);
    }
  };

  const removeCollaborator = async (collabId: string) => {
    await supabase.from("project_collaborators").delete().eq("id", collabId);
    toast.success("Collaborateur retiré");
    loadCollaborators();
  };

  const cancelInvitation = async (inviteId: string) => {
    await supabase.from("project_invitations").delete().eq("id", inviteId);
    toast.success("Invitation annulée");
    loadInvitations();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Paramètres du projet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Visit Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Statistiques de visites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-primary">{visitStats.total_visits}</p>
                  <p className="text-xs text-muted-foreground">Visites totales</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-primary">{visitStats.today_visits}</p>
                  <p className="text-xs text-muted-foreground">Aujourd'hui</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                    <Clock className="w-4 h-4" />
                    {visitStats.avg_duration}s
                  </p>
                  <p className="text-xs text-muted-foreground">Durée moy.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invite Collaborator */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Inviter un collaborateur
                <Badge variant="secondary" className="text-[10px]">
                  <Gift className="w-3 h-3 mr-1" />+5 crédits
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Invitez quelqu'un à coder avec vous sur ce projet. Vous gagnez tous les deux 5 crédits !
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="email@exemple.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendInvitation()}
                  type="email"
                />
                <Button onClick={sendInvitation} disabled={isSending} size="sm">
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>

              {/* Pending Invitations */}
              {invitations.filter(i => i.status === "pending").length > 0 && (
                <div className="space-y-2 pt-2">
                  <Label className="text-xs text-muted-foreground">Invitations en attente</Label>
                  {invitations.filter(i => i.status === "pending").map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-md px-3 py-2">
                      <span className="truncate">{inv.invited_email}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">En attente</Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => cancelInvitation(inv.id)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Collaborators */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                Collaborateurs ({collaborators.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {collaborators.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun collaborateur pour le moment
                </p>
              ) : (
                <div className="space-y-2">
                  {collaborators.map((collab) => (
                    <div key={collab.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-md px-3 py-2">
                      <div>
                        <p className="font-medium">{collab.profile?.display_name || "Utilisateur"}</p>
                        <p className="text-xs text-muted-foreground">{collab.profile?.email}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCollaborator(collab.id)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
