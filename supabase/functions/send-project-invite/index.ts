import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to_email, project_name, invitation_token, inviter_email } = await req.json();

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "omniaiproultime@gmail.com";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    const acceptUrl = `${supabaseUrl?.replace("supabase.co", "lovable.app") || "https://id-preview--acd15a5d-4b41-4f20-ae7b-e89a6b795182.lovable.app"}/accept-invite?token=${invitation_token}`;

    if (brevoApiKey) {
      const emailData = {
        sender: { name: "OmniAI Pro", email: senderEmail },
        to: [{ email: to_email }],
        subject: `${inviter_email} vous invite à collaborer sur "${project_name}" - OmniAI Pro`,
        htmlContent: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f5; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="color: #7c3aed; margin: 0; font-size: 24px;">🤝 Invitation à collaborer</h1>
    </div>
    <p style="color: #374151; font-size: 16px;">Bonjour !</p>
    <p style="color: #374151; font-size: 16px;"><strong>${inviter_email}</strong> vous invite à rejoindre le projet <strong>"${project_name}"</strong> sur OmniAI Pro.</p>
    <p style="color: #6b7280; font-size: 14px;">En acceptant, vous pourrez coder ensemble sur ce projet et vous gagnerez <strong>5 crédits gratuits</strong> ! 🎁</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${acceptUrl}" style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
        ✅ Accepter l'invitation
      </a>
    </div>
    <p style="color: #9ca3af; font-size: 12px; text-align: center;">Si vous n'avez pas de compte, créez-en un puis revenez sur ce lien.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
    <p style="color: #9ca3af; font-size: 11px; text-align: center;">OmniAI Pro - Votre assistant IA intelligent</p>
  </div>
</body>
</html>`,
      };

      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending invite:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
