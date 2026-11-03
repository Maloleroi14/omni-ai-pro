import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reason, user_email, incident_type } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Activate maintenance mode
    const maintenanceMessage = `🔒 Maintenance automatique activée — Activité suspecte détectée (${incident_type})`;

    const { data: existing } = await supabase
      .from("admin_settings")
      .select("id")
      .eq("setting_key", "maintenance_mode")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("admin_settings")
        .update({
          setting_value: {
            enabled: true,
            message: maintenanceMessage,
            show_countdown: false,
            end_date: null,
            auto_triggered: true,
            trigger_reason: reason,
            triggered_at: new Date().toISOString(),
          },
        })
        .eq("setting_key", "maintenance_mode");
    } else {
      await supabase.from("admin_settings").insert({
        setting_key: "maintenance_mode",
        setting_value: {
          enabled: true,
          message: maintenanceMessage,
          show_countdown: false,
          end_date: null,
          auto_triggered: true,
          trigger_reason: reason,
          triggered_at: new Date().toISOString(),
        },
      });
    }

    // Create admin notification
    await supabase.from("admin_notifications").insert({
      type: "security_alert",
      title: "⚠️ Maintenance auto-activée",
      message: `Activité suspecte détectée: ${reason}. Utilisateur: ${user_email || "inconnu"}. Type: ${incident_type}`,
      metadata: { reason, user_email, incident_type, triggered_at: new Date().toISOString() },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
