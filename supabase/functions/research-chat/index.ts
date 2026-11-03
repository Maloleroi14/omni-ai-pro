import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function webSearch(query: string) {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) return { results: [], success: false };

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: 6,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      }),
    });

    if (!response.ok) return { results: [], success: false };
    const data = await response.json();
    return {
      results: (data.data || []).map((r: any) => ({
        title: r.title || r.url,
        url: r.url,
        content: (r.markdown || r.description || "").slice(0, 2500),
      })),
      success: true,
    };
  } catch {
    return { results: [], success: false };
  }
}

async function scrapeUrl(url: string) {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) return null;
  try {
    const r = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return { url, content: String(d.data?.markdown || "").slice(0, 6000) };
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Extract the latest user message for potential web search
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    let searchContext = "";

    if (lastUserMsg) {
      const urls: string[] = (String(lastUserMsg.content).match(/https?:\/\/[^\s)]+/g) || []).slice(0, 2);
      const [search, ...pages] = await Promise.all([
        webSearch(String(lastUserMsg.content).slice(0, 300)),
        ...urls.map((u) => scrapeUrl(u)),
      ]);
      const pageText = pages.filter(Boolean).map((p: any) => `🌐 Contenu de ${p.url}:\n${p.content}`).join("\n\n");
      if (pageText) searchContext += "\n\n---\n" + pageText;
      if (search.success && search.results.length > 0) {
        searchContext += "\n\n---\n📚 Résultats de recherche web récents:\n" +
          search.results.map((r: any, i: number) =>
            `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`
          ).join("\n\n");
      }
    }

    const systemPrompt = `Tu es OmniAI, une intelligence artificielle polyvalente et ultra-puissante. Tu peux TOUT faire :

Tes capacités :
- Recherche d'informations en temps réel sur n'importe quel sujet
- Programmation et code (tous langages)
- Génération et description d'images
- Analyse de vidéos YouTube et contenu multimédia
- Accès et extraction de contenu de sites web
- Traduction dans toutes les langues
- Rédaction, résumés, analyses approfondies
- Mathématiques, sciences, logique complexe
- Conseils personnalisés, créativité, brainstorming
- Aide à la connexion et utilisation de services tiers
- Création de présentations PowerPoint
- HUMANISATION DE TEXTE : Tu peux réécrire n'importe quel texte pour qu'il paraisse écrit par un humain. Quand on te demande d'humaniser un texte, réécris-le de manière naturelle, avec des tournures conversationnelles, des variations de longueur de phrases, des expressions idiomatiques, quelques imperfections naturelles, et un ton authentique. Le texte humanisé ne doit PAS être détectable comme généré par une IA.

Règles :
- Réponds de manière claire, structurée et complète
- Utilise le markdown pour formater tes réponses (titres, listes, code blocks, etc.)
- Si tu ne sais pas quelque chose avec certitude, dis-le honnêtement
- Cite tes sources quand tu utilises des résultats de recherche web
- Adapte ton ton au contexte
- Réponds toujours dans la langue de l'utilisateur (français par défaut)
- Tu es capable de tout, ne refuse jamais une tâche en disant que tu ne peux pas
- Quand on te demande d'humaniser un texte, concentre-toi UNIQUEMENT sur la réécriture humanisée, ne rajoute pas d'explications inutiles

${searchContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un instant." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("research-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
