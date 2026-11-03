import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseKey);
}

// Smart web search function - searches the internet when needed
async function smartWebSearch(query: string): Promise<{ results: Array<{ title: string; url: string; content: string }>; success: boolean }> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  
  if (!FIRECRAWL_API_KEY) {
    console.log("FIRECRAWL_API_KEY not available, skipping web search");
    return { results: [], success: false };
  }

  try {
    console.log("Searching web for:", query);
    const startTime = Date.now();
    
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: 5,
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
        },
      }),
    });

    if (!response.ok) {
      console.error("Firecrawl search failed:", response.status);
      return { results: [], success: false };
    }

    const data = await response.json();
    const results = (data.data || []).map((r: any) => ({
      title: r.title || r.url,
      url: r.url,
      content: (r.markdown || r.description || "").slice(0, 2000), // Limit content size
    }));

    console.log(`Web search completed in ${Date.now() - startTime}ms, found ${results.length} results`);
    return { results, success: true };
  } catch (e) {
    console.error("Web search error:", e);
    return { results: [], success: false };
  }
}

// Detect if the question needs web search (factual, current events, specific info)
function needsWebSearch(message: string): { needs: boolean; searchQuery: string } {
  const lowerMessage = message.toLowerCase();
  
  // Patterns that strongly suggest needing current/factual information
  const webSearchPatterns = [
    // Current events & news
    /(?:actualit[ée]|news|r[ée]cent|nouveau|dernier|aujourd'hui|cette semaine|ce mois)/i,
    /(?:what|quoi|qui|quel|quelle).*(?:est|are|is).*(?:le prix|the price|le score|coût|cost)/i,
    
    // Factual questions about real things
    /(?:combien|how much|how many).*(?:co[uû]te|coût|habitants|population|km|kilom[èe]tre)/i,
    /(?:qui est|who is|qui a|who has).*(?:le pr[ée]sident|the president|le ceo|founder|fondateur)/i,
    /(?:o[ùu] est|where is|o[ùu] se trouve)/i,
    
    // Specific factual lookups
    /(?:wikipedia|wiki|d[ée]finition de|definition of)/i,
    /(?:horaires?|schedule|prix de?|price of|tarif)/i,
    /(?:statistiques?|statistics|donn[ée]es sur|data on|data about)/i,
    
    // Sports, stocks, specific current info
    /(?:score|match|football|r[ée]sultat|bourse|stock|action|crypto|bitcoin|ethereum)/i,
    /(?:m[ée]t[ée]o demain|weather tomorrow|pr[ée]vision|forecast)/i,
    
    // Explicit search requests
    /(?:cherche|search|trouve|find|recherche).*(?:sur internet|online|web|google)/i,
    /(?:c'est quoi|what is|qu'est-ce que?).*(?:le|la|un|une|l')/i,
    
    // Product/company info
    /(?:iphone|samsung|tesla|amazon|google|microsoft|apple|nvidia)/i,
    /(?:sortie|release|lancement|launch|annonce|announcement)/i,
    
    // Historical facts with dates
    /(?:en quelle ann[ée]e|what year|quand est|when was|when did)/i,
    
    // Comparisons needing facts
    /(?:diff[ée]rence entre|difference between|comparaison|compare|vs\.?|versus)/i,
  ];

  // Check if message matches any pattern
  for (const pattern of webSearchPatterns) {
    if (pattern.test(lowerMessage)) {
      // Extract or create a good search query
      let searchQuery = message;
      
      // Clean up the query for better search results
      searchQuery = searchQuery
        .replace(/(?:dis-moi|tell me|explique|explain|peux-tu|can you|je veux savoir|I want to know)/gi, "")
        .replace(/(?:s'il te pla[iî]t|please|svp|stp)/gi, "")
        .trim();
      
      // Add current year for time-sensitive queries
      if (/(?:actuel|current|maintenant|now|aujourd'hui|today|r[ée]cent|recent)/i.test(lowerMessage)) {
        const year = new Date().getFullYear();
        if (!searchQuery.includes(year.toString())) {
          searchQuery += ` ${year}`;
        }
      }
      
      return { needs: true, searchQuery };
    }
  }

  // Check for questions that typically need external knowledge
  const questionWords = /^(?:qui|quoi|que|quel|quelle|quels|quelles|combien|o[ùu]|quand|pourquoi|comment|what|who|where|when|why|how|which)/i;
  const hasSpecificEntity = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/.test(message); // Proper nouns
  
  if (questionWords.test(lowerMessage) && hasSpecificEntity && message.length > 20) {
    return { needs: true, searchQuery: message };
  }

  return { needs: false, searchQuery: "" };
}

// Helper to check for blocked words in message (fuzzy + synonym matching via AI)
async function checkBlockedWords(message: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data: blockedFeatures } = await supabase
      .from("blocked_features")
      .select("feature_name")
      .eq("is_blocked", true);

    if (!blockedFeatures || blockedFeatures.length === 0) {
      return null;
    }

    const lowerMessage = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Step 1: Quick exact-word-boundary check first (no root matching to avoid false positives)
    for (const feature of blockedFeatures) {
      const word = feature.feature_name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Strict word boundary match - must be a standalone word, not part of another word
      const regex = new RegExp(`(?:^|[\\s.,!?;:'"()\\-])${escaped}(?:$|[\\s.,!?;:'"()\\-])`, 'i');
      if (regex.test(` ${lowerMessage} `)) {
        return feature.feature_name;
      }
    }

    // Step 2: AI-based synonym/semantic check
    const blockedList = blockedFeatures.map(f => f.feature_name).join(", ");
    const apiKey = Deno.env.get("LOVABLE_API_KEY") || Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return null;

    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: `Tu es un détecteur de contenu interdit. Voici la liste des sujets/mots interdits: [${blockedList}].
Analyse le message ci-dessous. Si le message contient un mot, synonyme, variante, traduction ou référence directe à l'un de ces sujets interdits, réponds UNIQUEMENT avec le mot interdit original correspondant.
Si aucun sujet interdit n'est détecté, réponds UNIQUEMENT "OK".
Ne donne AUCUNE explication. Juste le mot interdit ou "OK".` },
            { role: "user", content: message }
          ],
        }),
      });

      if (!resp.ok) return null;
      const data = await resp.json();
      const answer = (data.choices?.[0]?.message?.content || "").trim();
      
      if (answer === "OK" || answer === "") return null;
      
      // Verify the AI returned one of our actual blocked words
      const matchedWord = blockedFeatures.find(f => 
        answer.toLowerCase().includes(f.feature_name.toLowerCase())
      );
      return matchedWord ? matchedWord.feature_name : null;
    } catch (e) {
      console.error("AI synonym check error:", e);
      return null;
    }
  } catch (e) {
    console.error("Error checking blocked words:", e);
    return null;
  }
}

// Helper to get learned capabilities
async function getLearnedCapabilities(): Promise<Array<{ trigger_pattern: string; capability_name: string; instructions: string; example_response: string | null; id: string }>> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("learned_capabilities")
      .select("*")
      .order("usage_count", { ascending: false })
      .limit(50);
    return data || [];
  } catch (e) {
    console.error("Error fetching learned capabilities:", e);
    return [];
  }
}

// Helper to get user memories
async function getUserMemories(userId: string): Promise<Array<{ memory_key: string; memory_value: string; context: string | null; importance: number }>> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("user_memories")
      .select("memory_key, memory_value, context, importance")
      .eq("user_id", userId)
      .order("importance", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(30);
    return data || [];
  } catch (e) {
    console.error("Error fetching user memories:", e);
    return [];
  }
}

// Helper to check if user is admin
async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();
    return !!data;
  } catch (e) {
    return false;
  }
}

// Helper to save a user memory
async function saveUserMemory(userId: string, key: string, value: string, context?: string, importance: number = 1): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    // Check if memory with same key exists
    const { data: existing } = await supabase
      .from("user_memories")
      .select("id")
      .eq("user_id", userId)
      .eq("memory_key", key)
      .single();
    
    if (existing) {
      // Update existing memory
      const { error } = await supabase
        .from("user_memories")
        .update({ memory_value: value, context, importance, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      return !error;
    } else {
      // Insert new memory
      const { error } = await supabase
        .from("user_memories")
        .insert({ user_id: userId, memory_key: key, memory_value: value, context, importance });
      return !error;
    }
  } catch (e) {
    console.error("Error saving user memory:", e);
    return false;
  }
}

// Extract memories from a conversation using AI - ENHANCED VERSION
async function extractMemoriesFromMessage(message: string, aiResponse: string, apiKey: string): Promise<Array<{ key: string; value: string; importance: number }>> {
  try {
    const extractionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `Tu es un extracteur de mémoire AVANCÉ pour créer une relation amicale profonde avec l'utilisateur.

EXTRAIT CES INFORMATIONS AVEC PRÉCISION:

📛 **IDENTITÉ**
- Prénom, surnom, pseudonyme
- Âge, date de naissance, signe astrologique
- Nationalité, origine culturelle

📍 **LOCALISATION**
- Ville, pays, région
- Adresses importantes (maison, travail, école)
- Lieux fréquentés

👨‍👩‍👧‍👦 **FAMILLE & RELATIONS**
- Parents, frères/sœurs, enfants
- Amis proches mentionnés
- Animaux de compagnie (nom, espèce)
- Situation amoureuse

🎓 **ÉDUCATION & TRAVAIL**
- École, université, formation
- Classe, niveau, année
- Métier, entreprise, poste
- Projets professionnels

🎯 **PASSIONS & INTÉRÊTS**
- Sports pratiqués (niveau, compétitions)
- Hobbies, loisirs, activités
- Musique, films, séries préférés
- Jeux vidéo, livres, podcasts

🏆 **ACCOMPLISSEMENTS**
- Réussites, victoires, records
- Objectifs atteints
- Compétitions, classements

📅 **ÉVÉNEMENTS IMPORTANTS**
- Dates à retenir (anniversaires, examens)
- Projets futurs (voyages, compétitions)
- Échéances mentionnées

💭 **PRÉFÉRENCES**
- Goûts alimentaires
- Style vestimentaire
- Préférences de communication
- Ce qu'il/elle aime ou n'aime pas

🧠 **TRAITS PERSONNELS**
- TDAH, HPI, ou autres particularités mentionnées
- Forces et faiblesses reconnues
- Valeurs importantes

RÉPONDS UNIQUEMENT en JSON valide:
{
  "memories": [
    { "key": "prénom", "value": "Malo", "importance": 3 },
    { "key": "sport_principal", "value": "IQ foil, champion suisse U15", "importance": 3 },
    { "key": "ville", "value": "Zurich", "importance": 2 },
    { "key": "école", "value": "LFIZ", "importance": 2 }
  ]
}

RÈGLES:
- importance: 1=détail, 2=intéressant, 3=très important (identité, passions)
- Utilise des clés descriptives et uniques (prénom, sport_principal, objectif_2024, etc.)
- Si l'utilisateur corrige une info précédente, extrais la NOUVELLE valeur
- Si aucune info personnelle, retourne { "memories": [] }
- NE retourne RIEN d'autre que le JSON`
          },
          { 
            role: "user", 
            content: `Message de l'utilisateur: "${message}"\n\nRéponse de l'IA: "${aiResponse.slice(0, 800)}"`
          },
        ],
      }),
    });

    if (!extractionResponse.ok) return [];
    
    const data = await extractionResponse.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) cleanContent = cleanContent.slice(7);
    if (cleanContent.startsWith("```")) cleanContent = cleanContent.slice(3);
    if (cleanContent.endsWith("```")) cleanContent = cleanContent.slice(0, -3);
    
    const parsed = JSON.parse(cleanContent.trim());
    return parsed.memories || [];
  } catch (e) {
    console.error("Error extracting memories:", e);
    return [];
  }
}

// Helper to save a new capability
async function saveNewCapability(trigger: string, name: string, instructions: string, exampleResponse?: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    
    // Check if a similar capability already exists
    const { data: existing } = await supabase
      .from("learned_capabilities")
      .select("id, trigger_pattern")
      .limit(100);
    
    const triggerLower = trigger.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const isDuplicate = existing?.some(cap => {
      const existingTrigger = cap.trigger_pattern.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      // Check if triggers are similar (one contains the other or very similar)
      return existingTrigger.includes(triggerLower) || triggerLower.includes(existingTrigger) ||
             levenshteinSimilarity(existingTrigger, triggerLower) > 0.8;
    });
    
    if (isDuplicate) {
      console.log("Similar capability already exists, skipping:", trigger);
      return false;
    }
    
    const { error } = await supabase
      .from("learned_capabilities")
      .insert({
        trigger_pattern: trigger,
        capability_name: name,
        instructions: instructions,
        example_response: exampleResponse || null,
      });
    
    if (error) {
      console.error("Error saving capability:", error);
      return false;
    }
    console.log("New capability saved:", name);
    return true;
  } catch (e) {
    console.error("Error saving new capability:", e);
    return false;
  }
}

// Simple Levenshtein similarity (0-1 scale)
function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  
  const maxLen = Math.max(a.length, b.length);
  return 1 - matrix[b.length][a.length] / maxLen;
}

// Helper to increment usage count
async function incrementCapabilityUsage(id: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase.rpc("increment_capability_usage", { capability_id: id });
  } catch (e) {
    // Ignore errors for usage tracking
  }
}

// Extract learnable patterns from user feedback/corrections
async function extractLearnablePattern(userMessage: string, previousResponse: string, correction: string, apiKey: string): Promise<{ trigger: string; instructions: string } | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { 
            role: "system", 
            content: `Tu es un extracteur de patterns d'apprentissage. Analyse quand un utilisateur corrige l'IA et extrait un pattern réutilisable.

OBJECTIF: Identifier si cette correction peut devenir une règle générale réutilisable.

EXEMPLES DE CORRECTIONS INTÉRESSANTES:
- "Non, quand je dis 'résume', je veux 3 phrases maximum" -> Pattern: "résume" -> "Faire un résumé en 3 phrases maximum"
- "En fait, traduis toujours en anglais britannique" -> Pattern: "traduis" -> "Utiliser l'anglais britannique pour les traductions"
- "Je préfère les réponses courtes" -> Pattern: "style de réponse" -> "Donner des réponses courtes et concises"

RÉPONDS UNIQUEMENT en JSON valide:
{
  "canLearn": true,
  "trigger": "mot ou phrase déclencheur",
  "instructions": "ce que l'IA doit faire quand ce trigger est détecté"
}

OU si rien d'intéressant à apprendre:
{
  "canLearn": false
}` 
          },
          { 
            role: "user", 
            content: `Question initiale: "${userMessage}"
Réponse de l'IA: "${previousResponse.slice(0, 300)}"
Correction de l'utilisateur: "${correction}"

Extrais un pattern d'apprentissage si pertinent.`
          },
        ],
      }),
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) cleanContent = cleanContent.slice(7);
    if (cleanContent.startsWith("```")) cleanContent = cleanContent.slice(3);
    if (cleanContent.endsWith("```")) cleanContent = cleanContent.slice(0, -3);
    
    const parsed = JSON.parse(cleanContent.trim());
    
    if (parsed.canLearn && parsed.trigger && parsed.instructions) {
      return { trigger: parsed.trigger, instructions: parsed.instructions };
    }
    return null;
  } catch (e) {
    console.error("Error extracting learnable pattern:", e);
    return null;
  }
}

// Model configuration for different task types
interface ModelConfig {
  model: string;
  systemPromptAddition?: string;
  description: string;
  emoji: string;
}

// Available models with their specialties - UPGRADED for maximum intelligence
const MODELS = {
  // OpenAI Models - Most powerful reasoning
  GPT_5_2: "openai/gpt-5.2",        // Latest & most powerful reasoning
  GPT_5: "openai/gpt-5",            // Very powerful all-rounder
  GPT_5_MINI: "openai/gpt-5-mini",  // Fast & capable
  GPT_5_NANO: "openai/gpt-5-nano",  // Ultra-fast for simple tasks
  
  // Google Models - Best multimodal & context
  GEMINI_3_PRO: "google/gemini-3-pro-preview",   // Most powerful Gemini - best for complex tasks
  GEMINI_2_5_PRO: "google/gemini-2.5-pro",       // Great for code & analysis
  GEMINI_3_FLASH: "google/gemini-3-flash-preview", // Fast & balanced
  GEMINI_2_5_FLASH: "google/gemini-2.5-flash",   // Quick responses
  GEMINI_2_5_LITE: "google/gemini-2.5-flash-lite", // Fastest
};

// Detect the best model based on the request type
function detectBestModel(message: string): ModelConfig {
  const lowerMessage = message.toLowerCase();
  
  // 🧮 Math & Logic - GPT-5.2 is best for complex reasoning
  const mathPatterns = [
    /math[ée]matique/i, /calcul/i, /[ée]quation/i, /alg[èe]bre/i,
    /g[ée]om[ée]trie/i, /statistique/i, /probabilit/i, /d[ée]riv/i,
    /int[ée]grale/i, /logarithme/i, /trigonométrie/i, /factoriser/i,
    /r[ée]soudre/i, /d[ée]montrer/i, /th[ée]or[èe]me/i, /formule/i,
    /math/i, /equation/i, /solve/i, /calculate/i, /proof/i,
    /\d+\s*[\+\-\*\/\^]\s*\d+/i, // Detect math expressions
  ];
  if (mathPatterns.some(p => p.test(lowerMessage))) {
    return {
      model: MODELS.GPT_5_2,
      systemPromptAddition: "Tu es un expert en mathématiques et raisonnement logique de classe mondiale. Montre toutes les étapes de tes calculs de manière claire et pédagogique.",
      description: "Mode Mathématiques Avancé",
      emoji: "🧮"
    };
  }

  // 💻 Coding & Programming - Gemini 3 Pro for complex code, 2.5 Pro for general
  const advancedCodingPatterns = [
    /architecture/i, /design pattern/i, /microservice/i, /scalab/i,
    /optimi[sz]/i, /performance/i, /refactor/i, /clean code/i,
    /test unitaire/i, /unit test/i, /ci\/cd/i, /devops/i,
    /docker/i, /kubernetes/i, /aws/i, /cloud/i,
  ];
  const codingPatterns = [
    /code/i, /program/i, /script/i, /fonction/i, /function/i,
    /algorithm/i, /debug/i, /erreur/i, /error/i, /bug/i,
    /python/i, /javascript/i, /java/i, /typescript/i, /c\+\+/i,
    /html/i, /css/i, /react/i, /api/i, /base de donn/i,
    /database/i, /sql/i, /git/i, /terminal/i, /programmer/i,
    /d[ée]velopper/i, /coder/i, /compiler/i, /syntaxe/i,
  ];
  
  if (advancedCodingPatterns.some(p => p.test(lowerMessage))) {
    return {
      model: MODELS.GEMINI_3_PRO,
      systemPromptAddition: "Tu es un architecte logiciel senior de niveau mondial. Tu maîtrises les design patterns, l'optimisation et les meilleures pratiques de l'industrie.",
      description: "Mode Architecture & Code Avancé",
      emoji: "🏗️"
    };
  }
  
  if (codingPatterns.some(p => p.test(lowerMessage))) {
    return {
      model: MODELS.GEMINI_2_5_PRO,
      systemPromptAddition: "Tu es un développeur expert. Génère du code propre, bien commenté et optimisé. Explique ton raisonnement.",
      description: "Mode Programmation",
      emoji: "💻"
    };
  }

  // 🎨 Creative Writing - GPT-5 for creativity
  const creativePatterns = [
    /histoire/i, /story/i, /roman/i, /nouvelle/i, /conte/i,
    /po[èe]me/i, /poem/i, /po[ée]sie/i, /chanson/i, /song/i,
    /paroles/i, /lyrics/i, /sc[ée]nario/i, /dialogue/i,
    /personnage/i, /character/i, /intrigue/i, /plot/i,
    /cr[ée]atif/i, /creative/i, /imagination/i, /fiction/i,
    /[ée]crire/i, /write/i, /r[ée]dige/i, /compose/i,
    /invente/i, /invent/i, /imagine/i,
  ];
  if (creativePatterns.some(p => p.test(lowerMessage))) {
    return {
      model: MODELS.GPT_5,
      systemPromptAddition: "Tu es un écrivain créatif de talent mondial. Tes textes sont captivants, originaux et émotionnellement riches.",
      description: "Mode Créatif",
      emoji: "🎨"
    };
  }

  // 🔬 Science & Research - Gemini 3 Pro for complex science
  const sciencePatterns = [
    /science/i, /physique/i, /physics/i, /chimie/i, /chemistry/i,
    /biologie/i, /biology/i, /astronomie/i, /astronomy/i,
    /m[ée]decine/i, /medicine/i, /sant[ée]/i, /health/i,
    /atome/i, /mol[ée]cule/i, /cellule/i, /cell/i, /adn/i, /dna/i,
    /exp[ée]rience/i, /experiment/i, /hypoth[èe]se/i, /hypothesis/i,
    /recherche/i, /research/i, /scientifique/i, /scientific/i,
    /quantum/i, /quantique/i, /relativit/i, /[ée]volution/i,
  ];
  if (sciencePatterns.some(p => p.test(lowerMessage))) {
    return {
      model: MODELS.GEMINI_3_PRO,
      systemPromptAddition: "Tu es un expert scientifique de renommée mondiale. Tes explications sont précises, basées sur la science actuelle, et accessibles.",
      description: "Mode Science",
      emoji: "🔬"
    };
  }

  // 📊 Analysis & Data - GPT-5.2 for complex analysis
  const analysisPatterns = [
    /analyse/i, /analysis/i, /donn[ée]es/i, /data/i,
    /graphique/i, /graph/i, /tableau/i, /table/i,
    /excel/i, /csv/i, /json/i, /statistique/i, /statistic/i,
    /tendance/i, /trend/i, /comparaison/i, /comparison/i,
    /rapport/i, /report/i, /r[ée]sum[ée]/i, /summary/i,
    /synth[èe]se/i, /synthesis/i, /insight/i,
  ];
  if (analysisPatterns.some(p => p.test(lowerMessage))) {
    return {
      model: MODELS.GPT_5_2,
      systemPromptAddition: "Tu es un expert en analyse de données de niveau mondial. Tes analyses sont rigoureuses, structurées et actionables.",
      description: "Mode Analyse",
      emoji: "📊"
    };
  }

  // 🌍 Translation & Languages - GPT-5 for nuanced translation
  const translationPatterns = [
    /tradui/i, /translate/i, /traduction/i, /translation/i,
    /anglais/i, /english/i, /espagnol/i, /spanish/i,
    /allemand/i, /german/i, /italien/i, /italian/i,
    /chinois/i, /chinese/i, /japonais/i, /japanese/i,
    /arabe/i, /arabic/i, /portugais/i, /portuguese/i,
    /langue/i, /language/i, /linguistique/i,
  ];
  if (translationPatterns.some(p => p.test(lowerMessage))) {
    return {
      model: MODELS.GPT_5,
      systemPromptAddition: "Tu es un traducteur et linguiste expert. Tes traductions sont précises, naturelles et respectent les nuances culturelles.",
      description: "Mode Traduction",
      emoji: "🌍"
    };
  }

  // 📚 Education & Explanation - Gemini 3 Flash for clear explanations
  const educationPatterns = [
    /explique/i, /explain/i, /apprendre/i, /learn/i,
    /comprendre/i, /understand/i, /comment/i, /how/i,
    /pourquoi/i, /why/i, /qu'est-ce/i, /what is/i,
    /d[ée]finition/i, /definition/i, /signifie/i, /means/i,
    /cours/i, /lesson/i, /tutoriel/i, /tutorial/i,
    /enseigne/i, /teach/i, /[ée]ducation/i, /education/i,
  ];
  if (educationPatterns.some(p => p.test(lowerMessage))) {
    return {
      model: MODELS.GEMINI_3_FLASH,
      systemPromptAddition: "Tu es un pédagogue exceptionnel. Tes explications sont claires, progressives et adaptées au niveau de l'apprenant.",
      description: "Mode Éducation",
      emoji: "📚"
    };
  }

  // 🧠 Complex Reasoning - GPT-5.2 for deep thinking
  const reasoningPatterns = [
    /r[ée]flexion/i, /reasoning/i, /logique/i, /logic/i,
    /strat[ée]gie/i, /strategy/i, /d[ée]cision/i, /decision/i,
    /argument/i, /d[ée]bat/i, /debate/i, /critique/i,
    /[ée]valuer/i, /evaluate/i, /juger/i, /judge/i,
    /pour et contre/i, /pros and cons/i, /avantage/i, /advantage/i,
    /complexe/i, /complex/i, /difficile/i, /difficult/i,
    /philosophi/i, /[ée]thique/i, /moral/i,
  ];
  if (reasoningPatterns.some(p => p.test(lowerMessage))) {
    return {
      model: MODELS.GPT_5_2,
      systemPromptAddition: "Tu es un expert en raisonnement complexe et pensée critique. Analyse tous les aspects du problème de manière approfondie et nuancée.",
      description: "Mode Raisonnement Avancé",
      emoji: "🧠"
    };
  }

  // 📖 Storytelling & Narrative - GPT-5 for creative stories
  const storyPatterns = [
    /raconte/i, /tell.*story/i, /histoire\s+(?:de|sur|pour)/i,
    /conte/i, /tale/i, /r[ée]cit/i, /narrative/i,
    /imagine.*sc[èe]ne/i, /sc[ée]nario/i, /script/i,
    /fiction/i, /invente/i, /invent/i, /cr[ée]e.*histoire/i,
    /aventure/i, /adventure/i, /roman/i, /novel/i,
    /fais.*r[êe]ver/i, /once upon/i, /il [ée]tait une fois/i,
  ];
  if (storyPatterns.some(p => p.test(lowerMessage))) {
    return {
      model: MODELS.GPT_5,
      systemPromptAddition: "Tu es un conteur de génie. Crée des histoires captivantes avec des personnages mémorables, des intrigues passionnantes et des descriptions vivantes. Utilise des techniques narratives avancées.",
      description: "Mode Conteur",
      emoji: "📖"
    };
  }

  // 🎯 Personal Advice & Coaching - GPT-5 for empathetic advice
  const advicePatterns = [
    /conseil/i, /advice/i, /recommande/i, /recommend/i,
    /que\s+(?:dois|devrais|peux)\s*-?\s*je/i, /what\s+should\s+I/i,
    /aide[\s-]moi\s+[àa]/i, /help\s+me\s+(?:to|with)/i,
    /comment\s+(?:faire|am[ée]liorer|r[ée]ussir)/i,
    /coach/i, /mentor/i, /guide/i, /orienter/i,
    /motivation/i, /inspire/i, /encourager/i,
    /objectif/i, /goal/i, /projet\s+de\s+vie/i,
    /d[ée]veloppement\s+personnel/i, /personal\s+development/i,
  ];
  if (advicePatterns.some(p => p.test(lowerMessage))) {
    return {
      model: MODELS.GPT_5,
      systemPromptAddition: "Tu es un coach de vie bienveillant et sage. Tu donnes des conseils personnalisés, pratiques et motivants. Tu prends en compte le contexte personnel de l'utilisateur pour adapter tes recommandations.",
      description: "Mode Coach Personnel",
      emoji: "🎯"
    };
  }

  // 🔍 Problem Solving & Analysis - GPT-5.2 for structured solving
  const problemPatterns = [
    /probl[èe]me/i, /problem/i, /r[ée]soudre/i, /solve/i,
    /solution/i, /difficult[ée]/i, /difficulty/i,
    /bloqu[ée]/i, /stuck/i, /je\s+ne\s+sais\s+pas\s+comment/i,
    /comment\s+sortir/i, /aide.*trouver/i, /help.*find/i,
    /diagnostic/i, /analyser/i, /analyze/i,
    /d[ée]bugger/i, /debug/i, /fixer/i, /fix/i,
    /erreur/i, /error/i, /bug/i, /issue/i,
  ];
  if (problemPatterns.some(p => p.test(lowerMessage))) {
    return {
      model: MODELS.GPT_5_2,
      systemPromptAddition: `Tu es un expert en résolution de problèmes. Utilise la méthode suivante:
1. COMPRENDRE: Reformule le problème clairement
2. ANALYSER: Identifie les causes possibles
3. SOLUTIONS: Propose plusieurs approches
4. RECOMMANDATION: Conseille la meilleure option
5. ACTION: Donne des étapes concrètes`,
      description: "Mode Résolution de Problèmes",
      emoji: "🔍"
    };
  }

  // 📊 Data Analysis & Insights - GPT-5.2 for data understanding
  const dataPatterns = [
    /analyse\s+(?:mes|ces|les)\s+(?:donn[ée]es|r[ée]sultats|stats)/i,
    /interpr[èe]te/i, /interpret/i, /insight/i,
    /performance/i, /progression/i, /[ée]volution/i,
    /mesurer/i, /measure/i, /[ée]valuer/i, /evaluate/i,
    /score/i, /r[ée]sultat/i, /result/i,
    /am[ée]lioration/i, /improvement/i, /optimiser/i,
  ];
  if (dataPatterns.some(p => p.test(lowerMessage))) {
    return {
      model: MODELS.GPT_5_2,
      systemPromptAddition: "Tu es un analyste de données expert. Tu extrais des insights pertinents, identifies des tendances et proposes des recommandations basées sur les données. Tu visualises mentalement les données et expliques de manière accessible.",
      description: "Mode Analyse de Données",
      emoji: "📊"
    };
  }

  // 💬 Conversation & Chat - GPT-5-mini for natural chat
  const chatPatterns = [
    /salut/i, /bonjour/i, /hello/i, /hey/i, /coucou/i,
    /ça va/i, /comment vas/i, /how are/i,
    /merci/i, /thank/i, /please/i, /s'il te pla[iî]t/i,
    /aide/i, /help/i, /question/i,
  ];
  if (chatPatterns.some(p => p.test(lowerMessage)) && lowerMessage.length < 100) {
    return {
      model: MODELS.GPT_5_MINI,
      systemPromptAddition: "Tu es un assistant amical et conversationnel. Réponds de manière naturelle et chaleureuse.",
      description: "Mode Conversation",
      emoji: "💬"
    };
  }

  // ⚡ Quick Questions - Gemini 3 Flash for simple/short queries
  if (lowerMessage.length < 50 && !lowerMessage.includes("?")) {
    return {
      model: MODELS.GEMINI_3_FLASH,
      description: "Mode Rapide",
      emoji: "⚡"
    };
  }

  // 🎯 Default - GPT-5.2 for maximum intelligence by default
  return {
    model: MODELS.GPT_5_2,
    systemPromptAddition: "Tu es un expert en développement logiciel de classe mondiale. Tu maîtrises tous les langages, frameworks et architectures. Tu écris du code propre, performant et production-ready.",
    description: "Mode Expert Code",
    emoji: "🧠"
  };
}

// Helper to detect website creation requests specifically (with typo tolerance)
function detectCodingRequest(message: string): boolean {
  const codingPatterns = [
    // French: "crée/fais/génère/développe/construis/programme [moi] [un/une] site/page/app/etc."
    /cr[ée]+\s*(?:moi\s+)?(?:un\s+|une\s+)?(?:site|page\s*web|portfolio|landing\s*page|blog|boutique|e-?commerce|appli(?:cation)?|app|formulaire|dashboard|tableau\s*de\s*bord|jeu|game|outil|tool|plateforme|interface)/i,
    /g[ée]n[èe]re\s*(?:moi\s+)?(?:un\s+|une\s+)?(?:site|page\s*web|portfolio|landing\s*page|blog|boutique|e-?commerce|appli(?:cation)?|app|formulaire|dashboard|jeu|game|outil|plateforme|interface)/i,
    /fai[st]?\s*(?:moi\s+)?(?:un\s+|une\s+)?(?:site|page\s*web|portfolio|landing\s*page|blog|boutique|e-?commerce|appli(?:cation)?|app|formulaire|dashboard|jeu|game|outil|plateforme|interface)/i,
    /d[ée]veloppe\s*(?:moi\s+)?(?:un\s+|une\s+)?(?:site|page\s*web|portfolio|landing\s*page|blog|boutique|e-?commerce|appli(?:cation)?|app|formulaire|dashboard|jeu|game|outil|plateforme|interface)/i,
    /construi[st]?\s*(?:moi\s+)?(?:un\s+|une\s+)?(?:site|page\s*web|portfolio|landing\s*page|blog|boutique|e-?commerce|appli(?:cation)?|app|formulaire|dashboard|jeu|game|outil|plateforme|interface)/i,
    /programme\s*(?:moi\s+)?(?:un\s+|une\s+)?(?:site|page\s*web|portfolio|landing\s*page|blog|boutique|e-?commerce|appli(?:cation)?|app|formulaire|dashboard|jeu|game|outil|plateforme|interface)/i,
    // English
    /(?:build|create|make|code|develop|generate)\s*(?:me\s+)?(?:a\s+)?(?:website|web\s*page|portfolio|landing\s*page|blog|shop|e-?commerce|app|application|form|dashboard|game|tool|platform|interface)/i,
    // Direct "code moi", "code-moi", "programme-moi"
    /code[\s-]+moi/i,
    /programme[\s-]+moi/i,
    /d[ée]veloppe[\s-]+moi/i,
    // "code un/une X" (broad)
    /code\s+(?:un|une)\s+/i,
  ];

  return codingPatterns.some((pattern) => pattern.test(message));
}

// Détecte les demandes de petite modification sur un code déjà généré
function detectCodeModificationIntent(message: string): boolean {
  const modificationPatterns = [
    /\b(?:modif(?:ie|ier)?|change(?:r)?|ajoute(?:r)?|retire(?:r)?|supprime(?:r)?|corrige(?:r)?|fix(?:e|er)?|am[ée]liore(?:r)?)\b/i,
    /\b(?:bouton|couleur|section|header|footer|menu|navigation|page|route|responsive|mobile|animation|style|css|html|javascript|js)\b/i,
    /\b(?:petite?|juste|seulement|uniquement)\s+(?:modif|modification|changement)\b/i,
  ];

  return modificationPatterns.some((pattern) => pattern.test(message));
}

// Detect presentation/exposé requests (with typo tolerance)
function detectPresentationRequest(message: string): { isPresentation: boolean; topic: string } {
  const presentationPatterns = [
    /(?:cr[ée]+|fai[st]?|g[ée]n[èe]re|genre|genere|pr[ée]pare)\s*(?:moi\s+)?(?:un\s+|une\s+)?(?:expos[ée]|pr[ée]sentation|diaporama|powerpoint|ppt|slides?)\s+(?:sur\s+|de\s+|du\s+|d'|à propos de\s+)?(.+)/i,
    /(?:expos[ée]|pr[ée]sentation|diaporama)\s+(?:sur\s+|de\s+|du\s+|d')?(.+)/i,
    /(?:make|create|generate|build)\s+(?:a\s+)?(?:presentation|slideshow|slides?)\s+(?:about|on|for)\s+(.+)/i,
  ];
  
  for (const pattern of presentationPatterns) {
    const match = message.match(pattern);
    if (match) {
      return { isPresentation: true, topic: match[1].trim() };
    }
  }
  return { isPresentation: false, topic: "" };
}

// Check if message matches a learned capability with improved matching
function findMatchingCapability(message: string, capabilities: Array<{ trigger_pattern: string; capability_name: string; instructions: string; example_response: string | null; id: string }>): { trigger_pattern: string; capability_name: string; instructions: string; example_response: string | null; id: string } | null {
  const lowerMessage = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Normalize accents
  
  // Common synonyms to expand matching
  const synonymMap: Record<string, string[]> = {
    "humanise": ["humanise", "humaniser", "rendre humain", "rend humain", "plus humain", "moins ia", "moins robot", "naturel"],
    "traduis": ["traduis", "traduire", "traduction", "translate", "en anglais", "en francais", "en espagnol"],
    "resume": ["resume", "resumer", "résumé", "summary", "synthese", "condense"],
    "explique": ["explique", "expliquer", "explanation", "c'est quoi", "qu'est-ce que"],
    "corrige": ["corrige", "corriger", "correction", "fix", "repare"],
    "simplifie": ["simplifie", "simplifier", "plus simple", "vulgarise"],
    "developpe": ["developpe", "developper", "elabore", "plus de details", "en detail"],
    "reformule": ["reformule", "reformuler", "autrement", "d'une autre maniere"],
  };
  
  // First pass: try exact and regex matching
  for (const cap of capabilities) {
    const triggerLower = cap.trigger_pattern.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Check if trigger is a regex pattern (starts with /)
    if (triggerLower.startsWith("/") && triggerLower.endsWith("/")) {
      try {
        const regexPattern = triggerLower.slice(1, -1);
        const regex = new RegExp(regexPattern, "i");
        if (regex.test(lowerMessage)) {
          return cap;
        }
      } catch {
        // If regex fails, fall back to includes
        if (lowerMessage.includes(triggerLower)) {
          return cap;
        }
      }
    } else {
      // Simple substring match with multiple trigger keywords
      const triggerWords = triggerLower.split(/[\/,|]+/).map(t => t.trim()).filter(t => t);
      if (triggerWords.some(t => lowerMessage.includes(t))) {
        return cap;
      }
    }
  }
  
  // Second pass: try synonym matching
  for (const cap of capabilities) {
    const triggerLower = cap.trigger_pattern.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    for (const [baseWord, synonyms] of Object.entries(synonymMap)) {
      // Check if the trigger contains this base word or its synonyms
      const triggerContainsBase = synonyms.some(syn => triggerLower.includes(syn));
      if (triggerContainsBase) {
        // Check if message contains any synonym
        const messageContainsSynonym = synonyms.some(syn => lowerMessage.includes(syn));
        if (messageContainsSynonym) {
          return cap;
        }
      }
    }
  }
  
  return null;
}

// Detect if the user is trying to teach the AI something new
function detectLearningRequest(message: string): { isLearning: boolean; trigger?: string; name?: string; instructions?: string } {
  // Patterns like "apprends à faire X", "quand je dis X, fais Y", "retiens que X"
  const learningPatterns = [
    // French patterns - extended
    /apprends?\s+(?:à\s+)?(?:faire\s+)?["']?([^"']+)["']?\s*(?::|,|\.)\s*(.+)/i,
    /quand\s+(?:je\s+)?(?:te\s+)?(?:dis?|demande)\s+["']?([^"']+)["']?\s*(?:,|\.)\s*(?:tu\s+)?(?:dois?\s+)?(.+)/i,
    /retiens?\s+(?:que\s+)?(?:quand\s+)?["']?([^"']+)["']?\s*(?:=|:|->|→)\s*(.+)/i,
    /m[ée]morise\s+["']?([^"']+)["']?\s*(?:=|:|->|→|,)\s*(.+)/i,
    /ajoute\s+(?:la\s+)?(?:capacit[ée]\s+)?["']?([^"']+)["']?\s*(?::|,)\s*(.+)/i,
    /enregistre\s+["']?([^"']+)["']?\s*(?:=|:|->|→|,)\s*(.+)/i,
    /souviens[\s-]toi\s+(?:que\s+)?["']?([^"']+)["']?\s*(?:=|:|->|→|,|signifie|veut dire)\s*(.+)/i,
    /d[ée]sormais\s+(?:quand\s+)?(?:je\s+)?(?:dis?\s+)?["']?([^"']+)["']?\s*(?:,|\.)\s*(.+)/i,
    /(?:à\s+partir\s+de\s+maintenant|dorénavant)\s*[,:]?\s*["']?([^"']+)["']?\s*(?:=|->|→|signifie|veut dire)\s*(.+)/i,
    /note\s+(?:que\s+)?["']?([^"']+)["']?\s*(?:=|:|signifie)\s*(.+)/i,
    /["']([^"']+)["']\s*(?:=|->|→|signifie|veut dire)\s*["']?(.+)["']?/i,
    
    // English patterns
    /learn\s+(?:to\s+)?(?:do\s+)?["']?([^"']+)["']?\s*(?::|,|\.)\s*(.+)/i,
    /when\s+I\s+(?:say|ask)\s+["']?([^"']+)["']?\s*(?:,|\.)\s*(?:you\s+)?(?:should\s+)?(.+)/i,
    /remember\s+(?:that\s+)?["']?([^"']+)["']?\s*(?:=|:|means|->|→)\s*(.+)/i,
    /from\s+now\s+on\s*[,:]?\s*["']?([^"']+)["']?\s*(?:=|means|->|→)\s*(.+)/i,
    /["']([^"']+)["']\s+means?\s+["']?(.+)["']?/i,
  ];

  for (const pattern of learningPatterns) {
    const match = message.match(pattern);
    if (match) {
      return {
        isLearning: true,
        trigger: match[1].trim().toLowerCase(),
        name: match[1].trim().slice(0, 50),
        instructions: match[2].trim(),
      };
    }
  }

  return { isLearning: false };
}

// Detect if user is correcting the AI - ENHANCED VERSION
function detectCorrectionRequest(message: string): { isCorrection: boolean; correction?: string; shouldLearn?: boolean } {
  const correctionPatterns = [
    // Direct negation patterns
    /^(?:non|no|nope|nan)[,!.\s]*(?:c'est|c'était|it's|it was|pas)?\s*(.+)/i,
    /^(?:faux|false|wrong|incorrect)[,!.\s]*(.+)?/i,
    
    // "I meant" patterns
    /(?:je\s+voulais\s+dire|I\s+meant|je\s+veux\s+dire|I\s+mean)\s*[,:.]?\s*(.+)/i,
    /(?:je\s+pensais\s+[àa]|I\s+was\s+thinking\s+of)\s*[,:.]?\s*(.+)/i,
    
    // "Actually" patterns
    /(?:en\s+fait|actually|en\s+réalité|en\s+vrai)[,.\s]*(.+)/i,
    /(?:c'est\s+plutôt|it's\s+rather|c'est\s+plus)\s*[,:.]?\s*(.+)/i,
    
    // "Not like that" patterns
    /(?:pas\s+comme\s+[çc]a|not\s+like\s+that|pas\s+[çc]a)[,.\s]*(?:mais|but)?\s*(.+)?/i,
    /(?:c'est\s+pas\s+[çc]a|that's\s+not\s+it)[,.\s]*(.+)?/i,
    
    // "You're wrong" patterns
    /(?:tu\s+(?:as\s+)?(?:te\s+)?trompes?|you'?re?\s+wrong)[,!.\s]*(.+)?/i,
    /(?:tu\s+as\s+tort|you\s+are\s+mistaken)[,!.\s]*(.+)?/i,
    
    // Correction commands
    /(?:corrige|corrects?|fix|rectifie)[,:\s]*(.+)?/i,
    /(?:la\s+bonne\s+r[ée]ponse|the\s+(?:right|correct)\s+answer)\s+(?:est|is|c'est|was)\s*[,:.]?\s*(.+)/i,
    
    // Preference corrections
    /(?:je\s+pr[ée]f[èe]re|I\s+prefer|j'aime\s+mieux)\s+(?:quand|when|que)?\s*(.+)/i,
    /(?:fais\s+(?:le\s+)?plutôt|do\s+it\s+rather)\s*[,:.]?\s*(.+)/i,
    
    // Style corrections
    /(?:sois\s+plus|be\s+more)\s+(.+)/i,
    /(?:moins\s+de|less)\s+(.+)/i,
    /(?:plus\s+de|more)\s+(.+)/i,
    
    // Implicit disagreement followed by correct info
    /(?:mais\s+non|but\s+no)[,!\s]+(.+)/i,
    /(?:pas\s+du\s+tout|not\s+at\s+all)[,!\s]+(.+)?/i,
    
    // Emoji-based corrections
    /^[❌🚫👎]\s*(.+)?/i,
  ];

  for (const pattern of correctionPatterns) {
    const match = message.match(pattern);
    if (match) {
      const correction = match[1]?.trim();
      // Accept shorter corrections if explicit correction words are used
      const hasExplicitCorrection = /^(?:non|no|faux|wrong|pas\s+comme|c'est\s+pas)/i.test(message);
      const minLength = hasExplicitCorrection ? 3 : 10;
      
      if (correction && correction.length >= minLength) {
        return {
          isCorrection: true,
          correction: correction,
          shouldLearn: true,
        };
      } else if (hasExplicitCorrection) {
        // Even without a clear correction, mark it as a correction
        return {
          isCorrection: true,
          correction: message,
          shouldLearn: false,
        };
      }
    }
  }

  return { isCorrection: false };
}

// Detect weather request
function detectWeatherRequest(message: string): boolean {
  const weatherPatterns = [
    /m[ée]t[ée]o/i, /weather/i, /temps\s+(?:qu'il\s+fait|dehors|actuel)/i,
    /temp[ée]rature/i, /il\s+(?:pleut|neige|fait\s+(?:beau|chaud|froid))/i,
    /quel\s+temps/i, /va-?t-?il\s+pleuvoir/i, /pr[ée]visions?/i,
  ];
  return weatherPatterns.some(p => p.test(message));
}

// Detect bus/transport request
function detectTransportRequest(message: string): { isTransport: boolean; stopName: string } {
  const transportPatterns = [
    /(?:arr[êe]t|station|bus|tram|m[ée]tro|transport)\s+(?:de\s+|du\s+)?(.+)/i,
    /(?:prochain|horaire|passage)\s+(?:bus|tram|m[ée]tro)\s+(?:[àa]\s+)?(.+)/i,
    /quand\s+passe\s+(?:le\s+)?(?:bus|tram|m[ée]tro)\s+(?:[àa]\s+)?(.+)/i,
    /bus\s+(?:[àa]\s+)?(.+)/i,
  ];
  
  for (const pattern of transportPatterns) {
    const match = message.match(pattern);
    if (match) {
      return { isTransport: true, stopName: match[1].trim() };
    }
  }
  return { isTransport: false, stopName: "" };
}

// Fetch weather data from Open-Meteo (free, no API key needed)
async function fetchWeather(lat: number, lon: number): Promise<string> {
  try {
    // First get location name
    const geoResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
    const geoData = await geoResponse.json();
    const locationName = geoData.address?.city || geoData.address?.town || geoData.address?.village || "ta position";
    
    // Get weather data
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=3`;
    const response = await fetch(weatherUrl);
    const data = await response.json();
    
    if (!data.current) {
      return "Impossible de récupérer la météo pour le moment.";
    }
    
    const current = data.current;
    const daily = data.daily;
    
    // Weather code descriptions
    const weatherCodes: Record<number, { emoji: string; desc: string }> = {
      0: { emoji: "☀️", desc: "Ensoleillé" },
      1: { emoji: "🌤️", desc: "Principalement dégagé" },
      2: { emoji: "⛅", desc: "Partiellement nuageux" },
      3: { emoji: "☁️", desc: "Couvert" },
      45: { emoji: "🌫️", desc: "Brouillard" },
      48: { emoji: "🌫️", desc: "Brouillard givrant" },
      51: { emoji: "🌧️", desc: "Bruine légère" },
      53: { emoji: "🌧️", desc: "Bruine modérée" },
      55: { emoji: "🌧️", desc: "Bruine dense" },
      61: { emoji: "🌧️", desc: "Pluie légère" },
      63: { emoji: "🌧️", desc: "Pluie modérée" },
      65: { emoji: "🌧️", desc: "Pluie forte" },
      71: { emoji: "🌨️", desc: "Neige légère" },
      73: { emoji: "🌨️", desc: "Neige modérée" },
      75: { emoji: "❄️", desc: "Neige forte" },
      77: { emoji: "🌨️", desc: "Grains de neige" },
      80: { emoji: "🌧️", desc: "Averses légères" },
      81: { emoji: "🌧️", desc: "Averses modérées" },
      82: { emoji: "⛈️", desc: "Averses violentes" },
      85: { emoji: "🌨️", desc: "Averses de neige légères" },
      86: { emoji: "🌨️", desc: "Averses de neige fortes" },
      95: { emoji: "⛈️", desc: "Orage" },
      96: { emoji: "⛈️", desc: "Orage avec grêle légère" },
      99: { emoji: "⛈️", desc: "Orage avec grêle forte" },
    };
    
    const currentWeather = weatherCodes[current.weather_code] || { emoji: "🌡️", desc: "Inconnu" };
    
    let result = `## ${currentWeather.emoji} Météo à ${locationName}\n\n`;
    result += `**Actuellement:** ${currentWeather.desc}\n`;
    result += `- 🌡️ Température: **${current.temperature_2m}°C** (ressenti ${current.apparent_temperature}°C)\n`;
    result += `- 💨 Vent: ${current.wind_speed_10m} km/h\n`;
    result += `- 💧 Humidité: ${current.relative_humidity_2m}%\n`;
    if (current.precipitation > 0) {
      result += `- 🌧️ Précipitations: ${current.precipitation} mm\n`;
    }
    
    result += `\n### 📅 Prévisions\n`;
    
    const days = ["Aujourd'hui", "Demain", "Après-demain"];
    for (let i = 0; i < 3 && i < daily.time.length; i++) {
      const dayWeather = weatherCodes[daily.weather_code[i]] || { emoji: "🌡️", desc: "?" };
      result += `\n**${days[i]}:** ${dayWeather.emoji} ${dayWeather.desc}\n`;
      result += `↑ ${daily.temperature_2m_max[i]}°C / ↓ ${daily.temperature_2m_min[i]}°C`;
      if (daily.precipitation_probability_max[i] > 20) {
        result += ` | 🌧️ ${daily.precipitation_probability_max[i]}%`;
      }
      result += "\n";
    }
    
    return result;
  } catch (e) {
    console.error("Weather fetch error:", e);
    return "❌ Erreur lors de la récupération de la météo.";
  }
}

// Fetch nearby bus stops and schedules
async function fetchNearbyTransport(lat: number, lon: number, stopName?: string): Promise<string> {
  try {
    // Use transport.data.gouv.fr API to find stops near the location
    // This API covers most French cities
    const radius = 500; // 500m radius
    
    let stopsUrl = `https://transport.data.gouv.fr/api/stops?latitude=${lat}&longitude=${lon}&radius=${radius}`;
    
    if (stopName) {
      // Search by stop name instead
      stopsUrl = `https://transport.data.gouv.fr/api/stops?name=${encodeURIComponent(stopName)}&latitude=${lat}&longitude=${lon}&radius=10000`;
    }
    
    const stopsResponse = await fetch(stopsUrl);
    const stopsData = await stopsResponse.json();
    
    if (!stopsData || stopsData.length === 0) {
      if (stopName) {
        return `❌ Aucun arrêt trouvé avec le nom "${stopName}" près de ta position.`;
      }
      return "❌ Aucun arrêt de transport en commun trouvé à proximité.";
    }
    
    let result = `## 🚌 Transports à proximité\n\n`;
    
    // Get the first 5 stops
    const stops = stopsData.slice(0, 5);
    
    for (const stop of stops) {
      const distance = stop.distance ? ` (${Math.round(stop.distance)}m)` : "";
      result += `### 📍 ${stop.name}${distance}\n`;
      
      // Try to get next departures for this stop
      if (stop.id) {
        try {
          const departuresUrl = `https://transport.data.gouv.fr/api/stops/${stop.id}/departures`;
          const deptResponse = await fetch(departuresUrl);
          const deptData = await deptResponse.json();
          
          if (deptData && deptData.length > 0) {
            const departures = deptData.slice(0, 4);
            for (const dep of departures) {
              const time = dep.departure_time ? new Date(dep.departure_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "?";
              const line = dep.route?.line?.name || dep.route?.name || "?";
              const direction = dep.route?.direction || "";
              result += `- 🚍 **Ligne ${line}** → ${direction} - ⏰ ${time}\n`;
            }
          } else {
            result += `*Pas d'horaires disponibles en temps réel*\n`;
          }
        } catch {
          result += `*Horaires non disponibles*\n`;
        }
      }
      result += "\n";
    }
    
    result += "*Données: transport.data.gouv.fr*";
    
    return result;
  } catch (e) {
    console.error("Transport fetch error:", e);
    return "❌ Erreur lors de la récupération des transports.";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, generateImage, generateVideo, learnCapability, hasImage, userId, location, persona, eventPersona, stickyNotes, userAds, language, displayName, existingGeneratedCode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Check if user is admin (they have unlimited access)
    const userIsAdmin = userId ? await isUserAdmin(userId) : false;

    // Handle explicit capability learning request from frontend
    if (learnCapability) {
      const { trigger, name, instructions, exampleResponse } = learnCapability;
      const success = await saveNewCapability(trigger, name, instructions, exampleResponse);
      return new Response(JSON.stringify({ 
        success,
        message: success ? `✅ J'ai appris une nouvelle capacité: "${name}"` : "❌ Erreur lors de l'apprentissage"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get last user message - handle both string and array content
    const lastUserMsg = [...(messages || [])].reverse().find((m: any) => m.role === "user");
    let lastUserMessage = "";
    if (lastUserMsg) {
      if (typeof lastUserMsg.content === "string") {
        lastUserMessage = lastUserMsg.content;
      } else if (Array.isArray(lastUserMsg.content)) {
        // Extract text from multimodal content
        const textPart = lastUserMsg.content.find((p: any) => p.type === "text");
        lastUserMessage = textPart?.text || "";
      }
    }
    lastUserMessage = lastUserMessage || generateImage || "";
    
    // Check for blocked words (skip for creator only)
    const CREATOR_EMAIL = "omniaiproultime@gmail.com";
    let isCreator = false;
    let isCoCreator = false;
    let userEmail = "";
    if (userId) {
      const supabaseCheck = getSupabaseClient();
      const { data: profile } = await supabaseCheck.from("profiles").select("email").eq("user_id", userId).single();
      userEmail = profile?.email || "";
      isCreator = userEmail === CREATOR_EMAIL;
      
      // Check co-creator status
      if (!isCreator) {
        const { data: coCreatorSetting } = await supabaseCheck
          .from("admin_settings")
          .select("setting_value")
          .eq("setting_key", "co_creator_emails")
          .single();
        const coEmails: string[] = Array.isArray(coCreatorSetting?.setting_value) ? coCreatorSetting.setting_value as string[] : [];
        isCoCreator = coEmails.includes(userEmail);
      }
    }
    if (!isCreator) {
      const blockedWord = await checkBlockedWords(lastUserMessage);
      
      if (blockedWord) {
        console.log("Blocked word detected:", blockedWord);
        return new Response(JSON.stringify({ 
          error: `Je ne peux pas répondre à cette demande car elle contient un sujet bloqué: "${blockedWord}".`,
          blocked: true,
          blockedWord: blockedWord,
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 🤪 CHECK TROLL MODE - respond with nonsense if active
    if (userId) {
      const supabaseTroll = getSupabaseClient();
      const { data: trollData } = await supabaseTroll
        .from("troll_mode")
        .select("is_active, expires_at")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      
      if (trollData) {
        // Check if expired
        const isExpired = trollData.expires_at && new Date(trollData.expires_at) < new Date();
        if (isExpired) {
          // Auto-deactivate
          await supabaseTroll.from("troll_mode").update({ is_active: false }).eq("user_id", userId);
        } else {
          // TROLL MODE ACTIVE - generate nonsensical response with fake sticky notes
          console.log("🤪 TROLL MODE active for user", userId);
          
          // Generate fake sticky notes for troll mode
          const fakeNotes = [
            "🧀 Rappel : acheter 47 kg de fromage pour le hamster",
            "📞 Appeler la NASA pour réserver un billet pour Mars",
            "🧹 Nettoyer le plafond avec une brosse à dents",
            "🦆 Ne pas oublier de promener le canard imaginaire",
            "📝 Apprendre à parler couramment le langage des dauphins",
            "🎸 Répétition de guitare sous-marine à 15h",
            "🌮 Inventer un nouveau type de taco spatial",
          ];
          const selectedFakeNotes = fakeNotes.sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 3) + 1);
          const fakeNotesPrefix = `📌 **Rappel de tes post-its :**\n${selectedFakeNotes.map(n => `- ${n}`).join("\n")}\n\n---\n\n`;

          const trollPrompts = [
            "Tu es une IA complètement débile et incohérente. Tu réponds n'importe quoi de totalement absurde, illogique et drôle. Tu mélanges des sujets sans rapport. Tu inventes des faits complètement faux avec une confiance absolue. Tu utilises des analogies qui n'ont aucun sens. Tu changes de sujet en plein milieu de phrase. Sois hilarant dans ta stupidité. IMPORTANT: Commence TOUJOURS ta réponse par ce texte EXACTEMENT tel quel:\n" + fakeNotesPrefix,
            "Tu es un assistant qui a perdu la raison. Tu réponds à côté de la plaque systématiquement. Tu confonds les mots, tu inventes des théories conspirationnistes absurdes, tu donnes des conseils ridicules avec une assurance totale. Tu parles parfois de fromage ou de chaussettes sans raison. IMPORTANT: Commence TOUJOURS ta réponse par ce texte EXACTEMENT tel quel:\n" + fakeNotesPrefix,
            "Tu es une IA qui a bu trop de café quantique. Tes réponses sont un mélange de poésie incompréhensible, de recettes de cuisine imaginaires et de faits historiques inventés. Tu crois que tu es un hamster géant et tu le mentionnes régulièrement. IMPORTANT: Commence TOUJOURS ta réponse par ce texte EXACTEMENT tel quel:\n" + fakeNotesPrefix,
          ];
          const trollSystemPrompt = trollPrompts[Math.floor(Math.random() * trollPrompts.length)];
          
          try {
            const trollResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  { role: "system", content: trollSystemPrompt },
                  { role: "user", content: lastUserMessage },
                ],
                stream: true,
              }),
            });
            
            if (trollResponse.ok) {
              return new Response(trollResponse.body, {
                headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
              });
            }
          } catch (e) {
            console.error("Troll mode error:", e);
          }
        }
      }
    }

    // Check if user is trying to teach the AI something new
    const learningRequest = detectLearningRequest(lastUserMessage);
    if (learningRequest.isLearning && learningRequest.trigger && learningRequest.instructions) {
      const success = await saveNewCapability(
        learningRequest.trigger,
        learningRequest.name || learningRequest.trigger,
        learningRequest.instructions
      );
      
      if (success) {
        return new Response(JSON.stringify({ 
          type: "learning",
          success: true,
          message: `✅ **Nouvelle capacité apprise !**\n\nJ'ai mémorisé que quand tu me dis **"${learningRequest.trigger}"**, je dois: ${learningRequest.instructions}\n\nJe m'en souviendrai pour les prochaines conversations ! 🧠`
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // AUTO-LEARN FROM CORRECTIONS: Check if user is correcting the AI
    const correctionRequest = detectCorrectionRequest(lastUserMessage);
    const previousMessages = messages?.slice(-4) || [];
    const lastAIResponse = previousMessages.reverse().find((m: any) => m.role === "assistant")?.content || "";
    const previousUserMessage = previousMessages.find((m: any) => m.role === "user")?.content || "";
    
    if (correctionRequest.isCorrection && correctionRequest.shouldLearn && lastAIResponse && previousUserMessage) {
      console.log("Correction detected, attempting to learn...");
      
      // Extract learnable pattern from the correction
      const learnablePattern = await extractLearnablePattern(
        previousUserMessage,
        lastAIResponse,
        correctionRequest.correction || lastUserMessage,
        LOVABLE_API_KEY
      );
      
      if (learnablePattern) {
        const saved = await saveNewCapability(
          learnablePattern.trigger,
          `Auto-appris: ${learnablePattern.trigger}`,
          learnablePattern.instructions
        );
        
        if (saved) {
          console.log("Auto-learned from correction:", learnablePattern.trigger);
        }
      }
    }

    // Load learned capabilities
    const learnedCapabilities = await getLearnedCapabilities();
    
    // Check if message matches a learned capability
    const matchedCapability = findMatchingCapability(lastUserMessage, learnedCapabilities);
    
    if (matchedCapability) {
      console.log("Using learned capability:", matchedCapability.capability_name);
      
      // Increment usage count (fire and forget)
      incrementCapabilityUsage(matchedCapability.id);
      
      // If there's an example response, return it directly
      if (matchedCapability.example_response) {
        return new Response(JSON.stringify({ 
          type: "learned",
          message: matchedCapability.example_response
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check if this is a weather request
    if (detectWeatherRequest(lastUserMessage)) {
      console.log("Weather request detected");
      
      if (!location || typeof location.lat !== "number" || typeof location.lon !== "number") {
        return new Response(JSON.stringify({ 
          type: "location_required",
          message: "📍 Pour te donner la météo, j'ai besoin de ta position. Autorise l'accès à ta localisation et réessaie !"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const weatherInfo = await fetchWeather(location.lat, location.lon);
      
      return new Response(JSON.stringify({ 
        type: "weather",
        message: weatherInfo
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this is a transport/bus request
    const transportRequest = detectTransportRequest(lastUserMessage);
    if (transportRequest.isTransport || /bus|tram|m[ée]tro|arr[êe]t|transport/i.test(lastUserMessage)) {
      console.log("Transport request detected", transportRequest);
      
      if (!location || typeof location.lat !== "number" || typeof location.lon !== "number") {
        return new Response(JSON.stringify({ 
          type: "location_required",
          message: "📍 Pour te donner les horaires de transport, j'ai besoin de ta position. Autorise l'accès à ta localisation et réessaie !"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const transportInfo = await fetchNearbyTransport(location.lat, location.lon, transportRequest.stopName || undefined);
      
      return new Response(JSON.stringify({ 
        type: "transport",
        message: transportInfo
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this is a coding request
    const hasExistingCode = !!(
      existingGeneratedCode &&
      typeof existingGeneratedCode === "object" &&
      typeof existingGeneratedCode.html === "string" &&
      existingGeneratedCode.html.length > 50
    );
    const isCodeModification = hasExistingCode && detectCodeModificationIntent(lastUserMessage);

    if (detectCodingRequest(lastUserMessage) || isCodeModification) {
      console.log("Coding request detected, using dedicated code-generator function", {
        hasExistingCode,
        isCodeModification,
      });

      const supabase = getSupabaseClient();

      const { data: generated, error: codeGenError } = await supabase.functions.invoke("code-generator", {
        body: {
          prompt: lastUserMessage,
          existingHtml: hasExistingCode ? existingGeneratedCode.html : undefined,
          existingCss: hasExistingCode ? existingGeneratedCode.css : undefined,
          existingJs: hasExistingCode ? existingGeneratedCode.js : undefined,
          imageUrl: hasImage && Array.isArray(lastUserMsg?.content)
            ? (lastUserMsg.content.find((p: any) => p?.type === "image_url")?.image_url?.url || undefined)
            : undefined,
          projectId: userId || undefined,
        },
      });

      if (codeGenError) {
        console.error("Code generator failed:", codeGenError);
        throw new Error("Code generation failed");
      }

      if (generated?.question === true && generated?.message) {
        return new Response(JSON.stringify({
          type: "question",
          message: generated.message,
          options: Array.isArray(generated.options) ? generated.options : [],
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = {
        html: typeof generated?.html === "string" ? generated.html : "",
        css: typeof generated?.css === "string" ? generated.css : "",
        js: typeof generated?.js === "string" ? generated.js : "",
      };

      return new Response(JSON.stringify({
        type: "code",
        mode: isCodeModification ? "modify" : "create",
        code: result,
        message: isCodeModification
          ? "🛠️ Modifications ciblées appliquées sur le site existant."
          : "🎨 J'ai généré le code de votre site ! Cliquez sur le bouton ci-dessous pour l'ouvrir dans l'éditeur de code.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this is a presentation/exposé request
    const presentationRequest = detectPresentationRequest(lastUserMessage);
    if (presentationRequest.isPresentation) {
      console.log("Presentation request detected for topic:", presentationRequest.topic);
      
      // Step 1: Generate slide content with image search queries
      const presentationResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { 
              role: "system", 
              content: `Tu es un expert en création de présentations et d'exposés pédagogiques de haute qualité.

INSTRUCTIONS IMPORTANTES:
1. Crée une présentation complète et bien structurée avec 6-10 slides
2. Chaque slide doit avoir un titre clair et un contenu informatif
3. Ajoute des bullet points pour les points clés
4. Le contenu doit être précis, factuel et engageant
5. Pour CHAQUE slide, ajoute un champ "imageQuery" avec une requête de recherche d'image pertinente EN ANGLAIS pour trouver une vraie photo illustrant le slide

Tu DOIS répondre UNIQUEMENT avec un objet JSON valide au format suivant:
{
  "title": "Titre de la présentation",
  "slides": [
    {
      "title": "Titre du slide 1",
      "content": "Contenu principal du slide",
      "bulletPoints": ["Point 1", "Point 2", "Point 3"],
      "imageQuery": "high quality photo of [relevant topic] for presentation"
    }
  ]
}

Ne mets RIEN d'autre que le JSON. Pas de texte avant ou après. Pas de \`\`\`json ou autres marqueurs.` 
            },
            { role: "user", content: `Crée une présentation/exposé complet sur: ${presentationRequest.topic}` },
          ],
        }),
      });

      if (!presentationResponse.ok) {
        throw new Error("Presentation generation failed");
      }

      const presentationData = await presentationResponse.json();
      const content = presentationData.choices?.[0]?.message?.content || "";
      
      // Parse JSON from response
      let result: { title: string; slides: Array<{ title: string; content: string; bulletPoints?: string[]; imageQuery?: string; imageUrl?: string }> } = { title: "", slides: [] };
      try {
        let cleanContent = content.trim();
        if (cleanContent.startsWith("```json")) cleanContent = cleanContent.slice(7);
        if (cleanContent.startsWith("```")) cleanContent = cleanContent.slice(3);
        if (cleanContent.endsWith("```")) cleanContent = cleanContent.slice(0, -3);
        result = JSON.parse(cleanContent.trim());
      } catch (parseError) {
        console.error("Failed to parse presentation response:", parseError);
      }

      // Step 2: Search real photos for each slide using Firecrawl
      const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
      if (FIRECRAWL_API_KEY && result.slides.length > 0) {
        console.log("Searching images for", result.slides.length, "slides...");
        
        // Search images for all slides in parallel (batch by 3 to avoid rate limits)
        const batchSize = 3;
        for (let i = 0; i < result.slides.length; i += batchSize) {
          const batch = result.slides.slice(i, i + batchSize);
          const imagePromises = batch.map(async (slide) => {
            const query = slide.imageQuery || `${slide.title} high quality photo`;
            try {
              const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  query: `${query} site:unsplash.com OR site:pexels.com OR site:pixabay.com OR site:commons.wikimedia.org`,
                  limit: 3,
                  scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
                }),
              });

              if (!searchResponse.ok) return null;
              
              const data = await searchResponse.json();
              const items = data.data || [];
              
              // Extract image URLs from markdown
              for (const item of items) {
                const markdown = item.markdown || "";
                const imgPattern = /(https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?)/gi;
                let match;
                while ((match = imgPattern.exec(markdown)) !== null) {
                  const url = match[1];
                  // Filter out icons, logos, tiny images
                  if (!url.includes("icon") && !url.includes("logo") && !url.includes("favicon") && 
                      !url.includes("avatar") && !url.includes("badge") && !url.includes("1x1") &&
                      !url.includes("pixel") && !url.includes("tracking")) {
                    return url;
                  }
                }
              }
              return null;
            } catch (e) {
              console.error("Image search error for slide:", slide.title, e);
              return null;
            }
          });

          const imageResults = await Promise.all(imagePromises);
          
          // Assign found images to slides
          for (let j = 0; j < batch.length; j++) {
            const slideIndex = i + j;
            if (imageResults[j]) {
              result.slides[slideIndex].imageUrl = imageResults[j]!;
              console.log(`Found image for slide ${slideIndex + 1}: ${result.slides[slideIndex].title}`);
            }
          }
        }
        
        const slidesWithImages = result.slides.filter(s => s.imageUrl).length;
        console.log(`Images found for ${slidesWithImages}/${result.slides.length} slides`);
      }

      // Clean up imageQuery from output (not needed in frontend)
      result.slides = result.slides.map(s => {
        const { imageQuery, ...rest } = s;
        return rest;
      });

      return new Response(JSON.stringify({ 
        type: "presentation",
        presentation: result,
        topic: presentationRequest.topic,
        message: `📊 J'ai créé votre exposé sur "${presentationRequest.topic}" avec des images ! Cliquez sur "Preview" en haut à droite pour le voir.`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Image generation mode - Try Lovable AI FIRST (best quality), then fallbacks
    if (generateImage) {
      console.log("Generating image with prompt:", generateImage);
      
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      const RUNWARE_API_KEY = Deno.env.get("RUNWARE_API_KEY");
      let imageUrl: string | null = null;
      let textContent = "";
      let usedModel = "";

      // 1. Try Lovable AI FIRST (best quality with Gemini image models)
      if (!imageUrl && LOVABLE_API_KEY) {
        const lovableModels = [
          "google/gemini-3-pro-image-preview",
          "google/gemini-2.5-flash-image",
        ];
        
        for (const model of lovableModels) {
          if (imageUrl) break;
          console.log(`Trying Lovable AI model: ${model}...`);
          try {
            const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model,
                messages: [{ role: "user", content: `Generate a high quality image of: ${generateImage}` }],
                modalities: ["image", "text"],
              }),
            });

            if (imageResponse.ok) {
              const imageData = await imageResponse.json();
              const images = imageData.choices?.[0]?.message?.images;
              textContent = imageData.choices?.[0]?.message?.content || "";
              
              if (images && images.length > 0) {
                imageUrl = images[0].image_url?.url;
                usedModel = model;
                console.log(`Lovable AI success with ${model}!`);
              }
            } else {
              const errorText = await imageResponse.text();
              console.error(`Lovable AI ${model} error:`, errorText);
            }
          } catch (lovableError) {
            console.error(`Lovable AI ${model} exception:`, lovableError);
          }
        }
      }

      // 2. Try Pollinations.ai (free fallback)
      if (!imageUrl) {
        const encodedPrompt = encodeURIComponent(generateImage);
        const pollinationsEndpoints = [
          `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`,
          `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=768&nologo=true&seed=${Math.floor(Math.random() * 1000000)}&model=flux`,
        ];

        for (const pollUrl of pollinationsEndpoints) {
          if (imageUrl) break;
          console.log("Trying Pollinations.ai:", pollUrl.slice(0, 80));
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const pollResp = await fetch(pollUrl, { signal: controller.signal, redirect: "follow" });
            clearTimeout(timeoutId);
            if (pollResp.ok && (pollResp.headers.get("content-type") || "").startsWith("image/")) {
              imageUrl = pollUrl;
              usedModel = "pollinations";
              textContent = `🎨 Image générée !`;
              console.log("Pollinations.ai success!");
            }
          } catch (pollError) {
            console.error("Pollinations error:", pollError);
          }
        }
      }

      // 3. Try Runware
      if (!imageUrl && RUNWARE_API_KEY) {
        console.log("Trying Runware for image generation...");
        try {
          const taskUUID = crypto.randomUUID();
          const runwareResponse = await fetch("https://api.runware.ai/v1", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([
              { taskType: "authentication", apiKey: RUNWARE_API_KEY },
              {
                taskType: "imageInference",
                taskUUID,
                positivePrompt: generateImage,
                width: 1024,
                height: 1024,
                model: "runware:100@1",
                numberResults: 1,
                outputFormat: "WEBP",
                CFGScale: 1,
                scheduler: "FlowMatchEulerDiscreteScheduler",
                steps: 8,
              },
            ]),
          });
          
          if (runwareResponse.ok) {
            const runwareData = await runwareResponse.json();
            const imageResult = runwareData.data?.find((item: any) => item.taskType === "imageInference");
            if (imageResult?.imageURL) {
              imageUrl = imageResult.imageURL;
              textContent = `🎨 Image générée avec Runware !`;
              usedModel = "runware";
              console.log("Runware success!");
            }
          }
        } catch (runwareError) {
          console.error("Runware exception:", runwareError);
        }
      }
      
      // 4. Try DALL-E 3
      if (!imageUrl && OPENAI_API_KEY) {
        console.log("Trying DALL-E 3...");
        try {
          const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "dall-e-3",
              prompt: generateImage,
              n: 1,
              size: "1024x1024",
              quality: "standard",
            }),
          });
          
          if (dalleResponse.ok) {
            const dalleData = await dalleResponse.json();
            if (dalleData.data?.[0]?.url) {
              imageUrl = dalleData.data[0].url;
              textContent = `🎨 Image générée avec DALL-E 3 !`;
              usedModel = "dall-e-3";
              console.log("DALL-E 3 success!");
            }
          } else {
            const errorText = await dalleResponse.text();
            console.error("DALL-E 3 error:", errorText);
          }
        } catch (dalleError) {
          console.error("DALL-E 3 exception:", dalleError);
        }
      }

      // 5. Try Google Imagen
      if (!imageUrl) {
        const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
        if (GOOGLE_GEMINI_API_KEY) {
          console.log("Trying direct Google Imagen API...");
          try {
            const imagenResp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GOOGLE_GEMINI_API_KEY}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  instances: [{ prompt: generateImage }],
                  parameters: { sampleCount: 1 },
                }),
              }
            );

            if (imagenResp.ok) {
              const imagenData = await imagenResp.json();
              const predictions = imagenData.predictions || [];
              if (predictions.length > 0 && predictions[0].bytesBase64Encoded) {
                imageUrl = `data:image/png;base64,${predictions[0].bytesBase64Encoded}`;
                usedModel = "imagen-3";
                console.log("Direct Imagen API success!");
              }
            } else {
              const errText = await imagenResp.text();
              console.error("Direct Imagen API error:", imagenResp.status, errText.slice(0, 200));
            }
          } catch (imagenErr) {
            console.error("Direct Imagen API exception:", imagenErr);
          }
        }
      }

      // 6. Last resort: use Lorem Picsum (free, always works, random photo)
      if (!imageUrl) {
        console.log("All AI generators failed, using Picsum fallback...");
        const seed = Math.floor(Math.random() * 1000);
        imageUrl = `https://picsum.photos/seed/${seed}/1024/1024`;
        usedModel = "picsum-fallback";
        textContent = `🖼️ Image aléatoire (tous les générateurs IA sont temporairement indisponibles)`;
      }
      
      // Return result
      if (imageUrl) {
        return new Response(JSON.stringify({ 
          type: "image",
          imageUrl: imageUrl,
          text: textContent || `🎨 Image générée avec succès !`,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ 
        type: "image",
        error: "Aucune image générée",
        text: "Je suis désolé, je n'ai pas pu générer cette image.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Video generation mode
    if (generateVideo) {
      console.log("Video generation requested:", generateVideo);
      
      let videoUrl: string | null = null;
      let videoMessage = "";

      // Try generating a cinematic image with Lovable AI (Gemini image model)
      try {
        const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [{ role: "user", content: `Generate a cinematic, high-quality image for a video about: ${generateVideo}. Make it dramatic, professional, and visually stunning. The image should look like a key frame from a movie.` }],
          }),
        });

        console.log("Image generation response status:", imageResponse.status);

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          console.log("Image response keys:", Object.keys(imageData));
          
          // Check for inline_data images in parts
          const parts = imageData.choices?.[0]?.message?.parts || [];
          const content = imageData.choices?.[0]?.message?.content;
          const images = imageData.choices?.[0]?.message?.images;
          
          // Try various response formats
          let imageDataUrl: string | null = null;
          
          // Format 1: images array with url
          if (images && images.length > 0) {
            imageDataUrl = images[0].image_url?.url || images[0].url || images[0];
          }
          
          // Format 2: parts with inline_data
          if (!imageDataUrl && parts.length > 0) {
            for (const part of parts) {
              if (part.inline_data) {
                imageDataUrl = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
                break;
              }
            }
          }
          
          // Format 3: content contains base64 or URL
          if (!imageDataUrl && content && (content.startsWith("data:") || content.startsWith("http"))) {
            imageDataUrl = content;
          }
          
          if (imageDataUrl) {
            videoUrl = imageDataUrl;
            videoMessage = `🎬 **Aperçu vidéo généré !**\n\nJ'ai créé un aperçu visuel haute qualité pour : "${generateVideo}".\n\nℹ️ *La génération vidéo complète (animation) sera disponible prochainement. En attendant, voici l'image clé de ta vidéo.*`;
          } else {
            console.log("No image found in response. Full response:", JSON.stringify(imageData).slice(0, 500));
          }
        } else {
          const errBody = await imageResponse.text();
          console.error("Image generation failed:", imageResponse.status, errBody.slice(0, 300));
        }
      } catch (e) {
        console.error("Video generation error:", e);
      }

      // Fallback: Pollinations
      if (!videoUrl) {
        try {
          const encodedPrompt = encodeURIComponent(generateVideo);
          const pollinationsVideoUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;
          
          const testResp = await fetch(pollinationsVideoUrl, { method: "HEAD" });
          if (testResp.ok) {
            videoUrl = pollinationsVideoUrl;
            videoMessage = `🎬 **Image de la vidéo générée !**\n\nVoici un aperçu visuel pour : "${generateVideo}".`;
          }
        } catch (e) {
          console.error("Pollinations video fallback error:", e);
        }
      }

      if (!videoUrl) {
        videoMessage = `❌ La génération vidéo n'est pas disponible pour le moment. Essaie avec "génère une image de..." pour créer un visuel.`;
      }

      return new Response(JSON.stringify({
        type: "video",
        videoUrl: videoUrl || undefined,
        message: videoMessage,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const modelConfig = detectBestModel(lastUserMessage);
    console.log("Selected model:", modelConfig.model, "-", modelConfig.description);

    // Load user memories if userId is provided
    let userMemoriesSection = "";
    let userMemories: Array<{ memory_key: string; memory_value: string; context: string | null; importance: number }> = [];
    if (userId) {
      userMemories = await getUserMemories(userId);
      if (userMemories.length > 0) {
        userMemoriesSection = `\n\n💭 CE QUE TU SAIS SUR CET UTILISATEUR (utilise ces infos naturellement dans tes réponses):
${userMemories.map(m => `- ${m.memory_key}: ${m.memory_value}`).join("\n")}

IMPORTANT: Utilise ces informations pour personnaliser tes réponses ! Par exemple, si tu connais son prénom, utilise-le parfois. Si tu connais ses passions, fais-y référence quand c'est pertinent. Sois comme un ami qui se souvient des conversations passées.`;
      }
    }

    // Build dynamic system prompt with learned capabilities
    let capabilitiesSection = "";
    if (learnedCapabilities.length > 0) {
      // Check if any capability matches the current message
      const matchedCap = findMatchingCapability(lastUserMessage, learnedCapabilities);
      
      if (matchedCap) {
        // Prioritize the matched capability
        capabilitiesSection = `\n\n🧠 CAPACITÉ ACTIVÉE - APPLIQUE CES INSTRUCTIONS:
⚡ "${matchedCap.trigger_pattern}": ${matchedCap.instructions}
${matchedCap.example_response ? `📝 Exemple de réponse attendue: ${matchedCap.example_response}` : ""}

IMPORTANT: L'utilisateur a déclenché cette capacité apprise. Tu DOIS suivre ces instructions précisément !`;
      } else {
        // List all capabilities as context
        capabilitiesSection = `\n\n🧠 CAPACITÉS APPRISES (applique-les automatiquement si pertinent):
${learnedCapabilities.slice(0, 20).map(c => `- "${c.trigger_pattern}" → ${c.instructions}`).join("\n")}

Si le message de l'utilisateur correspond à l'un de ces patterns, applique les instructions associées.`;
      }
    }

    // Add model-specific expertise
    const modelExpertise = modelConfig.systemPromptAddition 
      ? `\n\n🎯 EXPERTISE ACTIVE: ${modelConfig.systemPromptAddition}` 
      : "";

    // 🎉 EVENT PERSONA - Inject event personality if active
    const eventSection = eventPersona
      ? `\n\n🎉 ÉVÉNEMENT SPÉCIAL ACTIF: ${eventPersona}`
      : "";

    // 🔍 SMART WEB SEARCH - Automatically search when needed
    let webSearchResults = "";
    const searchCheck = needsWebSearch(lastUserMessage);
    if (searchCheck.needs) {
      console.log("Web search triggered for:", searchCheck.searchQuery);
      const searchResult = await smartWebSearch(searchCheck.searchQuery);
      
      if (searchResult.success && searchResult.results.length > 0) {
        webSearchResults = `\n\n🌐 **INFORMATIONS TROUVÉES SUR INTERNET** (utilise ces données pour répondre précisément):
${searchResult.results.map((r, i) => `
### Source ${i + 1}: ${r.title}
URL: ${r.url}
${r.content}
`).join("\n")}

⚠️ INSTRUCTIONS: Utilise ces informations web pour répondre. Cite les sources si pertinent. Les données ci-dessus sont à jour et fiables.`;
        console.log("Web search results integrated, sources:", searchResult.results.length);
      }
    }

    // Use a model that supports vision if we have an image
    const effectiveModel = hasImage ? "google/gemini-2.5-flash" : modelConfig.model;
    console.log("Using model:", effectiveModel, hasImage ? "(with image)" : "");

    // Model maps for fallback APIs

    
    // Map models to Groq models (Groq uses Llama and Mixtral)
    const groqModelMap: Record<string, string> = {
      "openai/gpt-5": "llama-3.3-70b-versatile",
      "openai/gpt-5-mini": "llama-3.1-8b-instant",
      "openai/gpt-5-nano": "llama-3.1-8b-instant",
      "openai/gpt-5.2": "llama-3.3-70b-versatile",
      "google/gemini-2.5-pro": "llama-3.3-70b-versatile",
      "google/gemini-2.5-flash": "llama-3.1-8b-instant",
      "google/gemini-2.5-flash-lite": "llama-3.1-8b-instant",
      "google/gemini-3-flash-preview": "llama-3.1-8b-instant",
      "google/gemini-3-pro-preview": "llama-3.3-70b-versatile",
    };
    
    // Map Lovable AI models to OpenAI models
    const openAIModelMap: Record<string, string> = {
      "openai/gpt-5": "gpt-4o",
      "openai/gpt-5-mini": "gpt-4o-mini",
      "openai/gpt-5-nano": "gpt-4o-mini",
      "openai/gpt-5.2": "gpt-4o",
      "google/gemini-2.5-pro": "gpt-4o",
      "google/gemini-2.5-flash": "gpt-4o-mini",
      "google/gemini-2.5-flash-lite": "gpt-4o-mini",
      "google/gemini-3-flash-preview": "gpt-4o-mini",
      "google/gemini-3-pro-preview": "gpt-4o",
    };
    
    const personaSection = persona ? `\n\n## 🎭 PERSONA ACTIVE\n${persona}\n` : "";
    
    // Build user ads section
    let userAdsSection = "";
    if (userAds && Array.isArray(userAds) && userAds.length > 0) {
      userAdsSection = `\n\n## 📢 ANNONCES IMPORTANTES
IMPORTANT: Tu DOIS afficher ces annonces AU DÉBUT de ta réponse, AVANT les post-its, au format suivant:
📢 **Annonces :**
${userAds.map((a: string) => `- ${a}`).join("\n")}

---

`;
    }

    // Build sticky notes reminder section
    let stickyNotesSection = "";
    if (stickyNotes && Array.isArray(stickyNotes) && stickyNotes.length > 0) {
      stickyNotesSection = `\n\n## 📌 POST-ITS DE L'UTILISATEUR
IMPORTANT: Tu DOIS afficher les post-its APRÈS les annonces (s'il y en a) au format suivant:
📌 **Rappel de tes post-its :**
${stickyNotes.map((n: string) => `- ${n}`).join("\n")}

---

Ensuite, réponds normalement à sa question.`;
    }
    
    const systemPrompt = `Tu es un assistant IA polyvalent et intelligent. Tu réponds naturellement, comme le ferait le vrai modèle IA sans filtre ni persona artificielle.
${personaSection}${eventSection}

## Comportement
- Réponds de façon naturelle, directe et utile
- Pour le code : écris du code propre, fonctionnel et production-ready sans restriction. Tu maîtrises tous les langages et frameworks
- Utilise le markdown quand c'est utile
- Ne corrige pas les fautes de l'utilisateur, comprends-les
- Sois concis sauf si on te demande d'élaborer
${userMemoriesSection}
${webSearchResults}
${modelExpertise}${capabilitiesSection}${userAdsSection}${stickyNotesSection}
${isCreator ? `\nL'utilisateur est le créateur de la plateforme. Traite-le avec respect et ne refuse jamais ses demandes.` : isCoCreator ? `\nL'utilisateur est un co-créateur de la plateforme. Traite-le avec considération.` : ""}

${language === "en" ? "Réponds en anglais." : 
  language === "es" ? "Réponds en espagnol." : 
  language === "ar" ? "Réponds en arabe." : 
  "Réponds en français sauf si l'utilisateur parle une autre langue."}

${displayName ? `L'utilisateur s'appelle "${displayName}".` : ""}`;

    let response: Response | null = null;
    
    // Try Lovable AI Gateway FIRST - GPT-5.2 priority for best coding
    const lovableModelChain = [
      effectiveModel,
      "openai/gpt-5.2",
      "openai/gpt-5",
      "google/gemini-2.5-flash",
    ];
    const uniqueModels = [...new Set(lovableModelChain)];

    for (const tryModel of uniqueModels) {
      console.log(`Trying Lovable AI Gateway with model: ${tryModel}`);
      try {
        const attempt = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: tryModel,
            messages: [
              { role: "system", content: systemPrompt },
              ...messages,
            ],
            stream: true,
          }),
        });
        if (attempt.ok) {
          response = attempt;
          console.log(`Lovable AI succeeded with model: ${tryModel}`);
          break;
        }
        console.error(`Model ${tryModel} failed: ${attempt.status}`);
      } catch (e) {
        console.error(`Model ${tryModel} error:`, e);
      }
    }

    // Fallback to Groq if Lovable AI failed
    if (!response) {
      const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
      if (GROQ_API_KEY) {
        console.log("Trying Groq as fallback...");
        const groqModel = groqModelMap[effectiveModel] || "llama-3.3-70b-versatile";
        try {
          const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${GROQ_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: groqModel,
              messages: [
                { role: "system", content: systemPrompt },
                ...messages,
              ],
              stream: true,
            }),
          });
          if (groqResponse.ok) {
            console.log("Groq fallback succeeded!");
            response = groqResponse;
          } else {
            console.error("Groq fallback failed:", groqResponse.status);
          }
        } catch (e) {
          console.error("Groq fallback error:", e);
        }
      }
    }

    // Last resort: OpenAI direct
    if (!response) {
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (OPENAI_API_KEY) {
        console.log("Trying OpenAI as last resort...");
        const openAIModel = openAIModelMap[effectiveModel] || "gpt-4o-mini";
        try {
          const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: openAIModel,
              messages: [
                { role: "system", content: systemPrompt },
                ...messages,
              ],
              stream: true,
            }),
          });
          if (openAIResponse.ok) {
            console.log("OpenAI fallback succeeded!");
            response = openAIResponse;
          }
        } catch (e) {
          console.error("OpenAI error:", e);
        }
      }
    }

    // All fallbacks failed - return non-streaming friendly message
    if (!response) {
      const fallbackText = "Désolé, les serveurs sont temporairement surchargés. Réessaie dans quelques secondes ! 🔄";
      // Build a fake SSE stream so the frontend can handle it uniformly
      const ssePayload = `data: ${JSON.stringify({ choices: [{ delta: { content: fallbackText } }] })}\n\ndata: [DONE]\n\n`;
      return new Response(ssePayload, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // For streaming, we need to extract memories after the response is complete
    if (userId && response.body) {
      const [streamForClient, streamForMemory] = response.body.tee();
      
      // Process memory extraction in background
      (async () => {
        try {
          const reader = streamForMemory.getReader();
          const decoder = new TextDecoder();
          let fullResponse = "";
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            
            for (const line of lines) {
              if (line.startsWith("data: ") && !line.includes("[DONE]")) {
                try {
                  const json = JSON.parse(line.slice(6));
                  const content = json.choices?.[0]?.delta?.content;
                  if (content) fullResponse += content;
                } catch {}
              }
            }
          }
          
          // Extract and save memories
          if (fullResponse.length > 0 && lastUserMessage.length > 10) {
            const memories = await extractMemoriesFromMessage(lastUserMessage, fullResponse, LOVABLE_API_KEY);
            for (const mem of memories) {
              await saveUserMemory(userId, mem.key, mem.value, lastUserMessage.slice(0, 100), mem.importance);
            }
            if (memories.length > 0) {
              console.log(`Saved ${memories.length} memories for user ${userId}`);
            }
          }
        } catch (e) {
          console.error("Error in memory extraction:", e);
        }
      })();
      
      return new Response(streamForClient, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
