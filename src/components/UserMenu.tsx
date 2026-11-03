import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { LogOut, Shield, Code, User, LayoutDashboard, Crown, Users, UserPlus, X, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/NotificationBell";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAccountSwitcher } from "@/hooks/useAccountSwitcher";

const CREATOR_EMAIL = "omniaiproultime@gmail.com";

export function UserMenu() {
  const { user, profile, isAdmin, signOut } = useAuthContext();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { linkedAccounts, switchToAccount, removeAccount } = useAccountSwitcher();
  
  const isCreator = user?.email === CREATOR_EMAIL;
  const [isCoCreator, setIsCoCreator] = useState(false);
  const [isVP, setIsVP] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const checkRoles = async () => {
      if (!user?.email || isCreator) return;
      const [coRes, vpRes] = await Promise.all([
        supabase.from("admin_settings").select("setting_value").eq("setting_key", "co_creator_email").single(),
        supabase.from("admin_settings").select("setting_value").eq("setting_key", "vice_president_emails").single(),
      ]);
      const coEmails: string[] = (coRes.data?.setting_value as any)?.emails || [];
      setIsCoCreator(coEmails.includes(user.email!));
      const vpEmails: string[] = (vpRes.data?.setting_value as any)?.emails || [];
      setIsVP(vpEmails.includes(user.email!));
    };
    checkRoles();
  }, [user, isCreator]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar_url").eq("user_id", user.id).single().then(({ data }) => {
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
    });
  }, [user]);

  const hasAdminAccess = isCreator || isCoCreator || isVP;

  const otherAccounts = linkedAccounts.filter(a => a.userId !== user?.id);

  const handleAddAccount = () => {
    // Navigate to auth with flag to add account (not replace)
    navigate("/auth?add_account=true");
  };

  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
        {t("chat.login")}
      </Button>
    );
  }

  const initials = profile?.display_name?.slice(0, 2).toUpperCase() || 
                   user.email?.slice(0, 2).toUpperCase() || "??";

  return (
    <div className="flex items-center gap-1.5">
      <CreditsDisplay />
      <NotificationBell />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="w-8 h-8">
              <AvatarImage src={avatarUrl || undefined} alt="Avatar" />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium">{profile?.display_name || t("menu.user")}</p>
              {isCreator && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                  <Crown className="w-2.5 h-2.5 mr-0.5" />
                  Créateur
                </Badge>
              )}
              {!isCreator && isCoCreator && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
                  <Shield className="w-2.5 h-2.5 mr-0.5" />
                  Co-créateur
                </Badge>
              )}
              {!isCreator && !isCoCreator && isVP && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0">
                  <Shield className="w-2.5 h-2.5 mr-0.5" />
                  Vice-Président
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => navigate("/code-editor")}>
            <Code className="w-4 h-4 mr-2" />
            {t("menu.code_editor")}
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => navigate("/profile")}>
            <User className="w-4 h-4 mr-2" />
            {t("menu.profile")}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => navigate("/dashboard")}>
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Dashboard
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => navigate("/messages")}>
            <MessageCircle className="w-4 h-4 mr-2" />
            Messages
          </DropdownMenuItem>
          
          {hasAdminAccess && (
            <DropdownMenuItem onClick={() => navigate("/admin")}>
              <Shield className="w-4 h-4 mr-2" />
              {t("menu.admin")}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Team / Multi-account section */}
          <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            Team
          </DropdownMenuLabel>

          <DropdownMenuGroup>
            {/* Current account - highlighted */}
            <div className="mx-1 mb-1 px-2 py-1.5 rounded-md bg-accent/50 flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-[9px]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{profile?.display_name || user.email?.split("@")[0]}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 shrink-0">Actif</Badge>
            </div>

            {/* Other linked accounts */}
            {otherAccounts.map((account) => (
              <div
                key={account.userId}
                className="mx-1 mb-0.5 px-2 py-1.5 rounded-md hover:bg-accent flex items-center gap-2 cursor-pointer group"
                onClick={() => switchToAccount(account)}
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={account.avatarUrl || undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-[9px]">
                    {account.displayName?.slice(0, 2).toUpperCase() || account.email.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{account.displayName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{account.email}</p>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAccount(account.userId);
                  }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Add account button */}
            <DropdownMenuItem onClick={handleAddAccount} className="text-xs">
              <UserPlus className="w-4 h-4 mr-2" />
              Ajouter un compte
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
            <LogOut className="w-4 h-4 mr-2" />
            {t("menu.logout")}
          </DropdownMenuItem>

        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
