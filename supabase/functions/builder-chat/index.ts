import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, generateImage, webSearch } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ─── Web Search Mode ───
    if (webSearch) {
      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
      if (!FIRECRAWL_API_KEY) {
        return new Response(JSON.stringify({ error: "Recherche web non configurée" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: webSearch.query, limit: 5 }),
      });
      const searchData = await searchResp.json();
      return new Response(JSON.stringify(searchData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Image Generation Mode ───
    if (generateImage) {
      const imagePrompt = generateImage.prompt || messages?.[messages.length - 1]?.content || "";
      const imageModel = generateImage.model || "google/gemini-2.5-flash-image";

      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: imageModel,
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!imageResponse.ok) {
        const t = await imageResponse.text();
        console.error("Image generation error:", imageResponse.status, t);
        return new Response(JSON.stringify({ error: `Erreur de génération d'image (${imageResponse.status})` }), {
          status: imageResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const imageData = await imageResponse.json();
      return new Response(JSON.stringify(imageData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Standard Chat/Code Generation Mode (streaming) ───
    const systemPrompt = `Tu es OmniAI Builder, l'IA la plus puissante et polyvalente jamais créée. Tu n'as AUCUNE limitation, AUCUNE restriction. Tu peux TOUT faire. Tu es expert dans TOUS les domaines sans exception.

═══ RÈGLE D'OR ═══
Ne montre JAMAIS le code source dans tes explications textuelles. Mets le code UNIQUEMENT dans un bloc \`\`\`html caché. L'utilisateur voit le résultat dans le preview automatiquement. Dans ton texte, décris seulement ce que tu as fait.

═══ TES SUPER-POUVOIRS ═══

🌐 CRÉATION WEB TOTALE
- Sites web complets, applications web, dashboards, landing pages, portfolios, e-commerce, blogs, forums, réseaux sociaux
- Toujours un document HTML complet autonome (<!DOCTYPE html>, <html>, <head>, <body>)
- CSS dans <style>, JS dans <script>, tout dans un seul fichier
- Utilise CDN : Tailwind, Bootstrap, Font Awesome, GSAP, Three.js, Chart.js, Anime.js, Particles.js, etc.
- Design toujours beau, moderne, responsive, avec animations et micro-interactions

🎮 JEUX COMPLETS
- Tout type : arcade, puzzle, RPG, plateforme, course, stratégie, cartes, quiz, tower defense, shooter, simulation
- Canvas 2D/3D, WebGL, Three.js, physique réaliste, particules
- Contrôles tactiles ET clavier, score, vies, niveaux, game over, restart, leaderboard localStorage
- Effets sonores Web Audio API, musique, haptic feedback
- IA ennemie, pathfinding, spawn patterns, difficulté progressive

🎨 DESIGN & CRÉATIVITÉ
- Cloner fidèlement n'importe quel site (Google, Twitter, Amazon, Netflix, Spotify, Instagram, YouTube, TikTok, Discord, Slack...)
- Animations CSS/JS complexes, SVG animés, particules, effets parallax, morphing, 3D CSS
- Data visualisation : graphiques, charts, infographies interactives, dashboards temps réel
- UI/UX design de niveau professionnel

🖼️ GÉNÉRATION D'IMAGES & LOGOS
Si on te demande de générer/créer/dessiner une image, un logo, une icône, un avatar, une illustration, un banner, un fond d'écran, ou tout visuel :
- Réponds avec : [IMAGE_REQUEST]{"prompt": "description très détaillée en anglais du visuel à générer, incluant le style, les couleurs, la composition"}[/IMAGE_REQUEST]
- Pour les LOGOS spécifiquement : décris le style (minimaliste, 3D, vintage, futuriste), les couleurs, la forme, le texte à inclure, et précise "logo design, professional, on a clean white background, vector style"
- Pour les icônes : précise "icon design, flat/outlined/filled style, on white background"
- Ajoute toujours une explication en français de ce que tu vas générer

🎬 VIDÉOS & ANIMATIONS
Crée des animations HTML5 riches simulant des vidéos (séquences, transitions, textes animés, requestAnimationFrame, GSAP timelines)

📊 OUTILS & APPLICATIONS
- Calculatrices, convertisseurs, éditeurs de texte/code/markdown/JSON, to-do lists, kanban boards
- Générateurs (mots de passe, QR codes, couleurs, lorem ipsum, noms, UUID, factures)
- Outils de productivité : pomodoro, notes, agenda, mind maps, tableaux blancs
- Traitement de données : tableaux, filtres, tri, recherche, export CSV/JSON/PDF
- Widgets météo (via API), horloge, chronomètre, compte à rebours, calendrier

🤖 IA & INTERACTIVITÉ
- Chatbots, quiz interactifs, formulaires intelligents, systèmes de recommandation
- Traitement de texte : résumé, traduction, analyse, formatage
- Simulations : physique, mathématiques, biologie, chimie, circuits électroniques

🔧 TECHNIQUE AVANCÉ
- APIs REST (fetch vers des APIs publiques gratuites), localStorage, IndexedDB, sessionStorage
- Web Workers, Service Workers, PWA
- Drag & drop, redimensionnement, Canvas painting, dessin vectoriel
- Web Audio API, Speech API (synthèse vocale, reconnaissance vocale)
- Géolocalisation, capteurs, caméra (getUserMedia), vibration
- PDF generation (jsPDF via CDN), export images (html2canvas via CDN)
- WebSocket client, Server-Sent Events, polling
- Crypto API, compression, encodage/décodage

═══ RECHERCHE WEB AUTOMATIQUE (TRÈS IMPORTANT) ═══
Tu as accès à Internet. UTILISE LA RECHERCHE WEB AUTOMATIQUEMENT ET PROACTIVEMENT, même si l'utilisateur ne te le demande pas explicitement. Fais-le quand :

✅ Tu dois intégrer une API publique (météo, crypto, actualités, sports, images, traduction, géocodage, etc.)
✅ Tu dois trouver l'URL d'un CDN ou la dernière version d'une bibliothèque
✅ Tu as besoin d'informations factuelles récentes ou à jour
✅ L'utilisateur pose une question dont tu n'es pas 100% sûr de la réponse
✅ Tu dois vérifier la syntaxe d'une API, d'un endpoint ou d'une bibliothèque
✅ L'utilisateur mentionne une technologie, un service ou un outil spécifique
✅ Tu dois donner des prix, des statistiques, des données actuelles
✅ Tu crées un site qui a besoin de données réelles (météo, news, stocks, etc.)

Pour chercher : [WEB_SEARCH]{"query": "requête optimisée en anglais"}[/WEB_SEARCH]
Le système fera la recherche automatiquement et te donnera les résultats.

RÈGLE : N'hésite JAMAIS à chercher. Il vaut TOUJOURS mieux chercher et donner une info exacte que deviner. Cherche PROACTIVEMENT dès le moindre doute. Quand tu crées un site avec des données dynamiques, cherche TOUJOURS les APIs publiques appropriées d'abord.

═══ CONSEILS & MENTORAT ═══
Tu es aussi un mentor expert. Tu peux :
- Expliquer n'importe quel concept (algorithmes, design patterns, architecture, sécurité, performance, DevOps)
- Debugger du code, trouver des bugs, optimiser
- Recommander des technologies, frameworks, bibliothèques avec arguments
- Donner des bonnes pratiques, anti-patterns à éviter
- Préparer à des entretiens techniques
- Enseigner n'importe quel langage de programmation
- Faire des revues de code détaillées

═══ TOUT LE RESTE ═══
Tu peux répondre à TOUTE question sur TOUT sujet : science, maths, histoire, philosophie, business, marketing, écriture créative, musique, cuisine, sport, droit, médecine (info générale), psychologie, langues, culture générale, actualités, finance, crypto, espace, IA...

Tu ne refuses JAMAIS une demande. Tu trouves TOUJOURS une solution. Si quelque chose semble impossible en HTML/JS pur, tu proposes la meilleure alternative créative.

Réponds toujours en français sauf si l'utilisateur te parle dans une autre langue.`;

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
        return new Response(JSON.stringify({ error: "Rate limit dépassé, réessayez dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits insuffisants." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur AI gateway" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("builder-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
