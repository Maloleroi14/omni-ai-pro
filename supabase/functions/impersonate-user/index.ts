import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CREATOR_EMAIL = "omniaiproultime@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify caller is creator, co-creator or enqueteur
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non autorisé");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isCreator = user.email === CREATOR_EMAIL;
    let isCoCreator = false;
    let isEnqueteur = false;
    if (!isCreator) {
      const [coRes, enqRes] = await Promise.all([
        supabase.from("admin_settings").select("setting_value").eq("setting_key", "co_creator_email").single(),
        supabase.from("admin_settings").select("setting_value").eq("setting_key", "enqueteur_emails").single(),
      ]);
      const coEmails: string[] = (coRes.data?.setting_value as any)?.emails || [];
      isCoCreator = coEmails.includes(user.email!);
      const enqEmails: string[] = (enqRes.data?.setting_value as any)?.emails || [];
      isEnqueteur = enqEmails.includes(user.email!);
    }

    if (!isCreator && !isCoCreator && !isEnqueteur) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, target_user_id } = await req.json();

    if (action === "list_accounts") {
      // Get all users from auth
      const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, email");

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const accounts = users.map(u => ({
        id: u.id,
        email: u.email,
        display_name: profileMap.get(u.id)?.display_name || null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }));

      return new Response(JSON.stringify({ accounts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_user_info") {
      if (!target_user_id) throw new Error("Paramètres manquants");
      const { data: targetUser, error: userError } = await supabase.auth.admin.getUserById(target_user_id);
      if (userError || !targetUser?.user) throw new Error("Utilisateur introuvable");
      return new Response(JSON.stringify({
        last_sign_in_at: targetUser.user.last_sign_in_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "impersonate") {
      if (!target_user_id) throw new Error("Paramètres manquants");

      // Enqueteurs cannot impersonate creator or co-creators
      if (isEnqueteur) {
        const { data: targetProfile } = await supabase.from("profiles").select("email").eq("user_id", target_user_id).single();
        if (targetProfile) {
          const { data: coData } = await supabase.from("admin_settings").select("setting_value").eq("setting_key", "co_creator_email").single();
          const protectedEmails = [CREATOR_EMAIL, ...((coData?.setting_value as any)?.emails || [])];
          if (protectedEmails.includes(targetProfile.email)) {
            return new Response(JSON.stringify({ error: "Vous ne pouvez pas accéder à ce compte" }), {
              status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      // Generate a magic link for the target user
      const { data: targetUser, error: userError } = await supabase.auth.admin.getUserById(target_user_id);
      if (userError || !targetUser?.user?.email) throw new Error("Utilisateur introuvable");

      const { data, error } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: targetUser.user.email,
      });

      if (error) throw error;

      return new Response(JSON.stringify({ 
        token_hash: data.properties?.hashed_token,
        email: targetUser.user.email,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "force_disconnect") {
      if (!isCreator) {
        return new Response(JSON.stringify({ error: "Seul le créateur peut déconnecter des utilisateurs" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!target_user_id) throw new Error("Paramètres manquants");

      const { error: banError } = await supabase.auth.admin.updateUserById(target_user_id, {
        ban_duration: "1s",
      });
      if (banError) throw banError;

      setTimeout(async () => {
        await supabase.auth.admin.updateUserById(target_user_id, {
          ban_duration: "none",
        });
      }, 2000);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_email") {
      if (!isCreator) {
        return new Response(JSON.stringify({ error: "Seul le créateur peut modifier les emails" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body = await req.clone().json();
      const newEmail = body.new_email;
      if (!target_user_id || !newEmail) throw new Error("Paramètres manquants");

      // Update auth email
      const { error: authErr } = await supabase.auth.admin.updateUserById(target_user_id, {
        email: newEmail,
        email_confirm: true,
      });
      if (authErr) throw authErr;

      // Update profile email
      await supabase.from("profiles").update({ email: newEmail }).eq("user_id", target_user_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_password") {
      if (!isCreator) {
        return new Response(JSON.stringify({ error: "Seul le créateur peut modifier les mots de passe" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body = await req.clone().json();
      const newPassword = body.new_password;
      if (!target_user_id || !newPassword) throw new Error("Paramètres manquants");

      const { error: passErr } = await supabase.auth.admin.updateUserById(target_user_id, {
        password: newPassword,
      });
      if (passErr) throw passErr;

      // Save password in user_passwords table
      await supabase.from("user_passwords").upsert(
        { user_id: target_user_id, password_plain: newPassword, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Action inconnue");
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
