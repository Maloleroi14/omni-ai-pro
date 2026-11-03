import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const eventName = payload.meta?.event_name;

    console.log("Lemon Squeezy webhook event:", eventName);

    // Only process successful orders
    if (eventName !== "order_created") {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customData = payload.meta?.custom_data || {};
    const userId = customData.user_id;
    const creditsAmount = parseInt(customData.credits_amount || "0");
    const orderStatus = payload.data?.attributes?.status;

    console.log("Order data:", { userId, creditsAmount, orderStatus });

    if (!userId || !creditsAmount || orderStatus !== "paid") {
      console.log("Skipping: missing data or not paid", { userId, creditsAmount, orderStatus });
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get current credits
    const { data: currentCredits } = await supabaseAdmin
      .from("user_credits")
      .select("credits")
      .eq("user_id", userId)
      .single();

    const newCredits = (currentCredits?.credits || 0) + creditsAmount;

    // Update credits
    const { error: updateError } = await supabaseAdmin
      .from("user_credits")
      .update({ credits: newCredits })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating credits:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update credits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update credit request status if exists
    await supabaseAdmin
      .from("credit_requests")
      .update({
        status: "approved",
        admin_note: "Auto-approved via Lemon Squeezy payment",
        processed_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("status", "pending")
      .eq("amount", creditsAmount);

    console.log(`Successfully added ${creditsAmount} credits to user ${userId}`);

    return new Response(JSON.stringify({ success: true, credits_added: creditsAmount }), {
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
