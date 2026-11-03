import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

interface BrevoEmailRequest {
  to: string
  toName?: string
  subject: string
  html: string
  senderEmail?: string
  senderName?: string
}

async function sendBrevoEmail(params: BrevoEmailRequest): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = Deno.env.get('BREVO_API_KEY')
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not configured')
  }

  const senderEmail = params.senderEmail || Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@omni-ai-pro.com'
  const senderName = params.senderName || 'Omni AI Pro'

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: params.to, name: params.toName || params.to }],
      subject: params.subject,
      htmlContent: params.html,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Brevo API error:', data)
    return { success: false, error: data?.message || `Brevo error ${response.status}` }
  }

  return { success: true, messageId: data.messageId }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { to, toName, subject, html, senderEmail, senderName, templateName } = await req.json()

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await sendBrevoEmail({ to, toName, subject, html, senderEmail, senderName })

    // Log to email_send_log if supabase is available
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await supabase.from('email_send_log').insert({
          message_id: result.messageId || crypto.randomUUID(),
          template_name: templateName || 'brevo_manual',
          recipient_email: to,
          status: result.success ? 'sent' : 'failed',
          error_message: result.error || null,
        })
      }
    } catch (logError) {
      console.error('Failed to log email send:', logError)
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Send email error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
