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

    // Verify caller is creator or co-creator
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

    // Check if co-creator or enqueteur
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

    const { action, target_user_id, amount } = await req.json();

    // Co-creators can only list_users, add_credits, set_credits
    const coCreatorAllowed = ["list_users", "add_credits", "set_credits"];
    if (isCoCreator && !coCreatorAllowed.includes(action)) {
      return new Response(JSON.stringify({ error: "Action non autorisée pour les co-créateurs" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enqueteurs: same as co-creators but also cannot ban/unban/delete/approve purchases
    const enqueteurAllowed = ["list_users", "add_credits", "set_credits", "list_bans"];
    if (isEnqueteur && !enqueteurAllowed.includes(action)) {
      return new Response(JSON.stringify({ error: "Action non autorisée pour les enquêteurs" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_users") {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, display_name");
      
      const { data: credits } = await supabase
        .from("user_credits")
        .select("user_id, credits");
      
      const creditsMap = new Map(credits?.map(c => [c.user_id, c.credits]) || []);
      
      const users = profiles?.map(p => ({
        user_id: p.user_id,
        email: p.email,
        display_name: p.display_name,
        credits: creditsMap.get(p.user_id) ?? 0,
      })) || [];

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_credits") {
      if (!target_user_id || amount === undefined) {
        throw new Error("Paramètres manquants");
      }

      // Co-creators cannot remove unlimited from creator or other co-creators
      if ((isCoCreator || isEnqueteur) && amount !== -1) {
        // Check if target is creator or co-creator
        const { data: targetProfile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", target_user_id)
          .single();

        if (targetProfile) {
          const targetEmail = targetProfile.email;
          if (targetEmail === CREATOR_EMAIL) {
            return new Response(JSON.stringify({ error: "Vous ne pouvez pas modifier les crédits du créateur" }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          const { data: coCreatorData } = await supabase
            .from("admin_settings")
            .select("setting_value")
            .eq("setting_key", "co_creator_email")
            .single();
          const coEmails: string[] = (coCreatorData?.setting_value as any)?.emails || [];
          if (coEmails.includes(targetEmail)) {
            return new Response(JSON.stringify({ error: "Vous ne pouvez pas modifier les crédits d'un co-créateur" }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      // amount = -1 means unlimited (we'll use a very large number)
      const creditValue = amount === -1 ? 999999 : Number(amount);

      const { error } = await supabase
        .from("user_credits")
        .update({ credits: creditValue })
        .eq("user_id", target_user_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, credits: creditValue }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "add_credits") {
      if (!target_user_id || !amount) {
        throw new Error("Paramètres manquants");
      }

      // Get current credits
      const { data: current } = await supabase
        .from("user_credits")
        .select("credits")
        .eq("user_id", target_user_id)
        .single();

      const newCredits = (current?.credits || 0) + Number(amount);

      const { error } = await supabase
        .from("user_credits")
        .update({ credits: newCredits })
        .eq("user_id", target_user_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, credits: newCredits }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ban_user") {
      if (!target_user_id) throw new Error("Paramètres manquants");
      
      const { error } = await supabase
        .from("banned_users")
        .upsert({ user_id: target_user_id, banned_by: user.id, reason: "Banni par l'administrateur" }, { onConflict: "user_id" });
      
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "unban_user") {
      if (!target_user_id) throw new Error("Paramètres manquants");
      
      const { error } = await supabase
        .from("banned_users")
        .delete()
        .eq("user_id", target_user_id);
      
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_bans") {
      const { data } = await supabase
        .from("banned_users")
        .select("user_id, banned_at, reason");
      
      return new Response(JSON.stringify({ bans: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      if (!target_user_id) throw new Error("Paramètres manquants");

      // Delete all user data from public tables
      await supabase.from("messages").delete().eq("user_id", target_user_id);
      await supabase.from("conversations").delete().eq("user_id", target_user_id);
      await supabase.from("user_memories").delete().eq("user_id", target_user_id);
      await supabase.from("user_projects").delete().eq("user_id", target_user_id);
      await supabase.from("message_reactions").delete().eq("user_id", target_user_id);
      await supabase.from("user_credits").delete().eq("user_id", target_user_id);
      await supabase.from("user_roles").delete().eq("user_id", target_user_id);
      await supabase.from("banned_users").delete().eq("user_id", target_user_id);
      await supabase.from("device_blocks").delete().eq("user_id", target_user_id);
      await supabase.from("profiles").delete().eq("user_id", target_user_id);

      // Delete the auth user
      const { error: deleteError } = await supabase.auth.admin.deleteUser(target_user_id);
      if (deleteError) throw deleteError;

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
