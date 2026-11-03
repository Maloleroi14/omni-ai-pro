import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MASTER_CODE = "1595";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory rate limiter: IP+slug → { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000; // 1 minute
const BLOCK_MS = 300_000; // 5 minutes after exceeding limit

function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (entry && now < entry.resetAt && entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  entry.count++;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.resetAt = now + BLOCK_MS; // extend window on block
  }
  return { allowed: true };
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now >= entry.resetAt) rateLimitMap.delete(key);
  }
}, 300_000);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { slug, result, fullCalc } = await req.json();

    if (!slug) {
      return new Response(JSON.stringify({ error: "Missing slug" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rateLimitKey = `${clientIp}:${slug}`;
    const { allowed, retryAfter } = checkRateLimit(rateLimitKey);

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Too many attempts", retryAfter }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
          },
        }
      );
    }

    // Check master code first (server-side only)
    if (String(result) === MASTER_CODE) {
      return new Response(JSON.stringify({ unlocked: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check project-specific lock code
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: project } = await supabase
      .from("user_projects")
      .select("lock_code")
      .eq("published_url", `${slug}.omni-ai-pro.com`)
      .eq("is_locked", true)
      .maybeSingle();

    if (!project) {
      return new Response(JSON.stringify({ unlocked: false, error: "Not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const unlocked = fullCalc === project.lock_code;

    return new Response(JSON.stringify({ unlocked }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
