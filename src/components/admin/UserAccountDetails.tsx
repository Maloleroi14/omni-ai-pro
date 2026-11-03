import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  User, Coins, Shield, Brain, FolderCode, MessageSquare, 
  Calendar, Mail, Hash, Clock, Gift, Loader2, RefreshCw 
} from "lucide-react";

interface UserAccountDetailsProps {
  userId: string;
  onCreditsChange?: (newCredits: number) => void;
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

interface UserCredits {
  credits: number;
  last_reset: string;
  created_at: string;
}

interface UserRole {
  id: string;
  role: "admin" | "user" | "vice_president";
}

interface UserMemory {
  id: string;
  memory_key: string;
  memory_value: string;
  importance: number | null;
  context: string | null;
  created_at: string;
}

interface UserProject {
  id: string;
  name: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface UserConversation {
  id: string;
  title: string;
  type: string;
  is_global: boolean;
  created_at: string;
  message_count?: number;
}

export function UserAccountDetails({ userId, onCreditsChange }: UserAccountDetailsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [conversations, setConversations] = useState<UserConversation[]>([]);
  const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);
  const [creditsToAdd, setCreditsToAdd] = useState(10);
  const [isAddingCredits, setIsAddingCredits] = useState(false);

  const loadAllUserData = async () => {
    setIsLoading(true);
    
    try {
      // Load all data in parallel
      const [
        profileRes,
        creditsRes,
        rolesRes,
        memoriesRes,
        projectsRes,
        conversationsRes,
        userInfoRes
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("user_credits").select("*").eq("user_id", userId).single(),
        supabase.from("user_roles").select("*").eq("user_id", userId),
        supabase.from("user_memories").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("user_projects").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("conversations").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        (async () => {
          const { data: { session } } = await supabase.auth.getSession();
          const { data } = await supabase.functions.invoke("impersonate-user", {
            body: { action: "get_user_info", target_user_id: userId },
            headers: { Authorization: `Bearer ${session?.access_token}` },
          });
          return data;
        })()
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (creditsRes.data) setCredits(creditsRes.data);
      if (rolesRes.data) setRoles(rolesRes.data);
      if (memoriesRes.data) setMemories(memoriesRes.data);
      if (projectsRes.data) setProjects(projectsRes.data);
      if (userInfoRes?.last_sign_in_at) setLastSignInAt(userInfoRes.last_sign_in_at);
      if (conversationsRes.data) {
        // Get message count for each conversation
        const convsWithCounts = await Promise.all(
          conversationsRes.data.map(async (conv) => {
            const { count } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", conv.id);
            return { ...conv, message_count: count || 0 };
          })
        );
        setConversations(convsWithCounts);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadAllUserData();
    }
  }, [userId]);

  const addCredits = async () => {
    if (!credits || creditsToAdd <= 0) return;
    
    setIsAddingCredits(true);
    const newCredits = credits.credits + creditsToAdd;
    
    const { error } = await supabase
      .from("user_credits")
      .update({ credits: newCredits })
      .eq("user_id", userId);
    
    if (!error) {
      setCredits({ ...credits, credits: newCredits });
      onCreditsChange?.(newCredits);
      toast.success(`${creditsToAdd} crédits ajoutés`);
    } else {
      toast.error("Erreur lors de l'ajout des crédits");
    }
    
    setIsAddingCredits(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Profil non trouvé
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-4">
        {/* Refresh button */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={loadAllUserData} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </Button>
        </div>

        {/* Profile Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4" />
              Profil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{profile.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>{profile.display_name || "Sans pseudo"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <code className="text-xs bg-muted px-2 py-1 rounded">{profile.user_id}</code>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Inscrit le {formatDate(profile.created_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Dernière connexion : {lastSignInAt ? formatDate(lastSignInAt) : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Credits */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Coins className="w-4 h-4" />
              Crédits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {credits ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">{credits.credits}</span>
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Dernier reset : {formatDate(credits.last_reset)}
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs">Ajouter des crédits</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={creditsToAdd}
                      onChange={(e) => setCreditsToAdd(parseInt(e.target.value) || 0)}
                      className="h-8"
                    />
                    <Button 
                      size="sm" 
                      onClick={addCredits} 
                      disabled={isAddingCredits || creditsToAdd <= 0}
                      className="gap-1"
                    >
                      {isAddingCredits ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gift className="w-3 h-3" />}
                      Ajouter
                    </Button>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {[5, 10, 25, 50, 100].map((amount) => (
                      <Button 
                        key={amount}
                        variant="outline" 
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => setCreditsToAdd(amount)}
                      >
                        +{amount}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <span className="text-muted-foreground">Aucun crédit</span>
            )}
          </CardContent>
        </Card>

        {/* Roles */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Rôles ({roles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {roles.length > 0 ? (
                roles.map((role) => (
                  <Badge 
                    key={role.id} 
                    variant={role.role === "admin" ? "destructive" : "secondary"}
                  >
                    {role.role === "admin" ? "Administrateur" : "Utilisateur"}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-sm">Aucun rôle</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Memories */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Mémoires IA ({memories.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {memories.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {memories.map((memory) => (
                  <div key={memory.id} className="p-2 bg-muted rounded text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{memory.memory_key}</span>
                      {memory.importance && (
                        <Badge variant="outline" className="text-xs h-5">
                          Importance: {memory.importance}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1">{memory.memory_value}</p>
                    {memory.context && (
                      <p className="text-muted-foreground/60 mt-1 italic">"{memory.context}"</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">Aucune mémoire</span>
            )}
          </CardContent>
        </Card>

        {/* Projects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FolderCode className="w-4 h-4" />
              Projets ({projects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                    <span className="font-medium">{project.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={project.is_published ? "default" : "outline"} className="text-xs h-5">
                        {project.is_published ? "Publié" : "Brouillon"}
                      </Badge>
                      <span className="text-muted-foreground">{formatDate(project.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">Aucun projet</span>
            )}
          </CardContent>
        </Card>

        {/* Conversations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Conversations ({conversations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {conversations.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {conversations.map((conv) => (
                  <div key={conv.id} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                    <div>
                      <span className="font-medium">{conv.title}</span>
                      <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                        <Badge variant="outline" className="text-xs h-5">{conv.type}</Badge>
                        {conv.is_global && <Badge variant="secondary" className="text-xs h-5">Global</Badge>}
                        <span>{conv.message_count} messages</span>
                      </div>
                    </div>
                    <span className="text-muted-foreground">{formatDate(conv.created_at)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm">Aucune conversation</span>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
