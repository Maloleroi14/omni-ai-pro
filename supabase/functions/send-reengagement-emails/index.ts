import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const INACTIVITY_DAYS = 3
const COOLDOWN_DAYS = 7
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

function buildEmailHtml(displayName: string): string {
  const name = displayName || 'utilisateur'
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu nous manques ! - Omni AI Pro</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f1f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f1f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#6c3bfa,#8b5cf6);padding:40px 32px;text-align:center;">
              <img src="https://www.omni-ai-pro.com/ai-logo.png" alt="Omni AI Pro" width="64" height="64" style="display:block;margin:0 auto 16px;border-radius:16px;" />
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                Omni AI Pro
              </h1>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">
                Ton assistant IA intelligent
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="margin:0 0 16px;font-size:22px;color:#1e1b3a;font-weight:700;">
                Salut ${name} 👋
              </h2>
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#4a4568;">
                Ça fait quelques jours qu'on ne t'a pas vu sur <strong>Omni AI Pro</strong> ! 
                Ton assistant IA t'attend avec de nouvelles capacités.
              </p>
              <div style="background:#f8f7ff;border-radius:12px;padding:24px;margin:24px 0;">
                <p style="margin:0 0 12px;font-size:15px;color:#6c3bfa;font-weight:600;">
                  🚀 Ce que tu peux faire aujourd'hui :
                </p>
                <ul style="margin:0;padding:0 0 0 20px;color:#4a4568;font-size:14px;line-height:2;">
                  <li>Discuter avec une IA ultra-intelligente</li>
                  <li>Générer des images par IA</li>
                  <li>Rechercher sur le web en temps réel</li>
                  <li>Créer des sites web avec l'éditeur de code</li>
                </ul>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:16px 0 8px;">
                    <a href="https://www.omni-ai-pro.com" 
                       style="display:inline-block;background:linear-gradient(135deg,#6c3bfa,#8b5cf6);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:10px;font-size:16px;font-weight:600;letter-spacing:0.3px;">
                      Revenir sur Omni AI Pro →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background:#f8f7ff;text-align:center;border-top:1px solid #e9e5f5;">
              <p style="margin:0;font-size:12px;color:#9b95b0;">
                © ${new Date().getFullYear()} Omni AI Pro — Tous droits réservés
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#b0aac4;">
                Tu reçois cet email car tu es inscrit sur Omni AI Pro.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

async function sendViaBrevo(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = Deno.env.get('BREVO_API_KEY')
  if (!apiKey) throw new Error('BREVO_API_KEY not configured')

  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@omni-ai-pro.com'

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Omni AI Pro', email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    return { success: false, error: data?.message || `Brevo error ${response.status}` }
  }
  return { success: true }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - INACTIVITY_DAYS)

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, email, display_name')

    if (profilesError) throw profilesError

    const sentCount = { sent: 0, skipped: 0 }

    for (const profile of profiles || []) {
      const { data: lastConnection } = await supabase
        .from('connection_logs')
        .select('logged_in_at')
        .eq('user_id', profile.user_id)
        .order('logged_in_at', { ascending: false })
        .limit(1)

      const lastVisit = lastConnection?.[0]?.logged_in_at
      if (!lastVisit) { sentCount.skipped++; continue }

      const lastVisitDate = new Date(lastVisit)
      if (lastVisitDate > cutoffDate) { sentCount.skipped++; continue }

      const cooldownDate = new Date()
      cooldownDate.setDate(cooldownDate.getDate() - COOLDOWN_DAYS)

      const { data: recentEmail } = await supabase
        .from('email_send_log')
        .select('id')
        .eq('recipient_email', profile.email)
        .eq('template_name', 'reengagement')
        .eq('status', 'sent')
        .gte('created_at', cooldownDate.toISOString())
        .limit(1)

      if (recentEmail && recentEmail.length > 0) { sentCount.skipped++; continue }

      const { data: suppressed } = await supabase
        .from('suppressed_emails')
        .select('id')
        .eq('email', profile.email)
        .limit(1)

      if (suppressed && suppressed.length > 0) { sentCount.skipped++; continue }

      const html = buildEmailHtml(profile.display_name)
      const subject = `${profile.display_name || 'Hey'}, tu nous manques sur Omni AI Pro ! ✨`

      const result = await sendViaBrevo(profile.email, subject, html)

      // Log result
      await supabase.from('email_send_log').insert({
        message_id: crypto.randomUUID(),
        template_name: 'reengagement',
        recipient_email: profile.email,
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || null,
      })

      if (result.success) {
        sentCount.sent++
      } else {
        console.error(`Failed to send to ${profile.email}:`, result.error)
        sentCount.skipped++
      }
    }

    console.log(`Re-engagement emails: ${sentCount.sent} sent, ${sentCount.skipped} skipped`)

    return new Response(JSON.stringify({ success: true, ...sentCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Re-engagement error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
