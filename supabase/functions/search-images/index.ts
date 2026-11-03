import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Searching images for:", query);

    // Search multiple image sources in parallel
    const searches = [
      fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `${query} high quality photo`,
          limit: 8,
          scrapeOptions: {
            formats: ["markdown"],
            onlyMainContent: true,
          },
        }),
      }),
      fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `${query} site:unsplash.com OR site:pexels.com OR site:pixabay.com`,
          limit: 5,
          scrapeOptions: {
            formats: ["markdown"],
            onlyMainContent: true,
          },
        }),
      }),
    ];

    const [generalRes, imageRes] = await Promise.all(searches);

    const allImages: Array<{ url: string; title: string; source: string }> = [];

    // Extract image URLs from markdown content
    const extractImagesFromMarkdown = (markdown: string): string[] => {
      const imageUrls: string[] = [];
      // Match markdown images: ![alt](url)
      const mdPattern = /!\[.*?\]\((https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|webp|gif)[^\s)]*)\)/gi;
      let match;
      while ((match = mdPattern.exec(markdown)) !== null) {
        imageUrls.push(match[1]);
      }
      // Match raw image URLs
      const rawPattern = /(https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>]*)?)/gi;
      while ((match = rawPattern.exec(markdown)) !== null) {
        if (!imageUrls.includes(match[1])) {
          imageUrls.push(match[1]);
        }
      }
      return imageUrls;
    };

    // Process general results
    if (generalRes.ok) {
      const data = await generalRes.json();
      for (const item of (data.data || [])) {
        const markdown = item.markdown || "";
        const urls = extractImagesFromMarkdown(markdown);
        for (const url of urls) {
          // Filter out tiny icons, logos, tracking pixels
          if (url.includes("icon") || url.includes("logo") || url.includes("favicon") || 
              url.includes("pixel") || url.includes("tracking") || url.includes("avatar") ||
              url.includes("1x1") || url.includes("badge") || url.includes("button")) continue;
          allImages.push({
            url,
            title: item.title || query,
            source: item.url || "",
          });
        }
      }
    }

    // Process image site results
    if (imageRes.ok) {
      const data = await imageRes.json();
      for (const item of (data.data || [])) {
        const markdown = item.markdown || "";
        const urls = extractImagesFromMarkdown(markdown);
        for (const url of urls) {
          if (url.includes("icon") || url.includes("logo") || url.includes("favicon") ||
              url.includes("pixel") || url.includes("tracking") || url.includes("avatar")) continue;
          allImages.push({
            url,
            title: item.title || query,
            source: item.url || "",
          });
        }
      }
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueImages = allImages.filter(img => {
      if (seen.has(img.url)) return false;
      seen.add(img.url);
      return true;
    });

    // Return top 5
    const results = uniqueImages.slice(0, 5);

    console.log(`Found ${uniqueImages.length} unique images, returning ${results.length}`);

    return new Response(
      JSON.stringify({ success: true, images: results, total: uniqueImages.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Image search error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
