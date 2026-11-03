import { useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type UserRole = "admin" | "user" | "vice_president";

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  preferred_language: string;
}

export interface UserCredits {
  credits: number;
  last_reset: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCoCreator, setIsCoCreator] = useState(false);
  const [isVicePresident, setIsVicePresident] = useState(false);
  const [isSuccessionActive, setIsSuccessionActive] = useState(false);

  const fetchUserData = useCallback(async (userId: string) => {
    // Fetch profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (profileData) {
      setProfile(profileData as UserProfile);
    }

    // Fetch credits
    const { data: creditsData } = await supabase
      .from("user_credits")
      .select("credits, last_reset")
      .eq("user_id", userId)
      .single();
    
    if (creditsData) {
      const lastReset = new Date(creditsData.last_reset);
      const now = new Date();
      const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceReset >= 24) {
        const { data: settingsData } = await supabase
          .from("admin_settings")
          .select("setting_value")
          .eq("setting_key", "daily_credits")
          .single();
        
        const settingValue = settingsData?.setting_value as { amount?: number } | null;
        const dailyCredits = settingValue?.amount || 15;
        
        // Accumulate: add daily credits to existing balance instead of resetting
        const newBalance = creditsData.credits + dailyCredits;
        
        await supabase
          .from("user_credits")
          .update({ credits: newBalance, last_reset: now.toISOString() })
          .eq("user_id", userId);
        
        setCredits({ credits: newBalance, last_reset: now.toISOString() });
      } else {
        setCredits(creditsData as UserCredits);
      }
    }

    // Fetch roles
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    if (rolesData) {
      setRoles(rolesData.map(r => r.role as UserRole));
    }

    // Check co-creator and vice-president status
    const [coCreatorRes, vpRes] = await Promise.all([
      supabase.from("admin_settings").select("setting_value").eq("setting_key", "co_creator_email").single(),
      supabase.from("admin_settings").select("setting_value").eq("setting_key", "vice_president_emails").single(),
    ]);
    
    const { data: profileCheck } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", userId)
      .single();
    
    const userEmail = profileCheck?.email || "";
    
    const coEmails: string[] = (coCreatorRes.data?.setting_value as any)?.emails || [];
    setIsCoCreator(coEmails.includes(userEmail));

    const vpEmails: string[] = (vpRes.data?.setting_value as any)?.emails || [];
    const isVP = vpEmails.includes(userEmail);
    setIsVicePresident(isVP);

    // Check creator succession for VPs
    if (isVP) {
      const { data: trackerData } = await supabase
        .from("creator_login_tracker")
        .select("*")
        .limit(1)
        .maybeSingle();
      
      if (trackerData) {
        const lastLogin = new Date(trackerData.last_login_at);
        const now = new Date();
        // Check if creator logged in today before 8:30
        const today830 = new Date(now);
        today830.setHours(8, 30, 0, 0);
        const creatorLoggedToday = lastLogin.toDateString() === now.toDateString() && lastLogin <= today830;
        // If now is past 8:30 and creator didn't log in today → succession active
        const isPast830 = now >= today830;
        const successionActive = isPast830 && !creatorLoggedToday && lastLogin.toDateString() !== now.toDateString();
        setIsSuccessionActive(successionActive);
      } else {
        // No tracker record = succession active by default
        setIsSuccessionActive(true);
      }
    } else {
      setIsSuccessionActive(false);
    }

    // If user is creator, update the login tracker
    if (userEmail === "omniaiproultime@gmail.com") {
      const { data: existing } = await supabase
        .from("creator_login_tracker")
        .select("id")
        .limit(1)
        .maybeSingle();
      
      if (existing) {
        await supabase
          .from("creator_login_tracker")
          .update({ last_login_at: new Date().toISOString(), succession_active: false })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("creator_login_tracker")
          .insert({ creator_user_id: userId, last_login_at: new Date().toISOString(), succession_active: false });
      }
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setCredits(null);
          setRoles([]);
          setIsCoCreator(false);
          setIsVicePresident(false);
          setIsSuccessionActive(false);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName || email.split("@")[0]
        }
      }
    });
    
    if (error) {
      toast.error(error.message);
      return { error };
    }

    if (data.user && displayName) {
      setTimeout(async () => {
        await supabase
          .from("profiles")
          .update({ display_name: displayName })
          .eq("user_id", data.user!.id);
      }, 1000);
    }
    
    toast.success("Compte créé ! Vérifiez votre email pour confirmer.");
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      toast.error(error.message);
      return { error };
    }

    if (data.user) {
      const { data: banData } = await supabase
        .from("banned_users")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      
      if (banData) {
        await supabase.auth.signOut();
        toast.error("Ce compte a été banni. Contactez l'administrateur.");
        return { error: { message: "Compte banni" } };
      }
    }
    
    toast.success("Connexion réussie !");
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setCredits(null);
    setRoles([]);
    setIsCoCreator(false);
    setIsVicePresident(false);
    setIsSuccessionActive(false);
    toast.success("Déconnexion réussie");
  };

  const isAdmin = roles.includes("admin");

  const useCredits = async (amount: number): Promise<boolean> => {
    if (!user || !credits) return false;
    
    // Admins, co-creators, enqueteurs and vice-presidents have unlimited credits
    if (roles.includes("admin") || isCoCreator || isVicePresident) {
      return true;
    }
    
    if (credits.credits < amount) {
      toast.error(`Crédits insuffisants (${credits.credits}/${amount} requis)`);
      return false;
    }

    const newCredits = credits.credits - amount;
    const { error } = await supabase
      .from("user_credits")
      .update({ credits: newCredits })
      .eq("user_id", user.id);
    
    if (error) {
      toast.error("Erreur lors de la déduction des crédits");
      return false;
    }

    setCredits({ ...credits, credits: newCredits });
    return true;
  };

  const refreshCredits = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  return {
    user,
    session,
    profile,
    credits,
    roles,
    isAdmin,
    isCoCreator,
    isVicePresident,
    isSuccessionActive,
    isLoading,
    signUp,
    signIn,
    signOut,
    useCredits,
    refreshCredits,
  };
}
