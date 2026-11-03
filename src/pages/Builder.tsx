import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TypingIndicator } from "@/components/TypingIndicator";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Send, Menu, ChevronDown, ChevronRight, Share2, Upload, Settings,
  BarChart3, Cloud, Code, FolderOpen, Shield, Zap, History, Globe,
  RotateCcw, Home, ExternalLink, Plus, X, Mic, Slash, ArrowUp,
  MoreHorizontal, Camera, Image, Search, Star, User, Pen, Moon, Play,
  ArrowLeft, Copy, Check, Download, Trash2, Eye, Lock, Clock, Sun,
  Monitor, FileText, Link, Save,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Project {
  id: string;
  name: string;
  html_code: string | null;
  css_code: string | null;
  js_code: string | null;
  is_published: boolean;
  published_url: string | null;
  updated_at: string;
  is_locked?: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/builder-chat`;

export default function Builder() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeView, setActiveView] = useState<"chat" | "preview">("chat");

  // Swipe gesture handling
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Only trigger if horizontal swipe > 60px and more horizontal than vertical
    if (absDeltaX > 60 && absDeltaX > absDeltaY * 1.5) {
      if (deltaX < 0 && activeView === "chat") {
        setActiveView("preview");
      } else if (deltaX > 0 && activeView === "preview") {
        setActiveView("chat");
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Sheets
  const [showPlusSheet, setShowPlusSheet] = useState(false);
  const [showDotsSheet, setShowDotsSheet] = useState(false);
  const [showProjectSheet, setShowProjectSheet] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showUrlSheet, setShowUrlSheet] = useState(false);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Project
  const [project, setProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState("Nouveau projet");
  const [previewHtml, setPreviewHtml] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Recent projects
  const [recentProjects, setRecentProjects] = useState<{ id: string; name: string; updated_at: string }[]>([]);

  // Extra sheets
  const [showCodeSheet, setShowCodeSheet] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showAnalyticsSheet, setShowAnalyticsSheet] = useState(false);
  const [showHistorySheet, setShowHistorySheet] = useState(false);
  const [showSecuritySheet, setShowSecuritySheet] = useState(false);
  const [showSpeedSheet, setShowSpeedSheet] = useState(false);
  const [showCloudSheet, setShowCloudSheet] = useState(false);
  const [showFilesSheet, setShowFilesSheet] = useState(false);
  const [showRenameSheet, setShowRenameSheet] = useState(false);
  const [showAppearanceSheet, setShowAppearanceSheet] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showPublishSheet, setShowPublishSheet] = useState(false);

  // Feature states
  const [renameValue, setRenameValue] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [appearance, setAppearance] = useState<"system" | "dark" | "light">("system");
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [projectSearch, setProjectSearch] = useState("");
  const [allProjects, setAllProjects] = useState<{ id: string; name: string; updated_at: string; is_published: boolean }[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastGeneratedImageUrl, setLastGeneratedImageUrl] = useState<string | null>(null);
  const previousSiteHtmlRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialPromptSent = useRef(false);

  useEffect(() => {
    const projectId = searchParams.get("project");
    if (projectId && user) loadProject(projectId);
  }, [searchParams, user]);

  // Auto-send prompt from landing page ?q= parameter
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !initialPromptSent.current && !isGenerating) {
      initialPromptSent.current = true;
      // Small delay to ensure component is ready
      setTimeout(() => handleSend(q), 300);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) loadRecentProjects();
  }, [user]);

  useEffect(() => {
    if (user) loadCredits();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadProject = async (id: string) => {
    const { data } = await supabase.from("user_projects").select("*").eq("id", id).single();
    if (data) {
      setProject(data as Project);
      setProjectName(data.name);
      updatePreview(data.html_code || "", data.css_code || "", data.js_code || "");
    }
  };

  const loadRecentProjects = async () => {
    const { data } = await supabase
      .from("user_projects")
      .select("id, name, updated_at")
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false })
      .limit(5);
    if (data) setRecentProjects(data);
  };

  const loadAllProjects = async () => {
    const { data } = await supabase
      .from("user_projects")
      .select("id, name, updated_at, is_published")
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false });
    if (data) setAllProjects(data);
  };

  const loadCredits = async () => {
    if (!user) return;
    const { data } = await supabase.from("user_credits").select("credits").eq("user_id", user.id).maybeSingle();
    setUserCredits(data?.credits ?? 0);
  };

  // ─── Actions ───
  const handleRename = async () => {
    if (!renameValue.trim()) return;
    setProjectName(renameValue.trim());
    if (project) {
      await supabase.from("user_projects").update({ name: renameValue.trim() }).eq("id", project.id);
    }
    setShowRenameSheet(false);
    toast.success("Projet renommé !");
  };

  const handlePublish = async () => {
    if (!project) {
      toast.error("Sauvegardez d'abord le projet");
      return;
    }
    if (!previewHtml) {
      toast.error("Aucun contenu à publier");
      return;
    }
    setIsPublishing(true);
    const newStatus = !project.is_published;

    if (newStatus) {
      // Generate a slug from project name
      const slug = projectName
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || project.id.slice(0, 8);

      // Upload HTML to published-sites bucket
      const htmlBlob = new Blob([previewHtml], { type: "text/html" });
      const { error: uploadError } = await supabase.storage
        .from("published-sites")
        .upload(`${slug}/index.html`, htmlBlob, { upsert: true, contentType: "text/html" });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Erreur lors de l'upload du site");
        setIsPublishing(false);
        return;
      }

      const publishedUrl = `${window.location.origin}/s/${slug}`;
      const { error } = await supabase.from("user_projects").update({
        is_published: true,
        published_url: publishedUrl,
      }).eq("id", project.id);

      if (!error) {
        setProject({ ...project, is_published: true, published_url: publishedUrl });
        toast.success("Projet publié ! " + publishedUrl);
      } else {
        toast.error("Erreur de publication");
      }
    } else {
      // Unpublish
      const { error } = await supabase.from("user_projects").update({
        is_published: false,
      }).eq("id", project.id);

      if (!error) {
        setProject({ ...project, is_published: false });
        toast.success("Projet dépublié");
      } else {
        toast.error("Erreur");
      }
    }
    setIsPublishing(false);
    setShowPublishSheet(false);
  };

  const handleShare = async () => {
    const url = project ? `${window.location.origin}/build?project=${project.id}` : window.location.href;
    await navigator.clipboard.writeText(url);
    toast.success("Lien copié !");
    setShowShareSheet(false);
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(previewHtml || "");
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleDownloadCode = () => {
    const blob = new Blob([previewHtml || ""], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Fichier téléchargé !");
  };

  // Silent auto-save (no toast)
  const autoSaveProject = async () => {
    if (!user || !previewHtml) return;
    try {
      if (project) {
        await supabase.from("user_projects").update({ html_code: previewHtml, name: projectName, updated_at: new Date().toISOString() }).eq("id", project.id);
        // If project is published, also update the storage
        if (project.is_published && project.published_url) {
          const slug = project.published_url.split("/s/")[1];
          if (slug) {
            const htmlBlob = new Blob([previewHtml], { type: "text/html" });
            await supabase.storage.from("published-sites").upload(`${slug}/index.html`, htmlBlob, { upsert: true, contentType: "text/html" });
          }
        }
      } else {
        const { data, error } = await supabase.from("user_projects").insert({ user_id: user.id, name: projectName, html_code: previewHtml }).select().single();
        if (data && !error) {
          setProject(data as Project);
          window.history.replaceState({}, "", `/build?project=${data.id}`);
        }
      }
    } catch {
      // Silent fail for auto-save
    }
  };

  // Auto-save every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      autoSaveProject();
    }, 3000);
    return () => clearInterval(interval);
  }, [user, project, previewHtml, projectName]);

  // Listen for "insert-logo" messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "insert-logo" && e.data.url) {
        const logoUrl = e.data.url;
        const siteHtml = previousSiteHtmlRef.current;
        if (!siteHtml) {
          toast.error("Aucun site en cours pour insérer le logo");
          return;
        }
        // Insert logo into the site: after <body> or replace existing logo
        let updatedHtml = siteHtml;
        const logoTag = `<img src="${logoUrl}" alt="Logo" style="max-height:60px;object-fit:contain;" class="site-logo" />`;
        if (updatedHtml.includes('class="site-logo"')) {
          updatedHtml = updatedHtml.replace(/<img[^>]*class="site-logo"[^>]*\/?>/gi, logoTag);
        } else if (updatedHtml.includes("<header")) {
          updatedHtml = updatedHtml.replace(/(<header[^>]*>)/, `$1\n  ${logoTag}`);
        } else if (updatedHtml.includes("<nav")) {
          updatedHtml = updatedHtml.replace(/(<nav[^>]*>)/, `$1\n  ${logoTag}`);
        } else if (updatedHtml.includes("<body")) {
          updatedHtml = updatedHtml.replace(/(<body[^>]*>)/, `$1\n  ${logoTag}`);
        }
        setPreviewHtml(updatedHtml);
        previousSiteHtmlRef.current = updatedHtml;
        setActiveView("preview");
        toast.success("Logo inséré dans votre site !");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleSaveProject = async () => {
    if (!user) return;
    setIsSaving(true);
    if (project) {
      await supabase.from("user_projects").update({ html_code: previewHtml, name: projectName, updated_at: new Date().toISOString() }).eq("id", project.id);
      toast.success("Projet sauvegardé !");
    } else {
      const { data, error } = await supabase.from("user_projects").insert({ user_id: user.id, name: projectName, html_code: previewHtml }).select().single();
      if (data && !error) {
        setProject(data as Project);
        window.history.replaceState({}, "", `/build?project=${data.id}`);
        toast.success("Projet créé et sauvegardé !");
      } else {
        toast.error("Erreur de sauvegarde");
      }
    }
    setIsSaving(false);
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    await supabase.from("user_projects").delete().eq("id", project.id);
    setProject(null);
    setProjectName("Nouveau projet");
    setPreviewHtml("");
    setMessages([]);
    window.history.replaceState({}, "", "/build");
    toast.success("Projet supprimé");
    setShowSettingsSheet(false);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (file.type === "text/html" || file.name.endsWith(".html")) {
        setPreviewHtml(content);
        toast.success("Fichier HTML importé dans le preview !");
      } else {
        setInputValue(`[Fichier importé: ${file.name}]\n${content.slice(0, 2000)}`);
        toast.success("Fichier ajouté au chat !");
      }
    };
    reader.readAsText(file);
    setShowPlusSheet(false);
  };

  const filteredProjects = allProjects.filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const updatePreview = (html: string, css: string, js: string) => {
    setPreviewHtml(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`);
  };

  // Extract HTML code from markdown response
  const extractHtmlFromResponse = (text: string): string | null => {
    // Match fenced blocks and prioritize HTML documents
    const fencedBlocks = [...text.matchAll(/```[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)```/g)];
    const htmlBlock = fencedBlocks.find((m) => /<!DOCTYPE html|<html[\s>]/i.test(m[1]));
    if (htmlBlock) return htmlBlock[1].trim();
    if (fencedBlocks.length === 1) return fencedBlocks[0][1].trim();

    // Fallback: raw HTML returned without markdown fence
    const rawHtmlMatch = text.match(/(<!DOCTYPE html[\s\S]*<\/html>)/i);
    if (rawHtmlMatch) return rawHtmlMatch[1].trim();

    return null;
  };

  // Never show source code or internal tags in chat
  const stripCodeFromAssistantMessage = (text: string): string => {
    let cleaned = text;

    // Remove complete fenced code blocks
    cleaned = cleaned.replace(/```[a-zA-Z0-9_-]*\s*\n?[\s\S]*?```/g, "");

    // If a fenced block is currently streaming (opening fence without closing), hide it too
    const fenceMatches = cleaned.match(/```/g)?.length ?? 0;
    if (fenceMatches % 2 === 1) {
      cleaned = cleaned.slice(0, cleaned.lastIndexOf("```"));
    }

    // Remove IMAGE_REQUEST tags (complete or streaming)
    cleaned = cleaned.replace(/\[IMAGE_REQUEST\][\s\S]*?\[\/IMAGE_REQUEST\]/g, "");
    if (cleaned.includes("[IMAGE_REQUEST]")) {
      cleaned = cleaned.slice(0, cleaned.indexOf("[IMAGE_REQUEST]"));
    }
    // Remove WEB_SEARCH tags
    cleaned = cleaned.replace(/\[WEB_SEARCH\][\s\S]*?\[\/WEB_SEARCH\]/g, "");
    if (cleaned.includes("[WEB_SEARCH]")) {
      cleaned = cleaned.slice(0, cleaned.indexOf("[WEB_SEARCH]"));
    }

    // Fallback: if raw HTML leaks outside fences, hide it from first HTML token onward
    const rawHtmlStart = cleaned.search(/<!DOCTYPE html|<html[\s>]|<head[\s>]|<body[\s>]|<style[\s>]|<script[\s>]/i);
    if (rawHtmlStart !== -1) {
      cleaned = cleaned.slice(0, rawHtmlStart);
    }

    return cleaned.trim();
  };

  // ─── AI Streaming ───
  const handleSend = async (overrideMessage?: string) => {
    const msgText = overrideMessage || inputValue.trim();
    if (!msgText || isGenerating) return;

    // Include current code context if we have preview code
    let userContent = msgText;
    const lc = userContent.toLowerCase();
    const isModification = ["modif", "change", "ajoute", "enleve", "supprime", "corrige", "déplace", "remplace", "met à jour", "update"].some(k => lc.includes(k));
    if (previewHtml && isModification) {
      userContent += `\n\n[Code actuel du projet]\n\`\`\`html\n${previewHtml}\n\`\`\``;
    }

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: msgText, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue("");
    setIsGenerating(true);

    let assistantContent = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => {
            // For the last user message, use the enriched content with code context
            if (m.id === userMsg.id) return { role: m.role, content: userContent };
            return { role: m.role, content: m.content };
          }),
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        toast.error(errData.error || `Erreur ${resp.status}`);
        setIsGenerating(false);
        return;
      }

      if (!resp.body) { toast.error("Pas de stream"); setIsGenerating(false); return; }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      const assistantId = crypto.randomUUID();

      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: new Date() }]);

      while (!streamDone) {
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
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const finalContent = stripCodeFromAssistantMessage(assistantContent);
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: finalContent } : m))
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const finalContent = stripCodeFromAssistantMessage(assistantContent);
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: finalContent } : m))
              );
            }
          } catch { /* ignore */ }
        }
      }

      // Extract code and update preview automatically
      const extractedHtml = extractHtmlFromResponse(assistantContent);
      if (extractedHtml) {
        setPreviewHtml(extractedHtml);
        toast.success("Preview mis à jour !");
      }

      // Detect image generation request from AI
      const imageMatch = assistantContent.match(/\[IMAGE_REQUEST\]\s*(\{[\s\S]*?\})\s*\[\/IMAGE_REQUEST\]/);
      if (imageMatch) {
        try {
          const imageReq = JSON.parse(imageMatch[1]);
          toast.info("Génération de l'image en cours...");
          const imgResp = await fetch(CHAT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ generateImage: { prompt: imageReq.prompt, model: "google/gemini-2.5-flash-image" } }),
          });
          if (imgResp.ok) {
            const imgData = await imgResp.json();
            const imageUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            if (imageUrl) {
              setLastGeneratedImageUrl(imageUrl);
              // Save current site HTML before showing image preview
              if (previewHtml && !previewHtml.includes("Image générée par IA")) {
                previousSiteHtmlRef.current = previewHtml;
              }
              // Check if there's an existing site to offer insertion
              const hasExistingSite = previewHtml && !previewHtml.includes("Image générée par IA");
              // Show generated image in preview with download + insert buttons
              const insertBtnHtml = hasExistingSite
                ? `<button onclick="window.parent.postMessage({type:'insert-logo',url:'${imageUrl}'},'*')" class="dl-btn" style="background:linear-gradient(135deg,#10b981,#059669)">🎯 Insérer dans mon site</button>`
                : "";
              setPreviewHtml(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#111;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:16px;gap:16px}img{max-width:100%;max-height:70vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.5)}.dl-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:transform .2s,box-shadow .2s}.dl-btn:hover{transform:translateY(-2px);box-shadow:0 8px 25px rgba(99,102,241,0.4)}.btns{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}</style></head><body><img src="${imageUrl}" alt="Image générée par IA" /><div class="btns"><a href="${imageUrl}" download="omniai-image.png" class="dl-btn">⬇️ Télécharger</a>${insertBtnHtml}</div></body></html>`);
              // Update assistant message with image
              const cleanedText = stripCodeFromAssistantMessage(assistantContent).replace(/\[IMAGE_REQUEST\][\s\S]*?\[\/IMAGE_REQUEST\]/, "").trim();
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: cleanedText + `\n\n![Image générée](${imageUrl})` } : m)
              );
              toast.success("Image générée !");
              setActiveView("preview");
            }
          } else {
            toast.error("Erreur lors de la génération de l'image");
          }
        } catch (imgErr) {
          console.error("Image gen error:", imgErr);
          toast.error("Erreur de génération d'image");
        }
      }

      // Detect web search request from AI
      const searchMatch = assistantContent.match(/\[WEB_SEARCH\]\s*(\{[\s\S]*?\})\s*\[\/WEB_SEARCH\]/);
      if (searchMatch) {
        try {
          const searchReq = JSON.parse(searchMatch[1]);
          toast.info("Recherche web en cours...");
          const searchResp = await fetch(CHAT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ webSearch: { query: searchReq.query } }),
          });
          if (searchResp.ok) {
            const searchData = await searchResp.json();
            const results = searchData.data || searchData.results || [];
            const searchContext = results.map((r: any, i: number) =>
              `${i + 1}. **${r.title || r.url}**\n   ${r.url}\n   ${r.description || r.markdown?.slice(0, 200) || ""}`
            ).join("\n\n");

            const followUpMessages = [
              ...messages.map(m => ({ role: m.role, content: m.content })),
              { role: "assistant" as const, content: assistantContent },
              { role: "user" as const, content: `Voici les résultats de la recherche web pour "${searchReq.query}":\n\n${searchContext}\n\nUtilise ces résultats pour répondre à ma question initiale de manière complète et utile.` },
            ];
            const followResp = await fetch(CHAT_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ messages: followUpMessages }),
            });
            if (followResp.ok && followResp.body) {
              const followReader = followResp.body.getReader();
              const followDecoder = new TextDecoder();
              let followContent = "";
              while (true) {
                const { done: fDone, value: fValue } = await followReader.read();
                if (fDone) break;
                const fChunk = followDecoder.decode(fValue, { stream: true });
                for (const fLine of fChunk.split("\n")) {
                  if (!fLine.startsWith("data: ") || fLine.includes("[DONE]")) continue;
                  try {
                    const fParsed = JSON.parse(fLine.slice(6));
                    const fDelta = fParsed.choices?.[0]?.delta?.content;
                    if (fDelta) {
                      followContent += fDelta;
                      const fDisplay = stripCodeFromAssistantMessage(followContent);
                      setMessages((prev) =>
                        prev.map((m) => m.id === assistantId ? { ...m, content: fDisplay } : m)
                      );
                    }
                  } catch {}
                }
              }
              const followCodeMatch = followContent.match(/```html\s*([\s\S]*?)```/);
              if (followCodeMatch) {
                setPreviewHtml(followCodeMatch[1].trim());
                setActiveView("preview");
              }
              toast.success("Recherche terminée !");
            }
          } else {
            toast.error("Erreur lors de la recherche web");
          }
        } catch (searchErr) {
          console.error("Web search error:", searchErr);
          toast.error("Erreur de recherche web");
        }
      }

    } catch (e) {
      console.error(e);
      toast.error("Erreur de connexion à l'IA");
    }

    setIsGenerating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ─── Bottom sheet helper ───
  const BottomSheet = ({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) => (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a1a] rounded-t-2xl border-t border-white/10 max-h-[75vh] overflow-y-auto"
          >
            <div className="flex justify-center py-3"><div className="w-10 h-1 rounded-full bg-white/20" /></div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // ─── Sidebar overlay ───
  const SidebarOverlay = () => (
    <AnimatePresence>
      {showSidebar && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowSidebar(false)} />
          <motion.div
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 w-[80%] max-w-[320px] z-50 bg-[#1a1a1a] border-r border-white/10 flex flex-col"
          >
            <div className="p-3 border-b border-white/10">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10" onClick={() => { loadAllProjects(); }}>
                <Search className="w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => { setProjectSearch(e.target.value); if (!allProjects.length) loadAllProjects(); }}
                  placeholder="Search projects"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
                />
                <div className="flex-1" />
                <button onClick={() => setShowSidebar(false)}><X className="w-4 h-4 text-white/40" /></button>
              </div>
            </div>
            <button onClick={() => { setShowSidebar(false); navigate("/"); }} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
              <Home className="w-5 h-5 text-white/60" />
              <span className="text-sm font-medium text-white">Home</span>
            </button>
            <div className="px-4 pt-4 pb-2"><p className="text-xs font-medium text-white/40 mb-2">Recent projects</p></div>
            <button onClick={() => { setShowSidebar(false); navigate("/build"); }} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Plus className="w-5 h-5 text-white/40" />
              </div>
              <span className="text-sm font-medium text-white">Create new project</span>
            </button>
            {recentProjects.map((p) => (
              <button key={p.id} onClick={() => { setShowSidebar(false); navigate(`/build?project=${p.id}`); }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <Code className="w-4 h-4 text-white/40" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-white truncate max-w-[180px]">{p.name}</p>
                  <p className="text-xs text-white/40">{new Date(p.updated_at).toLocaleDateString()}</p>
                </div>
              </button>
            ))}
            <div className="px-4 pt-6 pb-2"><p className="text-xs font-medium text-white/40 mb-2">Projects</p></div>
            <button onClick={() => { loadAllProjects(); }} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
              <FolderOpen className="w-5 h-5 text-white/60" />
              <span className="text-sm font-medium text-white">All projects ({allProjects.length || "…"})</span>
            </button>
            <button onClick={() => { setShowSidebar(false); navigate("/dashboard"); }} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
              <BarChart3 className="w-5 h-5 text-white/60" />
              <span className="text-sm font-medium text-white">Dashboard</span>
            </button>

            {/* Filtered search results */}
            {projectSearch && filteredProjects.length > 0 && (
              <div className="px-4 pt-2">
                <p className="text-xs text-white/40 mb-2">Résultats ({filteredProjects.length})</p>
                {filteredProjects.map((p) => (
                  <button key={p.id} onClick={() => { setShowSidebar(false); navigate(`/build?project=${p.id}`); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-white/5 transition-colors rounded-lg">
                    <Code className="w-4 h-4 text-white/40" />
                    <span className="text-sm text-white truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
            {projectSearch && filteredProjects.length === 0 && allProjects.length > 0 && (
              <div className="px-4 pt-2">
                <p className="text-xs text-white/40">Aucun projet trouvé</p>
              </div>
            )}

            <div className="flex-1" />
            <div className="p-4 border-t border-white/10">
              <button onClick={() => { setShowSidebar(false); navigate("/profile"); }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 w-full hover:bg-white/10 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="text-sm font-medium text-white truncate">{user?.email || "Workspace"}</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-black text-white overflow-hidden">
      {/* ─── TOP BAR ─── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 min-h-[48px] shrink-0">
        <button onClick={() => setShowSidebar(true)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <Menu className="w-5 h-5 text-white/60" />
        </button>
        <button onClick={() => setShowProjectSheet(true)} className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
          <span className="font-semibold text-sm truncate max-w-[180px]">{projectName}</span>
          <ChevronDown className="w-3.5 h-3.5 text-white/40" />
        </button>
        <button onClick={() => setActiveView("preview")} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <Play className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* ─── CONTENT ─── */}
      <div className="flex-1 overflow-hidden flex flex-col" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {activeView === "chat" ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                    <Code className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Décrivez votre projet</h3>
                  <p className="text-sm text-white/50 max-w-sm">Dites-moi ce que vous voulez créer et je m'en occupe.</p>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-white/5 text-white rounded-bl-md"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown>{stripCodeFromAssistantMessage(msg.content)}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {isGenerating && messages[messages.length - 1]?.role !== "assistant" && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Prompt Suggestions */}
            {messages.length === 0 && !isGenerating && (
              <div className="shrink-0 px-3 pb-2">
                <div className="flex flex-wrap gap-2">
                  {[
                    { icon: "🌐", label: "Clone de Google", prompt: "Crée un clone fidèle de la page d'accueil de Google avec la barre de recherche fonctionnelle, les boutons et le design exact" },
                    { icon: "🎮", label: "Jeu Snake", prompt: "Crée un jeu Snake complet avec score, niveaux, contrôles tactiles et clavier, game over et restart" },
                    { icon: "🎨", label: "Génère un logo", prompt: "Génère une image de logo moderne et minimaliste pour une startup tech" },
                    { icon: "🛒", label: "Boutique en ligne", prompt: "Crée un site e-commerce moderne avec une page d'accueil, des produits, un panier et un checkout" },
                    { icon: "📱", label: "Portfolio", prompt: "Crée un portfolio personnel moderne et animé avec sections hero, projets, compétences et contact" },
                    { icon: "🕹️", label: "Jeu Pac-Man", prompt: "Crée un clone de Pac-Man jouable avec fantômes, score, vies, niveaux et contrôles tactiles" },
                    { icon: "🖼️", label: "Génère une image", prompt: "Génère une image d'un paysage fantastique avec des montagnes, un lac et un coucher de soleil" },
                    { icon: "📰", label: "Clone Twitter", prompt: "Crée un clone fidèle de Twitter/X avec le feed, les tweets, likes, profil et sidebar trending" },
                  ].map((s) => (
                    <button
                      key={s.label}
                      onClick={() => { setInputValue(s.prompt); inputRef.current?.focus(); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/30 transition-all text-xs text-white/70 hover:text-white"
                    >
                      <span>{s.icon}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Input Bar */}
            <div className="shrink-0 border-t border-white/10 p-3">
              <div className="flex items-end gap-2">
                <button onClick={() => setShowPlusSheet(true)} className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0 mb-0.5">
                  <Plus className="w-5 h-5 text-white/60" />
                </button>
                <button onClick={() => setShowDotsSheet(true)} className="p-2 rounded-xl hover:bg-white/10 transition-colors shrink-0 mb-0.5">
                  <MoreHorizontal className="w-5 h-5 text-white/60" />
                </button>
                <div className="flex-1">
                  <textarea ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder="Décrivez ce que vous voulez..." rows={1}
                    className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors max-h-32"
                    style={{ height: "auto", minHeight: "40px" }}
                    onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 128) + "px"; }}
                  />
                </div>
                <button onClick={() => handleSend()} disabled={!inputValue.trim() || isGenerating}
                  className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 mb-0.5">
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-end mt-2 px-1">
                <button onClick={() => toast.info("Micro — bientôt disponible")} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Voice">
                  <Mic className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Preview URL bar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-white/5 shrink-0">
              <button onClick={() => iframeRef.current?.contentWindow?.location.reload()} className="p-1.5 rounded-md hover:bg-white/10 transition-colors">
                <RotateCcw className="w-3.5 h-3.5 text-white/60" />
              </button>
              <button onClick={() => { if (iframeRef.current) iframeRef.current.srcdoc = previewHtml; }} className="p-1.5 rounded-md hover:bg-white/10 transition-colors">
                <Home className="w-3.5 h-3.5 text-white/60" />
              </button>
              <div className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/40 truncate">
                {project?.published_url || "localhost:preview"}
              </div>
              <button className="p-1.5 rounded-md hover:bg-white/10 transition-colors">
                <ExternalLink className="w-3.5 h-3.5 text-white/60" />
              </button>
            </div>

            {/* Preview iframe */}
            <div className="flex-1 relative">
              {previewHtml ? (
                <iframe ref={iframeRef} srcDoc={previewHtml} className="w-full h-full border-0 bg-white" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" title="Preview" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <Globe className="w-12 h-12 text-white/20 mb-3" />
                  <p className="text-sm text-white/40">L'aperçu apparaîtra ici</p>
                </div>
              )}
            </div>

            {/* Preview bottom bar */}
            <div className="shrink-0 border-t border-white/10 p-3 flex items-center justify-between">
              <button onClick={() => setActiveView("chat")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-white/60 hover:text-white hover:border-white/20 transition-colors">
                <ArrowLeft className="w-3 h-3" />
                Chat
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowUrlSheet(true)} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Navigate">
                  <Slash className="w-4 h-4 text-white/60" />
                </button>
                <button onClick={() => toast.info("Publication — bientôt disponible")} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Publish">
                  <ArrowUp className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══ SHEETS ═══ */}

      <BottomSheet open={showPlusSheet} onClose={() => setShowPlusSheet(false)}>
        <div className="px-4 pb-6 space-y-1">
          <button onClick={() => { setShowPlusSheet(false); /* Camera API */ if (navigator.mediaDevices?.getUserMedia) { toast.info("Ouverture de la caméra..."); navigator.mediaDevices.getUserMedia({ video: true }).then(() => toast.success("Caméra activée")).catch(() => toast.error("Caméra non disponible")); } else { toast.error("Caméra non supportée"); } }}
            className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
            <Camera className="w-5 h-5 text-white/60" /><span className="text-sm font-medium text-white">Prendre une photo</span>
          </button>
          <button onClick={() => { fileInputRef.current?.click(); }}
            className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
            <Image className="w-5 h-5 text-white/60" /><span className="text-sm font-medium text-white">Importer un fichier</span>
          </button>
          <input ref={fileInputRef} type="file" accept=".html,.css,.js,.json,.txt,.md,image/*,video/*" className="hidden" onChange={handleFileImport} />
        </div>
      </BottomSheet>

      <BottomSheet open={showDotsSheet} onClose={() => setShowDotsSheet(false)}>
        <div className="px-4 pb-6 space-y-1">
          <button onClick={() => { setShowDotsSheet(false); setShowShareSheet(true); }} className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
            <Share2 className="w-5 h-5 text-white/60" /><span className="text-sm font-medium text-white">Share</span>
          </button>
          <button onClick={() => { setShowDotsSheet(false); setShowPublishSheet(true); }} className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
            <Upload className="w-5 h-5 text-white/60" /><span className="text-sm font-medium text-white">Publish</span>
            {project?.is_published && <span className="ml-auto text-xs text-green-400">● Live</span>}
          </button>
          <button onClick={() => { setShowDotsSheet(false); setShowSettingsSheet(true); }} className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
            <Settings className="w-5 h-5 text-white/60" /><span className="text-sm font-medium text-white">Settings</span>
          </button>
          <button onClick={() => { setShowDotsSheet(false); setShowAnalyticsSheet(true); }} className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
            <BarChart3 className="w-5 h-5 text-white/60" /><span className="text-sm font-medium text-white">Analytics</span>
          </button>
          <button onClick={() => { setShowDotsSheet(false); setShowCloudSheet(true); handleSaveProject(); }} className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
            <Cloud className="w-5 h-5 text-white/60" /><span className="text-sm font-medium text-white">Cloud Save</span>
          </button>
          <button onClick={() => { setShowDotsSheet(false); setShowCodeSheet(true); }} className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
            <Code className="w-5 h-5 text-white/60" /><span className="text-sm font-medium text-white">Code</span>
          </button>
          <button onClick={() => { setShowDotsSheet(false); setShowFilesSheet(true); }} className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
            <FolderOpen className="w-5 h-5 text-white/60" /><span className="text-sm font-medium text-white">Files</span>
          </button>
          <button onClick={() => { setShowDotsSheet(false); setShowSecuritySheet(true); }} className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
            <Shield className="w-5 h-5 text-white/60" /><span className="text-sm font-medium text-white">Security</span>
          </button>
          <button onClick={() => { setShowDotsSheet(false); setShowSpeedSheet(true); }} className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
            <Zap className="w-5 h-5 text-white/60" /><span className="text-sm font-medium text-white">Speed</span>
          </button>
          <button onClick={() => { setShowDotsSheet(false); setShowHistorySheet(true); }} className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
            <History className="w-5 h-5 text-white/60" /><span className="text-sm font-medium text-white">History</span>
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={showProjectSheet} onClose={() => setShowProjectSheet(false)}>
        <div className="px-4 pb-6">
          <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Credits</span>
              <button onClick={() => { setShowProjectSheet(false); navigate("/pricing"); }} className="flex items-center gap-1 text-sm text-primary font-medium">Upgrade <ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-2"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((userCredits ?? 0) / 100 * 100, 100)}%` }} /></div>
            <p className="text-xs text-white/40">{userCredits !== null ? `${userCredits} crédits restants` : "Chargement..."}</p>
          </div>
          <div className="space-y-1">
            <button onClick={() => { setShowProjectSheet(false); setShowSettingsSheet(true); }}
              className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
              <Settings className="w-5 h-5 text-white/60" /><span className="text-sm font-medium text-white">Settings</span>
            </button>
            <button onClick={() => { setShowProjectSheet(false); setRenameValue(projectName); setShowRenameSheet(true); }}
              className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
              <Pen className="w-5 h-5 text-white/60" /><span className="text-sm font-medium text-white">Rename project</span>
            </button>
            <button onClick={() => { setShowProjectSheet(false); setShowAppearanceSheet(true); }}
              className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
              <Moon className="w-5 h-5 text-white/60" />
              <div className="flex-1 flex items-center justify-between">
                <span className="text-sm font-medium text-white">Appearance</span>
                <span className="text-xs text-white/40 capitalize">{appearance}</span>
              </div>
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={showUrlSheet} onClose={() => setShowUrlSheet(false)}>
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white">/</div>
            <button onClick={() => setShowUrlSheet(false)} className="p-2.5 rounded-xl bg-primary text-primary-foreground"><Send className="w-4 h-4" /></button>
          </div>
          <div className="space-y-1 mb-4">
            <p className="text-xs text-white/40 px-1 mb-2">/*</p>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-sm text-white">/</span><div className="flex-1" /><FolderOpen className="w-4 h-4 text-white/40" />
            </div>
            {["live-users", "team", "blocked", "terms", "accounts", "sessions"].map((route) => (
              <button key={route} className="block w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/5 rounded-xl transition-colors">{route}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 px-4 pb-6">
          <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-white/60 hover:text-white transition-colors">
            <History className="w-4 h-4" />History
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
            <Globe className="w-4 h-4" />Open in browser
          </button>
        </div>
      </BottomSheet>

      {/* ═══ FEATURE SHEETS ═══ */}

      {/* Share */}
      <BottomSheet open={showShareSheet} onClose={() => setShowShareSheet(false)}>
        <div className="px-4 pb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Partager le projet</h3>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 mb-4">
            <Link className="w-4 h-4 text-white/40 shrink-0" />
            <span className="text-xs text-white/60 truncate">{project ? `${window.location.origin}/build?project=${project.id}` : window.location.href}</span>
          </div>
          <button onClick={handleShare} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2">
            <Copy className="w-4 h-4" /> Copier le lien
          </button>
        </div>
      </BottomSheet>

      {/* Publish */}
      <BottomSheet open={showPublishSheet} onClose={() => setShowPublishSheet(false)}>
        <div className="px-4 pb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Publication</h3>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${project?.is_published ? "bg-green-400" : "bg-white/20"}`} />
              <span className="text-sm text-white">{project?.is_published ? "Publié" : "Non publié"}</span>
            </div>
            {project?.published_url && <p className="text-xs text-white/40 truncate">{project.published_url}</p>}
          </div>
          <button onClick={handlePublish} disabled={isPublishing}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            <Upload className="w-4 h-4" /> {project?.is_published ? "Dépublier" : "Publier"}
          </button>
          {project?.is_published && project?.published_url && (
            <div className="flex items-center gap-2 mt-3">
              <a href={project.published_url} target="_blank" rel="noopener noreferrer"
                className="flex-1 text-xs text-blue-400 underline truncate">{project.published_url}</a>
              <button onClick={async () => { await navigator.clipboard.writeText(project.published_url || ""); toast.success("Lien copié !"); }}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <Copy className="w-3.5 h-3.5 text-white/60" />
              </button>
              <a href={project.published_url} target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <ExternalLink className="w-3.5 h-3.5 text-white/60" />
              </a>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Settings */}
      <BottomSheet open={showSettingsSheet} onClose={() => setShowSettingsSheet(false)}>
        <div className="px-4 pb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Paramètres du projet</h3>
          <div className="space-y-1">
            <button onClick={() => { setShowSettingsSheet(false); setRenameValue(projectName); setShowRenameSheet(true); }}
              className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
              <Pen className="w-5 h-5 text-white/60" /><span className="text-sm font-medium text-white">Renommer</span>
            </button>
            <button onClick={handleSaveProject} disabled={isSaving}
              className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
              <Save className="w-5 h-5 text-white/60" /><span className="text-sm font-medium text-white">{isSaving ? "Sauvegarde..." : "Sauvegarder"}</span>
            </button>
            <button onClick={handleDownloadCode}
              className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
              <Download className="w-5 h-5 text-white/60" /><span className="text-sm font-medium text-white">Exporter HTML</span>
            </button>
            <button onClick={() => { setShowSettingsSheet(false); setShowAppearanceSheet(true); }}
              className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-white/5 transition-colors">
              <Moon className="w-5 h-5 text-white/60" /><span className="text-sm font-medium text-white">Apparence</span>
            </button>
            {project && (
              <button onClick={handleDeleteProject}
                className="flex items-center gap-4 w-full px-3 py-3.5 rounded-xl hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-5 h-5 text-red-400" /><span className="text-sm font-medium text-red-400">Supprimer le projet</span>
              </button>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Analytics */}
      <BottomSheet open={showAnalyticsSheet} onClose={() => setShowAnalyticsSheet(false)}>
        <div className="px-4 pb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Analytiques</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-2xl font-bold text-white">{messages.length}</p>
              <p className="text-xs text-white/40 mt-1">Messages</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-2xl font-bold text-white">{messages.filter(m => m.role === "assistant").length}</p>
              <p className="text-xs text-white/40 mt-1">Réponses IA</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-2xl font-bold text-white">{previewHtml ? "1" : "0"}</p>
              <p className="text-xs text-white/40 mt-1">Preview actif</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-2xl font-bold text-white">{project?.is_published ? "Oui" : "Non"}</p>
              <p className="text-xs text-white/40 mt-1">Publié</p>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-white/40 mb-1">Taille du code</p>
            <p className="text-sm font-medium text-white">{previewHtml ? `${(previewHtml.length / 1024).toFixed(1)} Ko` : "Aucun code"}</p>
          </div>
        </div>
      </BottomSheet>

      {/* Cloud */}
      <BottomSheet open={showCloudSheet} onClose={() => setShowCloudSheet(false)}>
        <div className="px-4 pb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Cloud</h3>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isSaving ? "bg-yellow-400 animate-pulse" : project ? "bg-green-400" : "bg-white/20"}`} />
            <div>
              <p className="text-sm font-medium text-white">{isSaving ? "Sauvegarde en cours..." : project ? "Synchronisé" : "Non sauvegardé"}</p>
              <p className="text-xs text-white/40">{project ? `Dernière mise à jour: ${new Date(project.updated_at).toLocaleString("fr-FR")}` : "Sauvegardez pour synchroniser"}</p>
            </div>
          </div>
          {!project && (
            <button onClick={() => { setShowCloudSheet(false); handleSaveProject(); }}
              className="w-full mt-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2">
              <Cloud className="w-4 h-4" /> Sauvegarder maintenant
            </button>
          )}
        </div>
      </BottomSheet>

      {/* Code */}
      <BottomSheet open={showCodeSheet} onClose={() => setShowCodeSheet(false)}>
        <div className="px-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Code source</h3>
            <div className="flex gap-2">
              <button onClick={handleCopyCode} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/60 hover:text-white transition-colors">
                {codeCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {codeCopied ? "Copié" : "Copier"}
              </button>
              <button onClick={handleDownloadCode} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/60 hover:text-white transition-colors">
                <Download className="w-3 h-3" /> Télécharger
              </button>
            </div>
          </div>
          <pre className="p-3 rounded-xl bg-black border border-white/10 text-xs text-green-400 overflow-x-auto max-h-[50vh] whitespace-pre-wrap break-all font-mono">
            {previewHtml || "// Aucun code généré pour le moment"}
          </pre>
        </div>
      </BottomSheet>

      {/* Files */}
      <BottomSheet open={showFilesSheet} onClose={() => setShowFilesSheet(false)}>
        <div className="px-4 pb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Fichiers du projet</h3>
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
              <FileText className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-white">index.html</span>
              <span className="ml-auto text-xs text-white/40">{previewHtml ? `${(previewHtml.length / 1024).toFixed(1)} Ko` : "vide"}</span>
            </div>
            {project?.css_code && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-white">styles.css</span>
              </div>
            )}
            {project?.js_code && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
                <FileText className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-white">script.js</span>
              </div>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Security */}
      <BottomSheet open={showSecuritySheet} onClose={() => setShowSecuritySheet(false)}>
        <div className="px-4 pb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Sécurité</h3>
          <div className="space-y-3">
            {[
              { label: "Sandbox iframe", status: true, desc: "Le preview s'exécute dans un iframe sandboxé" },
              { label: "HTTPS", status: true, desc: "Connexion chiffrée" },
              { label: "Authentification", status: !!user, desc: user ? "Connecté" : "Non connecté" },
              { label: "Projet verrouillé", status: project?.is_locked ?? false, desc: project?.is_locked ? "Accès protégé" : "Accès libre" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className={`w-2 h-2 rounded-full ${item.status ? "bg-green-400" : "bg-yellow-400"}`} />
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-white/40">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </BottomSheet>

      {/* Speed */}
      <BottomSheet open={showSpeedSheet} onClose={() => setShowSpeedSheet(false)}>
        <div className="px-4 pb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Performance</h3>
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white">Taille du code</span>
                <span className={`text-sm font-medium ${(previewHtml?.length || 0) < 50000 ? "text-green-400" : "text-yellow-400"}`}>
                  {previewHtml ? `${(previewHtml.length / 1024).toFixed(1)} Ko` : "0 Ko"}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-green-400 rounded-full" style={{ width: `${Math.min((previewHtml?.length || 0) / 1000, 100)}%` }} />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm text-white mb-1">Recommandations</p>
              <ul className="text-xs text-white/40 space-y-1">
                <li>• Utilisez des images optimisées (WebP)</li>
                <li>• Minimisez le CSS et JS inline</li>
                <li>• Activez le lazy-loading pour les images</li>
                <li>• Utilisez des CDN pour les bibliothèques</li>
              </ul>
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* History */}
      <BottomSheet open={showHistorySheet} onClose={() => setShowHistorySheet(false)}>
        <div className="px-4 pb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Historique des conversations</h3>
          {messages.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-8">Aucun message pour le moment</p>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className={`p-3 rounded-xl text-xs ${msg.role === "user" ? "bg-primary/10 border border-primary/20" : "bg-white/5 border border-white/10"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{msg.role === "user" ? "Vous" : "IA"}</span>
                    <span className="text-white/30">{msg.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="text-white/60 line-clamp-3">{stripCodeFromAssistantMessage(msg.content) || "(code généré)"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Rename */}
      <BottomSheet open={showRenameSheet} onClose={() => setShowRenameSheet(false)}>
        <div className="px-4 pb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Renommer le projet</h3>
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary/50 mb-4"
            placeholder="Nom du projet"
            autoFocus
          />
          <button onClick={handleRename} disabled={!renameValue.trim()}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
            Renommer
          </button>
        </div>
      </BottomSheet>

      {/* Appearance */}
      <BottomSheet open={showAppearanceSheet} onClose={() => setShowAppearanceSheet(false)}>
        <div className="px-4 pb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Apparence</h3>
          <div className="space-y-1">
            {([
              { value: "system", label: "Système", icon: Monitor },
              { value: "dark", label: "Sombre", icon: Moon },
              { value: "light", label: "Clair", icon: Sun },
            ] as const).map((item) => (
              <button key={item.value} onClick={() => { setAppearance(item.value); setShowAppearanceSheet(false); toast.success(`Thème: ${item.label}`); }}
                className={`flex items-center gap-4 w-full px-3 py-3.5 rounded-xl transition-colors ${appearance === item.value ? "bg-primary/10 border border-primary/30" : "hover:bg-white/5"}`}>
                <item.icon className="w-5 h-5 text-white/60" />
                <span className="text-sm font-medium text-white">{item.label}</span>
                {appearance === item.value && <Check className="w-4 h-4 text-primary ml-auto" />}
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>

      <SidebarOverlay />
    </div>
  );
}
