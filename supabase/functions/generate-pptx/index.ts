import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import PptxGenJS from "npm:pptxgenjs@3.12.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SlideData {
  title: string;
  bullets?: string[];
  subtitle?: string;
  layout?: "title" | "content" | "two-column" | "image-right" | "image-left";
  leftColumn?: string[];
  rightColumn?: string[];
  imageQuery?: string;
}

async function searchImage(query: string): Promise<string | null> {
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  if (!FIRECRAWL_API_KEY) return null;

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${query} photo high quality`,
        limit: 3,
        scrapeOptions: { formats: ["links"] },
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const results = data.data || [];

    // Try to find an image URL from results
    for (const r of results) {
      const links = r.links || [];
      for (const link of links) {
        if (/\.(jpg|jpeg|png|webp)/i.test(link)) {
          return link;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; type: string } | null> {
  try {
    const resp = await fetch(url, { redirect: "follow" });
    if (!resp.ok) return null;
    const ct = resp.headers.get("content-type") || "";
    if (!ct.includes("image")) return null;
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const ext = ct.includes("png") ? "png" : "jpeg";
    return { data: `image/${ext};base64,${btoa(binary)}`, type: ext };
  } catch {
    return null;
  }
}

async function generateSlideContent(topic: string): Promise<{ title: string; slides: SlideData[] }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
          content: `Tu crées du contenu pour des présentations PowerPoint SIMPLES et NATURELLES. 

RÈGLES IMPORTANTES :
- Écris comme un humain, pas comme une IA. Utilise un ton conversationnel et naturel.
- PAS de listes à puces interminables. Maximum 3-4 points par slide.
- Phrases courtes et percutantes, pas de jargon
- Varie les types de slides : certaines avec juste un titre + une phrase clé, d'autres avec quelques points
- Ajoute des anecdotes, exemples concrets, chiffres marquants
- Chaque slide doit avoir un imageQuery pertinent pour trouver une belle photo illustrative
- Le titre de la présentation doit être accrocheur et simple
- NE PAS faire de slides trop chargées, privilégie la SIMPLICITÉ
- Fais entre 6 et 8 slides maximum`,
        },
        {
          role: "user",
          content: `Crée une présentation PowerPoint simple et naturelle sur : "${topic}"`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "create_presentation",
            description: "Crée une présentation avec des slides",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Titre accrocheur" },
                slides: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      bullets: { type: "array", items: { type: "string" }, description: "2-4 points courts max" },
                      subtitle: { type: "string", description: "Phrase clé ou citation" },
                      layout: { type: "string", enum: ["title", "content", "image-right", "image-left"] },
                      imageQuery: { type: "string", description: "Recherche d'image pertinente pour illustrer cette slide" },
                    },
                    required: ["title", "layout", "imageQuery"],
                  },
                },
              },
              required: ["title", "slides"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "create_presentation" } },
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error("AI error:", response.status, t);
    throw new Error("Erreur lors de la génération du contenu");
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("Pas de contenu généré");

  return JSON.parse(toolCall.function.arguments);
}

async function buildPptx(
  presentation: { title: string; slides: SlideData[] },
  images: Map<number, { data: string; type: string }>
): Promise<Uint8Array> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "OmniAI Pro";
  pptx.title = presentation.title;

  const PRIMARY = "2C3E50";
  const ACCENT = "E74C3C";
  const LIGHT_BG = "F8F9FA";
  const WHITE = "FFFFFF";
  const DARK_TEXT = "2C3E50";
  const GRAY_TEXT = "7F8C8D";
  const SUBTITLE_COLOR = "95A5A6";

  for (let i = 0; i < presentation.slides.length; i++) {
    const s = presentation.slides[i];
    const slide = pptx.addSlide();
    const img = images.get(i);

    if (s.layout === "title" || i === 0) {
      // Title slide
      if (img) {
        // Full background image with overlay
        slide.addImage({ data: img.data, x: 0, y: 0, w: 13.33, h: 7.5, sizing: { type: "cover", w: 13.33, h: 7.5 } });
        slide.addShape(pptx.ShapeType.rect, {
          x: 0, y: 0, w: 13.33, h: 7.5,
          fill: { color: "000000", transparency: 50 },
        });
        slide.addText(s.title, {
          x: 1, y: 2, w: 11, h: 2.5,
          fontSize: 44, bold: true, color: WHITE,
          fontFace: "Calibri", align: "left",
        });
        if (s.subtitle) {
          slide.addText(s.subtitle, {
            x: 1, y: 4.5, w: 11, h: 1,
            fontSize: 22, color: "ECF0F1",
            fontFace: "Calibri", align: "left", italic: true,
          });
        }
      } else {
        slide.background = { color: PRIMARY };
        slide.addText(s.title, {
          x: 1, y: 2, w: 11, h: 2.5,
          fontSize: 44, bold: true, color: WHITE,
          fontFace: "Calibri", align: "left",
        });
        if (s.subtitle) {
          slide.addText(s.subtitle, {
            x: 1, y: 4.5, w: 11, h: 1,
            fontSize: 22, color: SUBTITLE_COLOR,
            fontFace: "Calibri", align: "left", italic: true,
          });
        }
      }
    } else if (s.layout === "image-right" || s.layout === "image-left") {
      // Split layout with image
      slide.background = { color: WHITE };

      const textX = s.layout === "image-right" ? 0.8 : 6.5;
      const imgX = s.layout === "image-right" ? 7 : 0;

      // Title
      slide.addText(s.title, {
        x: textX, y: 0.5, w: 5.8, h: 1,
        fontSize: 28, bold: true, color: DARK_TEXT,
        fontFace: "Calibri",
      });

      // Simple underline
      slide.addShape(pptx.ShapeType.rect, {
        x: textX, y: 1.4, w: 1.2, h: 0.04,
        fill: { color: ACCENT },
      });

      // Bullets
      if (s.bullets && s.bullets.length > 0) {
        const bulletItems = s.bullets.map((t) => ({
          text: t,
          options: {
            fontSize: 15, color: DARK_TEXT, fontFace: "Calibri",
            bullet: { code: "2022", color: ACCENT },
            paraSpaceBefore: 12, paraSpaceAfter: 6, lineSpacing: 22,
          },
        }));
        slide.addText(bulletItems, {
          x: textX, y: 1.8, w: 5.8, h: 4.5,
          valign: "top",
        });
      }

      if (s.subtitle) {
        slide.addText(s.subtitle, {
          x: textX, y: 6.2, w: 5.8, h: 0.8,
          fontSize: 12, color: GRAY_TEXT, italic: true,
          fontFace: "Calibri",
        });
      }

      // Image
      if (img) {
        // Rounded rectangle container effect
        slide.addShape(pptx.ShapeType.roundRect, {
          x: imgX + 0.3, y: 0.5, w: 5.7, h: 6.2,
          fill: { color: LIGHT_BG },
          rectRadius: 0.15,
        });
        slide.addImage({
          data: img.data,
          x: imgX + 0.5, y: 0.7, w: 5.3, h: 5.8,
          sizing: { type: "cover", w: 5.3, h: 5.8 },
          rounding: true,
        });
      } else {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: imgX + 0.3, y: 0.5, w: 5.7, h: 6.2,
          fill: { color: LIGHT_BG },
          rectRadius: 0.15,
        });
      }
    } else {
      // Simple content slide
      slide.background = { color: WHITE };

      // Subtle top accent
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: 13.33, h: 0.06,
        fill: { color: ACCENT },
      });

      slide.addText(s.title, {
        x: 0.8, y: 0.5, w: 11.5, h: 1,
        fontSize: 28, bold: true, color: DARK_TEXT,
        fontFace: "Calibri",
      });

      if (img) {
        // Image on the right, text on the left
        if (s.bullets && s.bullets.length > 0) {
          const bulletItems = s.bullets.map((t) => ({
            text: t,
            options: {
              fontSize: 15, color: DARK_TEXT, fontFace: "Calibri",
              bullet: { code: "2022", color: ACCENT },
              paraSpaceBefore: 12, paraSpaceAfter: 6, lineSpacing: 22,
            },
          }));
          slide.addText(bulletItems, {
            x: 0.8, y: 1.8, w: 6, h: 4.5,
            valign: "top",
          });
        }
        slide.addImage({
          data: img.data,
          x: 7.5, y: 1.8, w: 5, h: 4.5,
          sizing: { type: "cover", w: 5, h: 4.5 },
          rounding: true,
        });
      } else {
        if (s.bullets && s.bullets.length > 0) {
          const bulletItems = s.bullets.map((t) => ({
            text: t,
            options: {
              fontSize: 16, color: DARK_TEXT, fontFace: "Calibri",
              bullet: { code: "2022", color: ACCENT },
              paraSpaceBefore: 14, paraSpaceAfter: 8, lineSpacing: 24,
            },
          }));
          slide.addText(bulletItems, {
            x: 0.8, y: 1.8, w: 11.5, h: 4.5,
            valign: "top",
          });
        }
      }

      if (s.subtitle) {
        slide.addText(s.subtitle, {
          x: 0.8, y: 6.3, w: 11.5, h: 0.7,
          fontSize: 12, color: GRAY_TEXT, italic: true,
          fontFace: "Calibri",
        });
      }
    }

    // Slide number (subtle)
    if (i > 0) {
      slide.addText(`${i + 1}`, {
        x: 12.3, y: 7, w: 0.6, h: 0.3,
        fontSize: 9, color: GRAY_TEXT,
        fontFace: "Calibri", align: "right",
      });
    }
  }

  return pptx.write({ outputType: "uint8array" }) as Promise<Uint8Array>;
}

async function sendEmail(email: string, subject: string, pptxBuffer: Uint8Array, filename: string) {
  const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
  if (!BREVO_API_KEY) throw new Error("BREVO_API_KEY not configured");

  // Convert Uint8Array to base64
  let binary = "";
  for (let i = 0; i < pptxBuffer.length; i++) {
    binary += String.fromCharCode(pptxBuffer[i]);
  }
  const base64Content = btoa(binary);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: "omniaiproultime@gmail.com", name: "OmniAI Pro" },
      to: [{ email }],
      subject,
      htmlContent: `
        <div style="font-family: Calibri, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2C3E50; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 22px;">✨ Votre présentation est prête</h1>
          </div>
          <p style="color: #2C3E50; font-size: 15px; line-height: 1.6;">
            Bonjour,<br><br>
            Votre présentation <strong>"${subject.replace("Présentation : ", "")}"</strong> est en pièce jointe.
          </p>
          <div style="background: #F8F9FA; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 3px solid #E74C3C;">
            <p style="color: #2C3E50; margin: 0; font-size: 13px;">💡 Ouvrez le fichier .pptx avec PowerPoint, Google Slides ou importez-le dans Canva pour le personnaliser.</p>
          </div>
          <p style="color: #95A5A6; font-size: 11px; text-align: center; margin-top: 30px;">
            OmniAI Pro
          </p>
        </div>
      `,
      attachment: [{ content: base64Content, name: filename }],
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error("Brevo error:", response.status, t);
    throw new Error("Erreur lors de l'envoi de l'email");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { topic, email, mode = "send", slides: providedSlides } = body;

    if (!topic) {
      return new Response(JSON.stringify({ error: "Le sujet est requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MODE: preview — generate content + find image URLs, return slide data
    if (mode === "preview") {
      console.log("Preview mode — generating content for:", topic);
      const presentation = await generateSlideContent(topic);

      // Search for image URLs (don't download full images, just URLs)
      const imageUrls: Record<number, string> = {};
      const urlPromises = presentation.slides.map(async (s, i) => {
        if (!s.imageQuery) return;
        const url = await searchImage(s.imageQuery);
        if (url) imageUrls[i] = url;
      });
      await Promise.all(urlPromises);

      return new Response(
        JSON.stringify({
          success: true,
          title: presentation.title,
          slides: presentation.slides.map((s, i) => ({
            ...s,
            imageUrl: imageUrls[i] || null,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MODE: send — build PPTX and email it
    if (!email) {
      return new Response(JSON.stringify({ error: "L'email est requis pour l'envoi" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use provided slides or generate new ones
    let presentation: { title: string; slides: SlideData[] };
    let imageUrlMap: Record<number, string> = {};

    if (providedSlides) {
      presentation = { title: body.title || topic, slides: providedSlides.map((s: any) => ({
        title: s.title,
        bullets: s.bullets,
        subtitle: s.subtitle,
        layout: s.layout,
        imageQuery: s.imageQuery,
      })) };
      // Extract image URLs from provided slides
      providedSlides.forEach((s: any, i: number) => {
        if (s.imageUrl) imageUrlMap[i] = s.imageUrl;
      });
    } else {
      console.log("Generating slide content for:", topic);
      presentation = await generateSlideContent(topic);
      const urlPromises = presentation.slides.map(async (s, i) => {
        if (!s.imageQuery) return;
        const url = await searchImage(s.imageQuery);
        if (url) imageUrlMap[i] = url;
      });
      await Promise.all(urlPromises);
    }

    // Download images as base64
    console.log("Downloading images...");
    const images = new Map<number, { data: string; type: string }>();
    const downloadPromises = Object.entries(imageUrlMap).map(async ([idx, url]) => {
      const img = await fetchImageAsBase64(url);
      if (img) images.set(Number(idx), img);
    });
    await Promise.all(downloadPromises);
    console.log(`Downloaded ${images.size} images`);

    // Build PPTX
    console.log("Building PPTX");
    const pptxBuffer = await buildPptx(presentation, images);

    // Send email
    const filename = `${presentation.title.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ\s]/g, "").replace(/\s+/g, "_").slice(0, 50)}.pptx`;
    console.log("Sending email to:", email);
    await sendEmail(email, `Présentation : ${presentation.title}`, pptxBuffer, filename);

    return new Response(
      JSON.stringify({
        success: true,
        title: presentation.title,
        slideCount: presentation.slides.length,
        imagesFound: images.size,
        message: `Présentation "${presentation.title}" envoyée à ${email}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-pptx error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
