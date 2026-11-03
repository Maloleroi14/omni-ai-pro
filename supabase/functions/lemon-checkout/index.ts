import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { userId, userEmail, amount } = await req.json();

    if (!userId || !userEmail || !amount) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LEMONSQUEEZY_API_KEY");
    const variantId = Deno.env.get("LEMONSQUEEZY_VARIANT_ID");

    if (!apiKey || !variantId) {
      return new Response(JSON.stringify({ error: "Lemon Squeezy not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a checkout via Lemon Squeezy API
    const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            custom_price: amount * 50, // price in cents (0.50 CHF per credit)
            product_options: {
              enabled_variants: [parseInt(variantId)],
              name: `${amount} crédits OmniAI`,
              description: `Achat de ${amount} crédits pour OmniAI Pro`,
            },
            checkout_options: {
              embed: false,
              media: false,
            },
            checkout_data: {
              custom: {
                user_id: userId,
                user_email: userEmail,
                credits_amount: String(amount),
              },
            },
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: Deno.env.get("LEMONSQUEEZY_STORE_ID") || "1",
              },
            },
            variant: {
              data: {
                type: "variants",
                id: variantId,
              },
            },
          },
        },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Lemon Squeezy error:", JSON.stringify(result));
      return new Response(JSON.stringify({ error: "Failed to create checkout", details: result }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checkoutUrl = result.data?.attributes?.url;

    return new Response(JSON.stringify({ url: checkoutUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
