import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_AMOUNTS: Record<number, string> = {
  5: "Starter",
  20: "Pro",
  50: "Ultime",
};

function buildPurchaseConfirmationHtml(name: string, planName: string, price: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;background:#f9f9f9;padding:40px 20px;">
<div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;padding:30px;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
  <h1 style="color:#7c3aed;font-size:22px;margin:0 0 10px;">🎉 Merci pour votre achat !</h1>
  <p style="color:#333;font-size:15px;">Bonjour <strong>${name}</strong>,</p>
  <p style="color:#555;font-size:14px;line-height:1.6;">Votre abonnement <strong style="color:#7c3aed;">${planName}</strong> a été activé avec succès.</p>
  <div style="background:#f3f0ff;border-radius:8px;padding:15px;margin:20px 0;">
    <p style="margin:0;font-size:14px;color:#555;">💳 <strong>Plan :</strong> ${planName}</p>
    <p style="margin:5px 0 0;font-size:14px;color:#555;">💰 <strong>Montant :</strong> ${price} CHF/mois</p>
  </div>
  <p style="color:#555;font-size:14px;">Profitez de toutes les fonctionnalités premium dès maintenant !</p>
  <p style="color:#999;font-size:12px;margin-top:30px;">— L'équipe Omni AI Pro</p>
</div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log("PayFlow webhook received:", JSON.stringify(payload));

    const email = payload.email || payload.payer_email || payload.customer_email || payload.buyer_email;
    const status = payload.status || payload.payment_status || payload.event;
    const amount = Number(payload.amount) || 0;

    const AMOUNT_TO_CREDITS: Record<number, number> = { 0.5: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8 };
    const quantity = payload.quantity || payload.qty || payload.credits || AMOUNT_TO_CREDITS[amount] || 1;
    console.log(`Resolved quantity: ${quantity} (from amount: ${amount}, explicit qty fields: ${payload.quantity || payload.qty || 'none'})`);

    if (!email) {
      console.error("No email in webhook payload:", payload);
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (status && !["success", "completed", "paid", "approved", "payment.completed"].includes(status.toLowerCase())) {
      console.log("Payment not successful, status:", status);
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .eq("email", email)
      .maybeSingle();

    if (!profile) {
      console.error("No user found for email:", email);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Detect if this is a subscription purchase
    const planName = PLAN_AMOUNTS[amount];
    const isSubscription = !!planName;

    // Add credits to user
    const { data: currentCredits } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", profile.user_id)
      .maybeSingle();

    const newCredits = (currentCredits?.credits || 0) + Number(quantity);

    const { error: updateError } = await supabase
      .from("user_credits")
      .update({ credits: newCredits })
      .eq("user_id", profile.user_id);

    if (updateError) {
      console.error("Error updating credits:", updateError);
      throw updateError;
    }

    console.log(`Added ${quantity} credits to ${email}. New total: ${newCredits}`);

    // If subscription purchase: send confirmation email + admin notification
    if (isSubscription) {
      const displayName = profile.display_name || email.split("@")[0];

      // Send confirmation email to buyer
      try {
        await supabase.functions.invoke("send-brevo-email", {
          body: {
            to: email,
            toName: displayName,
            subject: `✅ Abonnement ${planName} activé — Omni AI Pro`,
            html: buildPurchaseConfirmationHtml(displayName, planName, String(amount)),
            senderName: "Omni AI Pro",
            templateName: "subscription_confirmation",
          },
        });
        console.log(`Confirmation email sent to ${email} for plan ${planName}`);
      } catch (emailErr) {
        console.error("Failed to send confirmation email:", emailErr);
      }

      // Create admin notification
      try {
        await supabase.from("admin_notifications").insert({
          type: "subscription_purchase",
          title: `💎 Nouvel abonnement ${planName}`,
          message: `${displayName} (${email}) a souscrit au plan ${planName} (${amount} CHF/mois)`,
          metadata: { user_id: profile.user_id, email, plan: planName, amount },
        });
        console.log(`Admin notification created for ${planName} purchase by ${email}`);
      } catch (notifErr) {
        console.error("Failed to create admin notification:", notifErr);
      }
    }

    return new Response(JSON.stringify({ success: true, credits_added: quantity, new_total: newCredits, plan: planName || null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
