import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PreviewItem } from "@/components/PreviewPanel";
import { User } from "@supabase/supabase-js";
import { UploadedFile } from "@/components/FileUploadButton";
import { Persona, getPersonaPrompt } from "@/components/PersonaSelector";
import { useGuestMessage, getGuestMessagesLeft } from "@/hooks/useGuestLimits";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useActiveEventContext } from "@/App";

export type Message = { 
  id?: string;
  role: "user" | "assistant"; 
  content: string;
  imageUrl?: string;
  createdAt?: string;
};

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  type?: string;
  is_global?: boolean;
  user_id?: string;
  is_pinned?: boolean;
};

export interface CreditCosts {
  message: number;
  generation: number;
  coding: number;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const SEARCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/firecrawl-search`;
const SCRAPE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/firecrawl-scrape`;
const IMAGE_SEARCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-images`;

interface UseChatOptions {
  useCredits?: (amount: number) => Promise<boolean>;
  hasCredits?: (amount: number) => boolean;
}

export function useChat(options?: UseChatOptions) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { profile } = useAuthContext();
  const activeEvent = useActiveEventContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(() => {
    try { return sessionStorage.getItem("omniai_current_conv") || null; } catch { return null; }
  });
  const [creditCosts, setCreditCosts] = useState<CreditCosts>({ message: 1, generation: 3, coding: 5 });
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [generatedCode, setGeneratedCode] = useState<{ html: string; css: string; js: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const [pinnedMessageIds, setPinnedMessageIds] = useState<Set<string>>(new Set());
  const [persona, setPersona] = useState<Persona>("default");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Track current user for conversation ownership
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user ?? null;
      setCurrentUser(newUser);
      
      // When user changes, reset conversations and load new ones
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setMessages([]);
        setCurrentConversationId(null);
        if (newUser) {
          loadConversationsForUser(newUser.id);
        } else {
          setConversations([]);
        }
      }
    });

    // Initial check
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      if (user) {
        loadConversationsForUser(user.id);
        // Auto-restore last conversation on refresh
        const savedConvId = sessionStorage.getItem("omniai_current_conv");
        if (savedConvId) {
          loadConversation(savedConvId);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Persist current conversation ID to sessionStorage
  useEffect(() => {
    try {
      if (currentConversationId) {
        sessionStorage.setItem("omniai_current_conv", currentConversationId);
      } else {
        sessionStorage.removeItem("omniai_current_conv");
      }
    } catch {}
  }, [currentConversationId]);

  const addPreviewItem = useCallback((item: Omit<PreviewItem, "id" | "timestamp">) => {
    const newItem: PreviewItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setPreviewItems(prev => [newItem, ...prev]);
  }, []);

  const clearPreviewItems = useCallback(() => {
    setPreviewItems([]);
  }, []);

  // Request user location (once)
  const requestLocation = useCallback(() => {
    if (locationRequested) return;
    setLocationRequested(true);
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
          console.log("Location obtained:", position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Geolocation error:", error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    }
  }, [locationRequested]);

  // Try to get location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Load credit costs from admin settings
  useEffect(() => {
    const loadCreditCosts = async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "credit_costs")
        .single();
      
      if (data?.setting_value) {
        setCreditCosts(data.setting_value as unknown as CreditCosts);
      }
    };
    loadCreditCosts();
  }, []);

  // Load conversations for a specific user
  const loadConversationsForUser = async (userId: string) => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("is_global", false)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    
    if (!error && data) {
      setConversations(data);
    }
  };

  const loadConversations = async () => {
    if (!currentUser) {
      setConversations([]);
      return;
    }
    await loadConversationsForUser(currentUser.id);
  };

  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

  const loadConversation = async (conversationId: string) => {
    setIsLoadingConversation(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    
    if (!error && data) {
      setMessages(data.map(m => ({ 
        id: m.id,
        role: m.role as "user" | "assistant", 
        content: m.content,
        imageUrl: m.image_url || undefined,
        createdAt: m.created_at
      })));
      setCurrentConversationId(conversationId);
    }
    setIsLoadingConversation(false);
  };

  const renameConversation = async (conversationId: string, newTitle: string) => {
    const { error } = await supabase
      .from("conversations")
      .update({ title: newTitle.slice(0, 50) })
      .eq("id", conversationId);
    
    if (!error) {
      setConversations(prev => 
        prev.map(c => c.id === conversationId ? { ...c, title: newTitle.slice(0, 50) } : c)
      );
    }
    return !error;
  };

  const saveMessage = async (conversationId: string, message: Message, userId?: string, userEmail?: string): Promise<string | null> => {
    const { data, error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      image_url: message.imageUrl,
      user_id: userId,
      user_email: userEmail,
    }).select().single();
    
    return error ? null : data.id;
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId);
    
    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    }
  };

  const createConversation = async (title: string): Promise<string | null> => {
    // Only create conversation if user is logged in
    if (!currentUser) {
      return null;
    }
    
    const { data, error } = await supabase
      .from("conversations")
      .insert({ 
        title: title.slice(0, 50),
        user_id: currentUser.id 
      })
      .select()
      .single();
    
    if (error || !data) {
      throw new Error("Failed to create conversation");
    }
    
    setConversations(prev => [data, ...prev]);
    return data.id;
  };

  const performWebSearch = async (query: string): Promise<string> => {
    try {
      const resp = await fetch(SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query }),
      });

      if (!resp.ok) {
        throw new Error("Search failed");
      }

      const result = await resp.json();
      if (!result.success || !result.data?.length) {
        return "Aucun résultat trouvé.";
      }

      return result.data.slice(0, 3).map((r: any) => 
        `**${r.title}**\n${r.description || r.markdown?.slice(0, 300) || ""}\n[Source](${r.url})`
      ).join("\n\n---\n\n");
    } catch (e) {
      console.error("Search error:", e);
      return "Erreur lors de la recherche web.";
    }
  };

  const scrapeWebsite = async (url: string): Promise<{ title: string; content: string; url: string } | null> => {
    try {
      const resp = await fetch(SCRAPE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ url }),
      });

      if (!resp.ok) {
        throw new Error("Scrape failed");
      }

      const result = await resp.json();
      if (!result.success || !result.data) {
        return null;
      }

      return {
        title: result.data.title || "Sans titre",
        content: result.data.markdown?.slice(0, 3000) || result.data.description || "Contenu non disponible",
        url: result.data.url || url,
      };
    } catch (e) {
      console.error("Scrape error:", e);
      return null;
    }
  };

  const searchYouTubeVideo = async (query: string): Promise<{ videoId: string; title: string; thumbnail: string } | null> => {
    try {
      // Use Firecrawl to search for YouTube videos
      const searchQuery = `site:youtube.com ${query} trailer official`;
      const resp = await fetch(SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query: searchQuery, options: { limit: 5 } }),
      });

      if (!resp.ok) {
        throw new Error("YouTube search failed");
      }

      const result = await resp.json();
      if (!result.success || !result.data?.length) {
        return null;
      }

      // Find first YouTube video URL
      for (const item of result.data) {
        const url = item.url || "";
        const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (videoIdMatch) {
          return {
            videoId: videoIdMatch[1],
            title: item.title || query,
            thumbnail: `https://img.youtube.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`,
          };
        }
      }
      return null;
    } catch (e) {
      console.error("YouTube search error:", e);
      return null;
    }
  };

  const generateImage = async (prompt: string): Promise<string | null> => {
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ generateImage: prompt }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        console.error("Image generation error:", errorData);
        throw new Error(errorData.error || "Image generation failed");
      }

      const result = await resp.json();
      console.log("Image generation result:", result);
      
      if (result.imageUrl) {
        return result.imageUrl;
      }
      
      return null;
    } catch (e) {
      console.error("Image generation error:", e);
      return null;
    }
  };


  // Helper to detect URLs in text
  const extractUrl = (text: string): string | null => {
    const urlMatch = text.match(/https?:\/\/[^\s]+/i);
    return urlMatch ? urlMatch[0] : null;
  };

  // Helper to extract YouTube video ID from URL
  const extractYouTubeId = (text: string): string | null => {
    const match = text.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  // Helper to detect video/trailer requests (YouTube search)
  const detectVideoRequest = (message: string): { isVideo: boolean; query: string } => {
    const patterns = [
      /montre[\s-]*moi\s+la\s+vid[ée]?o\s+(?:youtube\s+)?(?:de\s+|du\s+|d')?(.+)/i,
      /montre[\s-]*moi\s+le\s+film\s+(?:complet\s+)?(?:de\s+|du\s+|d')?(.+)/i,
      /montre[\s-]*moi\s+le\s+(?:film|documentaire|docu|reportage|trailer|bande[\s-]*annonce)\s+(?:de\s+|du\s+|d'|sur\s+)?(.+)/i,
      /(?:fai[st]?|fait|fe)[\s-]*moi\s+voir\s+(?:le\s+)?(?:film|vid[ée]?o)\s+(?:de\s+|du\s+|d'|sur\s+)?(.+)/i,
    ];
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return { isVideo: true, query: match[1].trim() + " film complet" };
      }
    }
    return { isVideo: false, query: "" };
  };

  const detectVideoGenerationRequest = (message: string): { isVideoGeneration: boolean; prompt: string } => {
    const normalized = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const hasVideoKeyword = /video|clip|animation|cinematique|cinematique|film court|short film/.test(normalized);
    const hasGenerateVerb = /genere|g[eé]n[eè]re|cree|cr[eé]e|fais|fabrique|produis|create|generate|make/.test(normalized);

    if (!hasVideoKeyword || !hasGenerateVerb) {
      return { isVideoGeneration: false, prompt: "" };
    }

    const extracted = message.match(
      /(?:g[éeè]n[èe]re|genere|cr[ée]e|cree|fais|fabrique|produis|create|generate|make)\s*(?:-?\s*moi\s+)?(?:une?\s+)?(?:vid[ée]o|clip|animation|film\s+court)\s*(?:de\s+|du\s+|d'un\s+|d'une\s+|d'|of\s+|about\s+)?(.+)/i
    );

    if (extracted?.[1]?.trim()) {
      return { isVideoGeneration: true, prompt: extracted[1].trim() };
    }

    return { isVideoGeneration: true, prompt: message.trim() };
  };

  // Helper to detect image generation requests (NEVER searches online - always generates)
  const detectImageRequest = (message: string): { isImage: boolean; prompt: string } => {
    const lowerMessage = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Image-related keywords
    const hasImageKeyword = /image|photo|illustration|dessin|picture|visuel|affiche|poster|logo|ic[oô]ne|icon|avatar|banni[eè]re|banner/i.test(lowerMessage);
    
    // Generation verbs (including common typos: "genre", "cré", "fai", "genere", etc.)
    const hasGenVerb = /(?:g[eé]n[eè]re|genre|genere|cre[eé]|cr[eé]|dessine|fai[st]?|fabrique|generate|create|make|draw|design)/i.test(lowerMessage);
    
    // If message has BOTH a generation verb AND an image keyword → it's image generation
    if (hasGenVerb && hasImageKeyword) {
      // Extract the subject/prompt after removing the command part
      const extractPrompt = message.match(
        /(?:g[éeè]n[èe]re|genre|genere|cr[ée]+|dessine|fai[st]?|fabrique|generate|create|make|draw|design)\s*(?:-?\s*moi\s+)?(?:une?\s+)?(?:image|photo|illustration|dessin|picture|visuel|affiche|poster|logo|ic[oô]ne|icon|avatar|banni[eè]re|banner)\s*(?:de\s+|du\s+|d'un\s+|d'une\s+|d'|of\s+|about\s+)?(.+)/i
      );
      if (extractPrompt) {
        return { isImage: true, prompt: extractPrompt[1].trim() };
      }
      // Fallback: take everything after the verb
      const fallback = message.match(
        /(?:g[éeè]n[èe]re|genre|genere|cr[ée]+|dessine|fai[st]?|fabrique|generate|create|make|draw|design)\s*(?:-?\s*moi\s+)?(?:une?\s+)?(.+)/i
      );
      if (fallback) {
        return { isImage: true, prompt: fallback[1].trim() };
      }
    }
    
    // Direct patterns: "image de X", "une image de X"
    if (hasImageKeyword) {
      const directMatch = message.match(
        /(?:une?\s+)?(?:image|photo|illustration|dessin|picture)\s+(?:de\s+|du\s+|d'un\s+|d'une\s+|d'|of\s+)?(.+)/i
      );
      // Only match if there's also a generation verb context (not just mentioning "image")
      if (directMatch && hasGenVerb) {
        return { isImage: true, prompt: directMatch[1].trim() };
      }
    }
    
    return { isImage: false, prompt: "" };
  };

  // Helper to detect image SEARCH requests (searching the web for images)
  const detectImageSearchRequest = (message: string): { isImageSearch: boolean; query: string } => {
    const patterns = [
      /(?:recherche|cherche|trouve|find|search)\s+(?:des\s+|les\s+|moi\s+des\s+|moi\s+les\s+)?(?:images?|photos?|illustrations?)\s+(?:de\s+|du\s+|d'un\s+|d'une\s+|d'|sur\s+|about\s+|of\s+)?(.+)/i,
      /(?:montre|affiche|show)\s*(?:-?\s*moi\s+)?(?:des\s+|les\s+)?(?:images?|photos?)\s+(?:de\s+|du\s+|d'|sur\s+|of\s+)?(.+)/i,
      /(?:images?|photos?)\s+(?:de\s+|du\s+|d'|sur\s+|of\s+)(.+?)(?:\s+sur\s+internet|\s+en\s+ligne|\s+online)?$/i,
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return { isImageSearch: true, query: match[1].trim() };
      }
    }
    return { isImageSearch: false, query: "" };
  };

  const searchImages = async (query: string): Promise<Array<{ url: string; title: string; source: string }>> => {
    try {
      const resp = await fetch(IMAGE_SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query }),
      });

      if (!resp.ok) throw new Error("Image search failed");

      const result = await resp.json();
      return result.images || [];
    } catch (e) {
      console.error("Image search error:", e);
      return [];
    }
  };


  // Helper to detect coding requests (same patterns as backend, with typo tolerance)
  const detectCodingRequest = (message: string): boolean => {
    const codingPatterns = [
      // French: "crée/fais/génère/développe/construis [moi] [un/une] site/page/app/portfolio/etc."
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
    return codingPatterns.some(pattern => pattern.test(message));
  };

  const sendMessage = useCallback(async (input: string, uploadedFile?: UploadedFile) => {
    if ((!input.trim() && !uploadedFile) || isLoading) return;

    const isCodingRequest = detectCodingRequest(input);
    // Image GENERATION has priority over image SEARCH
    const imageMatch = !isCodingRequest ? detectImageRequest(input) : { isImage: false, prompt: "" };
    const imageSearchMatch = !imageMatch.isImage ? detectImageSearchRequest(input) : { isImageSearch: false, query: "" };
    const searchMatch = !isCodingRequest && !imageSearchMatch.isImageSearch && !imageMatch.isImage ? input.toLowerCase().match(/(?:recherche|cherche|search|trouve|find|google)\s+(.+)/i) : null;
    
    const videoGenerationRequest = detectVideoGenerationRequest(input);
    const videoRequest = videoGenerationRequest.isVideoGeneration ? { isVideo: false, query: "" } : detectVideoRequest(input);
    const youtubeIdFromUrl = extractYouTubeId(input);

    // Guest restrictions: block advanced features entirely
    if (!currentUser) {
      if (imageSearchMatch.isImageSearch || searchMatch || imageMatch.isImage || isCodingRequest || videoRequest.isVideo || videoGenerationRequest.isVideoGeneration) {
        toast.error("Connectez-vous pour utiliser cette fonctionnalité (recherche, génération, codage).");
        return;
      }
      // Guest message limit
      if (!useGuestMessage()) {
        toast.error(`Limite de messages atteinte (5/jour). Connectez-vous pour continuer.`);
        return;
      }
    }
    
    // Only check credits if user is logged in - image generation is FREE (unlimited)
    if (currentUser && options?.useCredits && !imageMatch.isImage) {
      const cost = isCodingRequest ? creditCosts.coding : creditCosts.message;
      const success = await options.useCredits(cost);
      if (!success) {
        return;
      }
    }

    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Only save conversations if user is logged in
    let conversationId = currentConversationId;
    if (currentUser && !conversationId) {
      try {
        conversationId = await createConversation(input);
        if (conversationId) {
          setCurrentConversationId(conversationId);
        }
      } catch (e) {
        console.error("Failed to create conversation:", e);
      }
    }

    // Only save messages if we have a conversation (user is logged in)
    if (conversationId) {
      const msgId = await saveMessage(conversationId, userMsg, currentUser?.id, currentUser?.email);
      if (msgId) {
        setMessages(prev => prev.map((m, i) => 
          i === prev.length - 1 ? { ...m, id: msgId } : m
        ));
      }
    }

    // Image search request
    if (imageSearchMatch.isImageSearch) {
      const imgQuery = imageSearchMatch.query;
      setMessages(prev => [...prev, { role: "assistant", content: "🔍🖼️ Recherche d'images en cours..." }]);
      
      try {
        const images = await searchImages(imgQuery);
        
        let content: string;
        if (images.length > 0) {
          const imageGrid = images.map((img, i) => 
            `[![Image ${i + 1}](${img.url})](${img.url})`
          ).join("\n\n");
          content = `## 🖼️ Images trouvées pour "${imgQuery}"\n\n${imageGrid}\n\n*${images.length} image(s) trouvée(s). Dites "recherche encore des images de ${imgQuery}" pour en voir d'autres !*`;
        } else {
          content = `Je n'ai pas trouvé d'images pour "${imgQuery}". Essayez avec d'autres mots-clés !`;
        }
        
        const assistantMsg: Message = { role: "assistant", content };
        
        setMessages(prev => prev.map((m, i) => 
          i === prev.length - 1 ? assistantMsg : m
        ));
        
        // Add images to preview panel
        if (images.length > 0) {
          for (const img of images) {
            addPreviewItem({
              type: "image",
              title: img.title?.slice(0, 50) || imgQuery,
              content: imgQuery,
              imageUrl: img.url,
              url: img.source,
            });
          }
        }
        
        if (conversationId) {
          const msgId = await saveMessage(conversationId, assistantMsg);
          if (msgId) {
            setMessages(prev => prev.map((m, i) => 
              i === prev.length - 1 ? { ...m, id: msgId } : m
            ));
          }
        }
      } catch (error) {
        console.error("Image search error:", error);
      }
      
      setIsLoading(false);
      return;
    }

    if (searchMatch) {
      const searchQuery = searchMatch[1];
      setMessages(prev => [...prev, { role: "assistant", content: "🔍 Recherche en cours..." }]);
      
      try {
        const searchResults = await performWebSearch(searchQuery);
        
        const assistantMsg: Message = { 
          role: "assistant", 
          content: `## 🔍 Résultats de recherche pour "${searchQuery}"\n\n${searchResults}` 
        };
        
        setMessages(prev => prev.map((m, i) => 
          i === prev.length - 1 ? assistantMsg : m
        ));
        
        // Add to preview panel
        addPreviewItem({
          type: "search",
          title: `Recherche: ${searchQuery}`,
          content: searchResults,
        });
        
        if (conversationId) {
          const msgId = await saveMessage(conversationId, assistantMsg);
          if (msgId) {
            setMessages(prev => prev.map((m, i) => 
              i === prev.length - 1 ? { ...m, id: msgId } : m
            ));
          }
        }
      } catch (error) {
        console.error("Search error:", error);
      }
      
      setIsLoading(false);
      return;
    }

    if (imageMatch.isImage) {
      const imagePrompt = imageMatch.prompt;
      setMessages(prev => [...prev, { role: "assistant", content: "🎨 Génération d'image en cours..." }]);
      
      try {
        const imageUrl = await generateImage(imagePrompt);
        
        const assistantMsg: Message = { 
          role: "assistant", 
          content: imageUrl 
            ? `## 🎨 Image générée\n\n![${imagePrompt}](${imageUrl})\n\n*Prompt: ${imagePrompt}*` 
            : `Je suis désolé, je n'ai pas pu générer cette image. La génération d'images est limitée pour le moment.`,
          imageUrl: imageUrl || undefined
        };
        
        setMessages(prev => prev.map((m, i) => 
          i === prev.length - 1 ? assistantMsg : m
        ));

        // Add to preview panel if image was generated
        if (imageUrl) {
          addPreviewItem({
            type: "image",
            title: imagePrompt.slice(0, 50),
            content: imagePrompt,
            imageUrl: imageUrl,
          });
        }
        
        if (conversationId) {
          const msgId = await saveMessage(conversationId, assistantMsg);
          if (msgId) {
            setMessages(prev => prev.map((m, i) => 
              i === prev.length - 1 ? { ...m, id: msgId } : m
            ));
          }
        }
      } catch (error) {
        console.error("Image generation error:", error);
      }
      
      setIsLoading(false);
      return;
    }

    if (videoGenerationRequest.isVideoGeneration) {
      const videoPrompt = videoGenerationRequest.prompt;
      setMessages(prev => [...prev, { role: "assistant", content: "🎬 Génération de vidéo en cours..." }]);

      try {
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            generateVideo: videoPrompt,
            userId: currentUser?.id,
          }),
        });

        if (!resp.ok) {
          const errorData = await resp.json().catch(() => ({}));
          throw new Error(errorData.error || "Échec de génération vidéo");
        }

        const result = await resp.json();
        const videoUrl = result.videoUrl as string | undefined;

        const assistantMsg: Message = {
          role: "assistant",
          content: videoUrl
            ? `## 🎬 Vidéo générée\n\n✅ Ta vidéo est prête. Ouvre **Preview** pour la regarder.`
            : (result.message || "Je n'ai pas pu générer la vidéo pour le moment."),
        };

        setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? assistantMsg : m));

        if (videoUrl) {
          addPreviewItem({
            type: "video",
            title: `Vidéo: ${videoPrompt.slice(0, 40)}`,
            content: videoPrompt,
            videoUrl,
          });
        }

        if (conversationId) {
          const msgId = await saveMessage(conversationId, assistantMsg);
          if (msgId) {
            setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, id: msgId } : m));
          }
        }
      } catch (error) {
        console.error("Video generation error:", error);
        const errText = error instanceof Error ? error.message : "Erreur de génération vidéo";
        setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { role: "assistant", content: `❌ ${errText}` } : m));
      }

      setIsLoading(false);
      return;
    }


    // Check for YouTube URL or video request
    if (youtubeIdFromUrl || videoRequest.isVideo) {
      const videoQuery = videoRequest.query || input;
      setMessages(prev => [...prev, { role: "assistant", content: "🎬 Recherche de vidéo en cours..." }]);
      
      try {
        let videoData: { videoId: string; title: string; thumbnail: string } | null = null;
        
        if (youtubeIdFromUrl) {
          // Direct YouTube URL provided
          videoData = {
            videoId: youtubeIdFromUrl,
            title: "Vidéo YouTube",
            thumbnail: `https://img.youtube.com/vi/${youtubeIdFromUrl}/maxresdefault.jpg`,
          };
        } else {
          // Search for video
          videoData = await searchYouTubeVideo(videoQuery);
        }
        
        const assistantMsg: Message = { 
          role: "assistant", 
          content: videoData 
            ? `## 🎬 ${videoData.title}\n\n[![${videoData.title}](${videoData.thumbnail})](https://www.youtube.com/watch?v=${videoData.videoId})\n\n▶️ **Cliquez sur "Preview" en haut à droite pour regarder la vidéo complète !**`
            : `Je n'ai pas trouvé de vidéo correspondant à "${videoQuery}". Essayez avec un autre titre ou une recherche plus précise.`
        };
        
        setMessages(prev => prev.map((m, i) => 
          i === prev.length - 1 ? assistantMsg : m
        ));

        // Add to preview panel if video was found
        if (videoData) {
          addPreviewItem({
            type: "video",
            title: videoData.title.slice(0, 50),
            content: `Vidéo trouvée pour: ${videoQuery}`,
            videoId: videoData.videoId,
            videoThumbnail: videoData.thumbnail,
          });
        }
        
        if (conversationId) {
          const msgId = await saveMessage(conversationId, assistantMsg);
          if (msgId) {
            setMessages(prev => prev.map((m, i) => 
              i === prev.length - 1 ? { ...m, id: msgId } : m
            ));
          }
        }
      } catch (error) {
        console.error("Video search error:", error);
      }
      
      setIsLoading(false);
      return;
    }

    // Check for URL scraping request
    const urlToScrape = extractUrl(input);
    const scrapeKeywords = /(?:ouvre|accède|lis|montre|affiche|va sur|visite|open|access|read|show|visit|go to)/i;
    const isScrapeRequest = urlToScrape && (scrapeKeywords.test(input) || input.trim() === urlToScrape);

    if (isScrapeRequest && urlToScrape) {
      setMessages(prev => [...prev, { role: "assistant", content: "🌐 Accès au site en cours..." }]);
      
      try {
        const scraped = await scrapeWebsite(urlToScrape);
        
        const assistantMsg: Message = { 
          role: "assistant", 
          content: scraped 
            ? `## 🌐 ${scraped.title}\n\n**Source:** [${scraped.url}](${scraped.url})\n\n---\n\n${scraped.content}`
            : `Je n'ai pas pu accéder à ce site. Vérifiez que l'URL est correcte et que le site est accessible.`
        };
        
        setMessages(prev => prev.map((m, i) => 
          i === prev.length - 1 ? assistantMsg : m
        ));

        // Add to preview panel if scraped successfully
        if (scraped) {
          addPreviewItem({
            type: "website",
            title: scraped.title,
            content: scraped.content,
            url: scraped.url,
          });
        }
        
        if (conversationId) {
          const msgId = await saveMessage(conversationId, assistantMsg);
          if (msgId) {
            setMessages(prev => prev.map((m, i) => 
              i === prev.length - 1 ? { ...m, id: msgId } : m
            ));
          }
        }
      } catch (error) {
        console.error("Scrape error:", error);
      }
      
      setIsLoading(false);
      return;
    }

    let assistantSoFar = "";

    const upsertAssistant = (nextChunk: string) => {
      assistantSoFar += nextChunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      // Build message content with file if present
      let messageContent: any = input;
      
      if (uploadedFile) {
        if (uploadedFile.type === "image") {
          // For images, send as multimodal content
          messageContent = [
            { type: "text", text: input || "Que vois-tu dans cette image ?" },
            { 
              type: "image_url", 
              image_url: { 
                url: `data:${uploadedFile.mimeType};base64,${uploadedFile.base64}` 
              } 
            }
          ];
        } else {
          // For files, decode and append content
          const fileContent = atob(uploadedFile.base64);
          messageContent = `${input}\n\n---\nContenu du fichier "${uploadedFile.name}":\n\`\`\`\n${fileContent}\n\`\`\``;
        }
      }

      const userMsgForApi = {
        role: "user",
        content: messageContent,
      };

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Fetch sticky notes for the user
      let stickyNotes: string[] = [];
      let userAds: string[] = [];
      if (currentUser) {
        const [notesResult, adsResult] = await Promise.all([
          supabase.from("sticky_notes").select("content").eq("user_id", currentUser.id),
          supabase.from("user_ads").select("id, content, target_user_id").eq("is_active", true),
        ]);
        stickyNotes = (notesResult.data || []).map((n: any) => n.content);
        // Filter ads: global + targeted at this user
        userAds = (adsResult.data || [])
          .filter((ad: any) => !ad.target_user_id || ad.target_user_id === currentUser.id)
          .map((ad: any) => ad.content);
      }

      // Build event persona instruction if active
      const eventPersona = activeEvent?.styles?.ai_persona && activeEvent.styles.ai_persona !== "default"
        ? `\n\n[ÉVÉNEMENT ACTIF: "${activeEvent.name}"] Adapte ta personnalité et ton ton selon ces instructions: ${activeEvent.styles.ai_persona}. ${activeEvent.styles.ai_greeting ? `Ton message d'accueil spécial est: "${activeEvent.styles.ai_greeting}"` : ""}`
        : undefined;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [...messages.map(m => ({ role: m.role, content: m.content })), userMsgForApi],
          existingGeneratedCode: generatedCode || undefined,
          hasImage: uploadedFile?.type === "image",
          userId: currentUser?.id,
          location: userLocation,
          persona: persona !== "default" ? getPersonaPrompt(persona) : undefined,
          eventPersona,
          stickyNotes: stickyNotes.length > 0 ? stickyNotes : undefined,
          userAds: userAds.length > 0 ? userAds : undefined,
          language,
          displayName: profile?.display_name || undefined,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        if (resp.status === 403 && errorData.blocked) {
          // Trigger device block via localStorage
          const blockedUntil = Date.now() + 24 * 60 * 60 * 1000;
          localStorage.setItem("device_blocked_until", blockedUntil.toString());
          // Save to DB
          let deviceId = localStorage.getItem("device_unique_id");
          if (!deviceId) { deviceId = crypto.randomUUID(); localStorage.setItem("device_unique_id", deviceId); }
          await supabase.from("device_blocks").insert({
            device_id: deviceId,
            user_id: currentUser?.id || null,
            user_email: currentUser?.email || null,
            blocked_word: errorData.blockedWord || "unknown",
          });
          // Force reload to show blocked screen
          window.location.reload();
          return;
        }
        // Handle 402/429 (API rate limit) - auto retry up to 3 times with SSE parsing
        if (resp.status === 402 || resp.status === 429) {
          let retrySuccess = false;
          for (let retry = 0; retry < 3; retry++) {
            await new Promise(resolve => setTimeout(resolve, (retry + 1) * 2000));
            try {
              const retryResp = await fetch(CHAT_URL, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: JSON.stringify({ 
                  messages: [...messages.map(m => ({ role: m.role, content: m.content })), userMsgForApi],
                  hasImage: uploadedFile?.type === "image",
                  userId: currentUser?.id,
                  location: userLocation,
                  persona: persona !== "default" ? getPersonaPrompt(persona) : undefined,
                  language,
                  displayName: profile?.display_name || undefined,
                }),
              });
              if (retryResp.ok && retryResp.body) {
                // Parse SSE properly on retry
                const retryReader = retryResp.body.getReader();
                const decoder = new TextDecoder();
                let textBuffer = "";
                let streamDone = false;
                while (!streamDone) {
                  const { value, done: d } = await retryReader.read();
                  if (d) break;
                  textBuffer += decoder.decode(value, { stream: true });
                  let newlineIndex: number;
                  while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
                    let line = textBuffer.slice(0, newlineIndex);
                    textBuffer = textBuffer.slice(newlineIndex + 1);
                    if (line.endsWith("\r")) line = line.slice(0, -1);
                    if (!line.startsWith("data: ")) continue;
                    const jsonStr = line.slice(6).trim();
                    if (jsonStr === "[DONE]") { streamDone = true; break; }
                    try {
                      const parsed = JSON.parse(jsonStr);
                      const content = parsed.choices?.[0]?.delta?.content;
                      if (content) upsertAssistant(content);
                    } catch { /* partial JSON, ignore */ }
                  }
                }
                retrySuccess = true;
                break;
              }
            } catch { /* retry failed, continue loop */ }
          }
          if (!retrySuccess) {
            upsertAssistant("⏳ Le service est temporairement surchargé. Réessayez dans quelques secondes !");
            setIsLoading(false);
            return;
          }
        } else {
          throw new Error(errorData.error || "Erreur de connexion");
        }
      }

      // Check if response is JSON (code generation) or stream
      const contentType = resp.headers.get("content-type") || "";
      
      if (contentType.includes("application/json")) {
        const jsonData = await resp.json();
        
        if (jsonData.type === "code" && jsonData.code) {
          // Code generation response
          setGeneratedCode(jsonData.code);
          
          const codeMsg: Message = { 
            role: "assistant", 
            content: `🎨 **Code généré avec succès !**\n\nJ'ai créé le code HTML, CSS et JavaScript pour votre demande. Cliquez sur "Ouvrir l'éditeur" ci-dessous pour voir et modifier le code.\n\n*Tapez "ouvrir éditeur" ou cliquez sur le bouton pour accéder à l'éditeur de code.*` 
          };
          setMessages(prev => [...prev, codeMsg]);
          
          if (conversationId) {
            await saveMessage(conversationId, codeMsg);
          }
          
          // Add to preview panel
          addPreviewItem({
            type: "code",
            title: "Code généré",
            content: `HTML: ${jsonData.code.html?.length || 0} caractères\nCSS: ${jsonData.code.css?.length || 0} caractères\nJS: ${jsonData.code.js?.length || 0} caractères`,
          });
          
          setIsLoading(false);
          return;
        }

        // Presentation response
        if (jsonData.type === "presentation" && jsonData.presentation) {
          const presMsg: Message = { 
            role: "assistant", 
            content: `📊 **Présentation créée !**\n\n**${jsonData.presentation.title || jsonData.topic}**\n\n${jsonData.presentation.slides?.length || 0} slides ont été générés. Cliquez sur **"Preview"** en haut à droite pour voir la présentation complète.\n\n*Vous pouvez naviguer entre les slides avec les boutons Précédent/Suivant.*` 
          };
          setMessages(prev => [...prev, presMsg]);
          
          if (conversationId) {
            await saveMessage(conversationId, presMsg);
          }
          
          // Add to preview panel
          addPreviewItem({
            type: "presentation",
            title: jsonData.presentation.title || `Exposé: ${jsonData.topic}`,
            content: `${jsonData.presentation.slides?.length || 0} slides`,
            slides: jsonData.presentation.slides,
          });
          
          setIsLoading(false);
          return;
        }

        // Video generation response
        if (jsonData.type === "video") {
          const videoUrl = jsonData.videoUrl as string | undefined;
          const videoMsg: Message = {
            role: "assistant",
            content: videoUrl
              ? "## 🎬 Vidéo générée\n\n✅ Ouvre **Preview** pour lire la vidéo."
              : (jsonData.message || "La vidéo n'a pas pu être générée."),
          };

          setMessages(prev => [...prev, videoMsg]);

          if (videoUrl) {
            addPreviewItem({
              type: "video",
              title: "Vidéo IA",
              content: "Vidéo générée par IA",
              videoUrl,
            });
          }

          if (conversationId) {
            await saveMessage(conversationId, videoMsg);
          }

          setIsLoading(false);
          return;
        }
        
        // Learning response
        if (jsonData.type === "learning" && jsonData.message) {
          const learnMsg: Message = { 
            role: "assistant", 
            content: jsonData.message 
          };
          setMessages(prev => [...prev, learnMsg]);
          
          if (conversationId) {
            await saveMessage(conversationId, learnMsg);
          }
          
          setIsLoading(false);
          return;
        }
        
        // Learned capability response
        if (jsonData.type === "learned" && jsonData.message) {
          const learnedMsg: Message = { 
            role: "assistant", 
            content: jsonData.message 
          };
          setMessages(prev => [...prev, learnedMsg]);
          
          if (conversationId) {
            await saveMessage(conversationId, learnedMsg);
          }
          
          setIsLoading(false);
          return;
        }

        // Location required response
        if (jsonData.type === "location_required" && jsonData.message) {
          // Request location again
          if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setUserLocation({
                  lat: position.coords.latitude,
                  lon: position.coords.longitude,
                });
              },
              () => {},
              { enableHighAccuracy: true, timeout: 10000 }
            );
          }
          
          const locMsg: Message = { 
            role: "assistant", 
            content: jsonData.message 
          };
          setMessages(prev => [...prev, locMsg]);
          
          if (conversationId) {
            await saveMessage(conversationId, locMsg);
          }
          
          setIsLoading(false);
          return;
        }

        // Weather response
        if (jsonData.type === "weather" && jsonData.message) {
          const weatherMsg: Message = { 
            role: "assistant", 
            content: jsonData.message 
          };
          setMessages(prev => [...prev, weatherMsg]);
          
          if (conversationId) {
            await saveMessage(conversationId, weatherMsg);
          }
          
          setIsLoading(false);
          return;
        }

        // Transport response
        if (jsonData.type === "transport" && jsonData.message) {
          const transportMsg: Message = { 
            role: "assistant", 
            content: jsonData.message 
          };
          setMessages(prev => [...prev, transportMsg]);
          
          if (conversationId) {
            await saveMessage(conversationId, transportMsg);
          }
          
          setIsLoading(false);
          return;
        }

        // Question response (clarification from code engine)
        if (jsonData.type === "question" && jsonData.message) {
          const options = Array.isArray(jsonData.options) && jsonData.options.length > 0
            ? `\n\n**Options :**\n${jsonData.options.map((opt: string) => `- ${opt}`).join("\n")}`
            : "";

          const questionMsg: Message = {
            role: "assistant",
            content: `❓ ${jsonData.message}${options}`,
          };

          setMessages(prev => [...prev, questionMsg]);
          if (conversationId) {
            await saveMessage(conversationId, questionMsg);
          }

          setIsLoading(false);
          return;
        }

        // Fallback/retry response
        if ((jsonData.type === "fallback" || jsonData.type === "message") && jsonData.message) {
          const fallbackMsg: Message = { 
            role: "assistant", 
            content: jsonData.message 
          };
          setMessages(prev => [...prev, fallbackMsg]);
          
          if (conversationId) {
            await saveMessage(conversationId, fallbackMsg);
          }
          
          setIsLoading(false);
          return;
        }
      }

      if (!resp.body) throw new Error("Pas de réponse");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        if (abortControllerRef.current?.signal.aborted) {
          reader.cancel();
          break;
        }
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (conversationId && assistantSoFar) {
        const msgId = await saveMessage(conversationId, { role: "assistant", content: assistantSoFar });
        if (msgId) {
          setMessages(prev => prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, id: msgId } : m
          ));
        }
      }

      // Only update conversation timestamp if we have one
      if (conversationId) {
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId);
        
        loadConversations();
      }
    } catch (e: any) {
      if (e?.name === "AbortError") {
        // Stream was cancelled by user - keep what we have so far
        if (conversationId && assistantSoFar) {
          const msgId = await saveMessage(conversationId, { role: "assistant", content: assistantSoFar });
          if (msgId) {
            setMessages(prev => prev.map((m, i) => 
              i === prev.length - 1 ? { ...m, id: msgId } : m
            ));
          }
        }
      } else {
        console.error(e);
        toast.error(e instanceof Error ? e.message : "Une erreur est survenue");
        setMessages((prev) => prev.filter((m) => m !== userMsg));
      }
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, [messages, isLoading, currentConversationId, creditCosts, options, addPreviewItem, currentUser, generatedCode]);

  const newConversation = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
  }, []);

  const deleteConversation = async (id: string) => {
    await supabase.from("conversations").delete().eq("id", id);
    if (currentConversationId === id) {
      newConversation();
    }
    loadConversations();
  };

  const openCodeEditor = useCallback(async () => {
    if (!generatedCode) return;
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Vous devez être connecté pour utiliser l'éditeur de code");
      return;
    }

    // Update or create project with generated code
    const { data: existingProject } = await supabase
      .from("user_projects")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (existingProject) {
      await supabase
        .from("user_projects")
        .update({
          html_code: generatedCode.html,
          css_code: generatedCode.css,
          js_code: generatedCode.js,
        })
        .eq("id", existingProject.id);
    } else {
      await supabase
        .from("user_projects")
        .insert({
          user_id: user.id,
          name: "Site généré par IA",
          html_code: generatedCode.html,
          css_code: generatedCode.css,
          js_code: generatedCode.js,
        });
    }

    setGeneratedCode(null);
    navigate("/code-editor");
  }, [generatedCode, navigate]);

  // Summarize the current conversation
  const summarizeConversation = useCallback(async () => {
    if (messages.length < 4) {
      toast.error("La conversation est trop courte pour être résumée.");
      return;
    }
    
    setIsLoading(true);
    
    // Build a condensed version of the conversation
    const conversationText = messages
      .map(m => `${m.role === "user" ? "Utilisateur" : "IA"}: ${m.content.slice(0, 300)}`)
      .join("\n\n");
    
    const summaryPrompt = `Résume cette conversation en points clés concis (bullet points). Identifie les sujets principaux, les décisions prises et les informations importantes. Sois bref et structuré.\n\nConversation:\n${conversationText.slice(0, 6000)}`;
    
    let assistantSoFar = "";
    const upsertSummary = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content.startsWith("## 📋")) {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: `## 📋 Résumé de la conversation\n\n${assistantSoFar}` } : m);
        }
        return [...prev, { role: "assistant" as const, content: `## 📋 Résumé de la conversation\n\n${assistantSoFar}` }];
      });
    };
    
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: summaryPrompt }],
          userId: currentUser?.id,
        }),
      });
      
      if (!resp.ok || !resp.body) throw new Error("Erreur de résumé");
      
      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await resp.json();
        const content = data.message || data.choices?.[0]?.message?.content || "Résumé non disponible";
        upsertSummary(content);
      } else {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = "";
        let streamDone = false;
        
        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") { streamDone = true; break; }
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) upsertSummary(content);
            } catch { /* partial */ }
          }
        }
      }
      
      // Save summary message
      if (currentConversationId && assistantSoFar) {
        const msgId = await saveMessage(currentConversationId, { role: "assistant", content: `## 📋 Résumé de la conversation\n\n${assistantSoFar}` });
        if (msgId) {
          setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, id: msgId } : m));
        }
      }
    } catch (e) {
      console.error("Summary error:", e);
      toast.error("Erreur lors du résumé de la conversation");
    } finally {
      setIsLoading(false);
    }
  }, [messages, currentUser, currentConversationId]);

  // Regenerate the last assistant message
  const regenerateLastMessage = useCallback(async () => {
    // Find the last user message before the last assistant message
    const lastAssistantIndex = messages.length - 1;
    if (lastAssistantIndex < 1 || messages[lastAssistantIndex].role !== "assistant") return;
    
    // Find the last user message
    let lastUserMsg = "";
    for (let i = lastAssistantIndex - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserMsg = messages[i].content;
        break;
      }
    }
    if (!lastUserMsg) return;
    
    // Remove the last assistant message and re-send
    setMessages(prev => prev.slice(0, -1));
    setIsRegenerating(true);
    
    // Re-send the last user message
    await sendMessage(lastUserMsg);
    setIsRegenerating(false);
  }, [messages, sendMessage]);

  // Pin/unpin a message
  const togglePin = useCallback((messageId: string) => {
    setPinnedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
        toast.success("Message désépinglé");
      } else {
        next.add(messageId);
        toast.success("Message épinglé !");
      }
      return next;
    });
  }, []);

  const pinnedMessages = messages.filter(m => m.id && pinnedMessageIds.has(m.id));

  return { 
    messages, 
    isLoading,
    isLoadingConversation,
    sendMessage, 
    newConversation,
    conversations,
    loadConversation,
    renameConversation,
    deleteConversation,
    deleteMessage,
    currentConversationId,
    previewItems,
    clearPreviewItems,
    generatedCode,
    openCodeEditor,
    regenerateLastMessage,
    summarizeConversation,
    togglePin,
    pinnedMessageIds,
    pinnedMessages,
    persona,
    setPersona,
    isRegenerating,
  };
}
