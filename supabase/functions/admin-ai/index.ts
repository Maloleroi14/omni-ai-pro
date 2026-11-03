import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AdminAction {
  action: string;
  params: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, messages: chatHistory, stream: wantStream } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Gather comprehensive context
    const [settingsRes, blockedRes, profilesRes, creditsRes, bannedRes, conversationsRes, capabilitiesRes] = await Promise.all([
      supabase.from("admin_settings").select("*"),
      supabase.from("blocked_features").select("*"),
      supabase.from("profiles").select("user_id, email, display_name, created_at"),
      supabase.from("user_credits").select("user_id, credits"),
      supabase.from("banned_users").select("user_id, banned_at, reason"),
      supabase.from("conversations").select("id, user_id, title, type, created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("learned_capabilities").select("*"),
    ]);

    const settings = settingsRes.data || [];
    const blocked = blockedRes.data || [];
    const profiles = profilesRes.data || [];
    const credits = creditsRes.data || [];
    const banned = bannedRes.data || [];
    const conversations = conversationsRes.data || [];
    const capabilities = capabilitiesRes.data || [];

    const totalUsers = profiles.length;
    const creditsMap = new Map(credits.map(c => [c.user_id, c.credits]));
    const bannedIds = new Set(banned.map(b => b.user_id));
    const unlimitedUsers = credits.filter(c => c.credits >= 999999).length;
    const activeToday = conversations.filter(c => {
      const d = new Date(c.created_at);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;

    const getSetting = (key: string) => settings.find(s => s.setting_key === key)?.setting_value;

    const systemPrompt = `Tu es l'assistant administrateur ultra-puissant d'OmniAI Pro. Tu as accès complet à la base de données et peux effectuer de nombreuses actions de gestion.

## DONNÉES EN TEMPS RÉEL

### Statistiques
- Utilisateurs inscrits: ${totalUsers}
- Utilisateurs bannis: ${banned.length}
- Utilisateurs avec crédits illimités: ${unlimitedUsers}
- Conversations actives aujourd'hui: ${activeToday}
- Conversations totales récentes: ${conversations.length}

### Paramètres actuels
- Crédits journaliers: ${JSON.stringify(getSetting("daily_credits") || { amount: 15 })}
- Coûts des crédits: ${JSON.stringify(getSetting("credit_costs") || { message: 1, generation: 3, coding: 5 })}
- Présentation du site: ${JSON.stringify(getSetting("site_presentation") || {})}
- Co-créateurs: ${JSON.stringify((getSetting("co_creator_email") as any)?.emails || [])}
- Enquêteurs: ${JSON.stringify((getSetting("enqueteur_emails") as any)?.emails || [])}

### Fonctionnalités bloquées
${blocked.map(b => `- ${b.feature_name}: ${b.is_blocked ? "🔴 Bloqué" : "🟢 Actif"}`).join("\n") || "Aucune"}

### Capacités apprises
${capabilities.map(c => `- ${c.capability_name} (utilisé ${c.usage_count}x)`).join("\n") || "Aucune"}

### Utilisateurs (${profiles.length})
${profiles.slice(0, 50).map(p => {
  const cr = creditsMap.get(p.user_id) ?? 0;
  const isBanned = bannedIds.has(p.user_id);
  return `- ${p.display_name || "?"} (${p.email}) | Crédits: ${cr >= 999999 ? "♾️" : cr}${isBanned ? " | 🚫 BANNI" : ""}`;
}).join("\n")}

### Utilisateurs bannis
${banned.map(b => {
  const prof = profiles.find(p => p.user_id === b.user_id);
  return `- ${prof?.email || b.user_id} — Raison: ${b.reason || "Non spécifiée"} — Le ${new Date(b.banned_at).toLocaleDateString("fr-FR")}`;
}).join("\n") || "Aucun"}

## ACTIONS DISPONIBLES

Réponds avec un bloc \`\`\`action pour exécuter une action :

### Gestion des crédits
\`\`\`action
{ "action": "set_daily_credits", "params": { "amount": 20 } }
\`\`\`
\`\`\`action
{ "action": "set_credit_costs", "params": { "message": 1, "generation": 3, "coding": 5 } }
\`\`\`
\`\`\`action
{ "action": "set_user_credits", "params": { "email": "user@example.com", "credits": 100 } }
\`\`\`
\`\`\`action
{ "action": "set_unlimited", "params": { "email": "user@example.com" } }
\`\`\`
\`\`\`action
{ "action": "remove_unlimited", "params": { "email": "user@example.com" } }
\`\`\`

### Gestion des utilisateurs
\`\`\`action
{ "action": "ban_user", "params": { "email": "user@example.com", "reason": "Raison du ban" } }
\`\`\`
\`\`\`action
{ "action": "unban_user", "params": { "email": "user@example.com" } }
\`\`\`

### Gestion des rôles
\`\`\`action
{ "action": "add_co_creator", "params": { "email": "user@example.com" } }
\`\`\`
\`\`\`action
{ "action": "remove_co_creator", "params": { "email": "user@example.com" } }
\`\`\`
\`\`\`action
{ "action": "add_enqueteur", "params": { "email": "user@example.com" } }
\`\`\`
\`\`\`action
{ "action": "remove_enqueteur", "params": { "email": "user@example.com" } }
\`\`\`

### Fonctionnalités
\`\`\`action
{ "action": "block_feature", "params": { "feature": "nom" } }
\`\`\`
\`\`\`action
{ "action": "unblock_feature", "params": { "feature": "nom" } }
\`\`\`

### Présentation
\`\`\`action
{ "action": "set_presentation", "params": { "title": "...", "subtitle": "...", "description": "..." } }
\`\`\`

### Mode maintenance
\`\`\`action
{ "action": "set_maintenance", "params": { "enabled": true, "message": "Site en maintenance..." } }
\`\`\`
\`\`\`action
{ "action": "set_maintenance", "params": { "enabled": false } }
\`\`\`

### Requêtes personnalisées
\`\`\`action
{ "action": "query_messages", "params": { "user_email": "user@example.com", "limit": 20 } }
\`\`\`
\`\`\`action
{ "action": "count_messages_today", "params": {} }
\`\`\`

## RÈGLES
- Réponds en français, de manière professionnelle et concise
- Quand tu modifies un paramètre, inclus TOUJOURS le bloc action
- Explique ce que tu fais et confirme après l'action
- Tu peux exécuter PLUSIEURS actions dans un même message (plusieurs blocs action)
- Donne des analyses et recommandations quand on te le demande
- Tu peux accéder à toutes les données utilisateurs et les analyser`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
    ];

    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory) {
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    aiMessages.push({ role: "user", content: prompt });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (wantStream) {
      // Streaming mode
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: aiMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("AI API error:", errText);
        throw new Error("AI request failed");
      }

      // We need to collect the full response for action execution while streaming
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      // Process in background
      (async () => {
        try {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            // Forward to client
            await writer.write(encoder.encode(chunk));
            
            // Extract content for action processing
            let newlineIndex: number;
            while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
              let line = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) fullContent += content;
              } catch {}
            }
          }

          // After streaming is done, execute actions
          const actionRegex = /```action\s*([\s\S]*?)\s*```/g;
          let match;
          const results: string[] = [];

          while ((match = actionRegex.exec(fullContent)) !== null) {
            try {
              const parsedAction: AdminAction = JSON.parse(match[1].trim());
              const result = await executeAdminAction(supabase, parsedAction, profiles);
              results.push(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
              
              // Log to audit
              await logAuditAction(supabase, parsedAction, result, "admin-ai");
            } catch (e) {
              console.error("Failed to parse/execute action:", e);
              results.push(`❌ Erreur d'exécution`);
            }
          }

          if (results.length > 0) {
            const actionResults = `\n\ndata: ${JSON.stringify({ choices: [{ delta: { content: "\n\n---\n" + results.join("\n") } }] })}\n\n`;
            await writer.write(encoder.encode(actionResults));
          }

          await writer.write(encoder.encode("data: [DONE]\n\n"));
          await writer.close();
        } catch (e) {
          console.error("Stream processing error:", e);
          await writer.close();
        }
      })();

      return new Response(readable, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming fallback
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      throw new Error("AI request failed: " + errText);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Pas de réponse";

    const actionRegex = /```action\s*([\s\S]*?)\s*```/g;
    let match;
    const results: string[] = [];

    while ((match = actionRegex.exec(aiResponse)) !== null) {
      try {
        const parsedAction: AdminAction = JSON.parse(match[1].trim());
        const result = await executeAdminAction(supabase, parsedAction, profiles);
        results.push(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
        await logAuditAction(supabase, parsedAction, result, "admin-ai");
      } catch (e) {
        console.error("Failed to parse/execute action:", e);
        results.push(`❌ Erreur d'exécution`);
      }
    }

    const cleanResponse = aiResponse.replace(/```action[\s\S]*?```/g, "").trim();
    const finalResponse = results.length > 0
      ? `${cleanResponse}\n\n---\n${results.join("\n")}`
      : cleanResponse;

    return new Response(JSON.stringify({ response: finalResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Admin AI error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function logAuditAction(supabase: any, action: AdminAction, result: any, adminEmail: string) {
  try {
    await supabase.from("audit_logs").insert({
      admin_email: adminEmail,
      admin_user_id: "00000000-0000-0000-0000-000000000000",
      action_type: action.action,
      action_details: { params: action.params, result: result.message, success: result.success },
      target_email: action.params.email || action.params.user_email || null,
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}

async function executeAdminAction(supabase: any, action: AdminAction, profiles: any[]) {
  const findUserByEmail = (email: string) => profiles.find(p => p.email === email);

  switch (action.action) {
    case "set_daily_credits": {
      const { error } = await supabase.from("admin_settings").upsert({
        setting_key: "daily_credits",
        setting_value: { amount: Number(action.params.amount) },
        updated_at: new Date().toISOString(),
      }, { onConflict: "setting_key" });
      if (error) throw error;
      return { success: true, message: `Crédits journaliers → ${action.params.amount}` };
    }

    case "set_credit_costs": {
      const { error } = await supabase.from("admin_settings").upsert({
        setting_key: "credit_costs",
        setting_value: action.params,
        updated_at: new Date().toISOString(),
      }, { onConflict: "setting_key" });
      if (error) throw error;
      return { success: true, message: `Coûts des crédits mis à jour` };
    }

    case "set_user_credits": {
      const user = findUserByEmail(action.params.email);
      if (!user) return { success: false, message: `Utilisateur ${action.params.email} introuvable` };
      const { error } = await supabase.from("user_credits").update({ credits: Number(action.params.credits) }).eq("user_id", user.user_id);
      if (error) throw error;
      return { success: true, message: `Crédits de ${action.params.email} → ${action.params.credits}` };
    }

    case "set_unlimited": {
      const user = findUserByEmail(action.params.email);
      if (!user) return { success: false, message: `Utilisateur ${action.params.email} introuvable` };
      const { error } = await supabase.from("user_credits").update({ credits: 999999 }).eq("user_id", user.user_id);
      if (error) throw error;
      return { success: true, message: `${action.params.email} → Crédits illimités ♾️` };
    }

    case "remove_unlimited": {
      const user = findUserByEmail(action.params.email);
      if (!user) return { success: false, message: `Utilisateur ${action.params.email} introuvable` };
      const settingsRes = await supabase.from("admin_settings").select("setting_value").eq("setting_key", "daily_credits").single();
      const defaultCredits = (settingsRes.data?.setting_value as any)?.amount || 15;
      const { error } = await supabase.from("user_credits").update({ credits: defaultCredits }).eq("user_id", user.user_id);
      if (error) throw error;
      return { success: true, message: `${action.params.email} → ${defaultCredits} crédits (illimité retiré)` };
    }

    case "ban_user": {
      const user = findUserByEmail(action.params.email);
      if (!user) return { success: false, message: `Utilisateur ${action.params.email} introuvable` };
      const { error } = await supabase.from("banned_users").upsert({
        user_id: user.user_id,
        banned_by: "admin-ai",
        reason: action.params.reason || "Banni via Assistant IA",
      }, { onConflict: "user_id" });
      if (error) throw error;
      return { success: true, message: `${action.params.email} banni` };
    }

    case "unban_user": {
      const user = findUserByEmail(action.params.email);
      if (!user) return { success: false, message: `Utilisateur ${action.params.email} introuvable` };
      const { error } = await supabase.from("banned_users").delete().eq("user_id", user.user_id);
      if (error) throw error;
      return { success: true, message: `${action.params.email} débanni` };
    }

    case "add_co_creator":
    case "remove_co_creator": {
      const { data } = await supabase.from("admin_settings").select("setting_value").eq("setting_key", "co_creator_email").single();
      let emails: string[] = (data?.setting_value as any)?.emails || [];
      if (action.action === "add_co_creator") {
        if (!emails.includes(action.params.email)) emails.push(action.params.email);
      } else {
        emails = emails.filter((e: string) => e !== action.params.email);
      }
      await supabase.from("admin_settings").upsert({
        setting_key: "co_creator_email",
        setting_value: { emails },
        updated_at: new Date().toISOString(),
      }, { onConflict: "setting_key" });
      return { success: true, message: `Co-créateur ${action.action === "add_co_creator" ? "ajouté" : "retiré"}: ${action.params.email}` };
    }

    case "add_enqueteur":
    case "remove_enqueteur": {
      const { data } = await supabase.from("admin_settings").select("setting_value").eq("setting_key", "enqueteur_emails").single();
      let emails: string[] = (data?.setting_value as any)?.emails || [];
      if (action.action === "add_enqueteur") {
        if (!emails.includes(action.params.email)) emails.push(action.params.email);
      } else {
        emails = emails.filter((e: string) => e !== action.params.email);
      }
      await supabase.from("admin_settings").upsert({
        setting_key: "enqueteur_emails",
        setting_value: { emails },
        updated_at: new Date().toISOString(),
      }, { onConflict: "setting_key" });
      return { success: true, message: `Enquêteur ${action.action === "add_enqueteur" ? "ajouté" : "retiré"}: ${action.params.email}` };
    }

    case "block_feature": {
      const { data: existing } = await supabase.from("blocked_features").select("id").eq("feature_name", action.params.feature).maybeSingle();
      if (existing) {
        await supabase.from("blocked_features").update({ is_blocked: true }).eq("feature_name", action.params.feature);
      } else {
        await supabase.from("blocked_features").insert({ feature_name: action.params.feature, is_blocked: true });
      }
      return { success: true, message: `Fonctionnalité bloquée: ${action.params.feature}` };
    }

    case "unblock_feature": {
      await supabase.from("blocked_features").update({ is_blocked: false }).eq("feature_name", action.params.feature);
      return { success: true, message: `Fonctionnalité débloquée: ${action.params.feature}` };
    }

    case "set_presentation": {
      const { data: current } = await supabase.from("admin_settings").select("setting_value").eq("setting_key", "site_presentation").single();
      const merged = { ...(current?.setting_value as any || {}), ...action.params };
      await supabase.from("admin_settings").upsert({
        setting_key: "site_presentation",
        setting_value: merged,
        updated_at: new Date().toISOString(),
      }, { onConflict: "setting_key" });
      return { success: true, message: `Présentation mise à jour` };
    }

    case "set_maintenance": {
      await supabase.from("admin_settings").upsert({
        setting_key: "maintenance_mode",
        setting_value: {
          enabled: action.params.enabled,
          message: action.params.message || "Le site est en maintenance. Revenez bientôt !",
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: "setting_key" });
      return { success: true, message: `Mode maintenance ${action.params.enabled ? "activé" : "désactivé"}` };
    }

    case "query_messages": {
      const user = findUserByEmail(action.params.user_email);
      if (!user) return { success: false, message: `Utilisateur introuvable` };
      const { data: msgs } = await supabase.from("messages").select("content, role, created_at")
        .eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(action.params.limit || 20);
      return { success: true, message: `${msgs?.length || 0} messages trouvés:\n${(msgs || []).map((m: any) => `[${m.role}] ${m.content.substring(0, 100)}`).join("\n")}` };
    }

    case "count_messages_today": {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase.from("messages").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString());
      return { success: true, message: `${count || 0} messages envoyés aujourd'hui` };
    }

    default:
      return { success: false, message: `Action inconnue: ${action.action}` };
  }
}
