import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Send, Sparkles, Globe, PenLine, FileText, Zap, FileDown, Copy, Check, RotateCcw, Mic, MicOff } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { UserMenu } from "@/components/UserMenu";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { PptxEmailDialog } from "@/components/PptxEmailDialog";

export type Msg = { role: "user" | "assistant"; content: string };

const RESEARCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-chat`;

export async function streamResearch({ messages, onDelta, onDone, onError }: {
  messages: Msg[]; onDelta: (t: string) => void; onDone: () => void; onError: (err: string) => void;
}) {
  const resp = await fetch(RESEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    body: JSON.stringify({ messages }),
  });
  if (!resp.ok) { const d = await resp.json().catch(() => ({})); onError(d.error || "Erreur de connexion"); return; }
  if (!resp.body) { onError("Pas de réponse"); return; }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;
  while (!done) {
    const { done: rd, value } = await reader.read();
    if (rd) break;
    buf += decoder.decode(value, { stream: true });
    let ni: number;
    while ((ni = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, ni);
      buf = buf.slice(ni + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || !line.trim()) continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const p = JSON.parse(json);
        const c = p.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch { buf = line + "\n" + buf; break; }
    }
  }
  onDone();
}

export default function ResearchAI() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [pptxOpen, setPptxOpen] = useState(false);
  const [pptxTopic, setPptxTopic] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const [voiceMode, setVoiceMode] = useState(false);
  const [listening, setListening] = useState(false);
  const voiceModeRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const sendRef = useRef<(t?: string) => void>(() => {});

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("La voix n'est pas supportée sur ce navigateur (essaie Chrome)."); setVoiceMode(false); voiceModeRef.current = false; return; }
    try { recognitionRef.current?.abort(); } catch {}
    const rec = new SR();
    rec.lang = "fr-FR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join("");
      setInput(text);
      if (e.results[e.results.length - 1].isFinal && text.trim()) sendRef.current(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e: any) => {
      setListening(false);
      if (e.error === "not-allowed") { toast.error("Autorise le micro pour parler à OmniAI."); setVoiceMode(false); voiceModeRef.current = false; }
    };
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, []);

  const speak = useCallback((text: string) => {
    if (!voiceModeRef.current) return;
    const clean = text.replace(/[#*_`>\[\]()]/g, "").replace(/https?:\/\/\S+/g, "").slice(0, 1500);
    if (!("speechSynthesis" in window) || !clean.trim()) { if (voiceModeRef.current) startListening(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "fr-FR";
    u.onend = () => { if (voiceModeRef.current) startListening(); };
    window.speechSynthesis.speak(u);
  }, [startListening]);

  const toggleVoice = () => {
    if (voiceMode) {
      voiceModeRef.current = false; setVoiceMode(false); setListening(false);
      try { recognitionRef.current?.abort(); } catch {}
      window.speechSynthesis?.cancel();
    } else {
      voiceModeRef.current = true; setVoiceMode(true); startListening();
    }
  };

  useEffect(() => () => { try { recognitionRef.current?.abort(); } catch {} window.speechSynthesis?.cancel(); }, []);

  const send = useCallback(async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || isLoading) return;
    const userMsg: Msg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    const ta = inputRef.current;
    if (ta) { ta.style.height = "auto"; }
    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };
    await streamResearch({
      messages: [...messages, userMsg],
      onDelta: upsert,
      onDone: () => { setIsLoading(false); speak(assistantSoFar); },
      onError: (err) => { toast.error(err); setIsLoading(false); },
    });
  }, [input, isLoading, messages, speak]);
  sendRef.current = send;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const copyText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success("Copié !");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
    toast.success("Conversation effacée");
  };

  useEffect(() => {
    const onStart = (e: TouchEvent) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; };
    const onEnd = (e: TouchEvent) => {
      const diffX = e.changedTouches[0].clientX - touchStartX.current;
      const diffY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
      if (diffX > 80 && diffY < 100) { sessionStorage.setItem("swipe-direction", "right"); navigate("/"); }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => { window.removeEventListener("touchstart", onStart); window.removeEventListener("touchend", onEnd); };
  }, [navigate]);

  const quickQuestions = [
    { icon: Globe, label: "Recherche", desc: "Actualités & web", prompt: "Quelles sont les dernières actualités importantes ?" },
    { icon: PenLine, label: "Humaniser", desc: "Réécriture naturelle", prompt: "Humanise ce texte pour qu'il paraisse écrit par un humain : [colle ton texte ici]" },
    { icon: FileText, label: "PowerPoint", desc: "Présentation pro", prompt: "Crée-moi un PowerPoint sur l'histoire de l'intelligence artificielle" },
    { icon: Zap, label: "Coder", desc: "Génère du code", prompt: "Écris-moi une fonction JavaScript pour trier un tableau" },
  ];

  const swipeDir = useMemo(() => {
    const d = sessionStorage.getItem("swipe-direction");
    sessionStorage.removeItem("swipe-direction");
    return d;
  }, []);

  return (
    <motion.div
      initial={{ x: swipeDir === "left" ? "100%" : swipeDir === "right" ? "-100%" : 0, opacity: swipeDir ? 0.5 : 1 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex flex-col h-screen bg-background"
    >
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] via-transparent to-primary/[0.01] pointer-events-none" />

      {/* Header */}
      <header className="relative flex items-center justify-between px-4 h-14 border-b border-border/40 bg-background/80 backdrop-blur-2xl sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/index")}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-[14px] bg-gradient-to-br from-primary via-primary/80 to-accent-foreground flex items-center justify-center shadow-md shadow-primary/25">
                <Sparkles className="w-[18px] h-[18px] text-primary-foreground" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold tracking-tight leading-none" style={{ fontFamily: "var(--font-display)" }}>OmniAI</h1>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Assistant intelligent</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
              title="Nouvelle conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <LanguageToggle />
          <ThemeToggle />
          {user && <UserMenu />}
        </div>
      </header>

      {/* Chat area */}
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-full text-center px-5 py-12">
            {/* Hero icon */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.05, type: "spring", stiffness: 180, damping: 16 }}
              className="relative mb-8"
            >
              <div className="w-[72px] h-[72px] rounded-[22px] bg-gradient-to-br from-primary/12 to-primary/4 flex items-center justify-center border border-primary/8">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div className="absolute -inset-3 rounded-[28px] bg-primary/5 blur-xl -z-10" />
            </motion.div>

            <motion.h2
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-[22px] font-bold mb-2 tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Comment puis-je vous aider ?
            </motion.h2>
            <motion.p
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-muted-foreground text-[13px] max-w-[280px] mb-10 leading-relaxed"
            >
              Recherche, rédaction, code, présentations — je m'occupe de tout.
            </motion.p>

            <div className="grid grid-cols-2 gap-3 w-full max-w-[340px]">
              {quickQuestions.map((q, idx) => (
                <motion.button
                  key={q.label}
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + idx * 0.06, type: "spring", stiffness: 200, damping: 20 }}
                  onClick={() => { setInput(q.prompt); setTimeout(() => inputRef.current?.focus(), 100); }}
                  className="relative p-4 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 text-left hover:border-primary/30 hover:bg-card transition-all duration-200 group overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/[0.03] rounded-bl-[40px] group-hover:bg-primary/[0.06] transition-colors" />
                  <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center mb-3 group-hover:bg-primary/12 transition-colors">
                    <q.icon className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <p className="text-[13px] font-semibold leading-tight text-foreground">{q.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{q.desc}</p>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-5">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn("flex mb-4", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-[10px] bg-gradient-to-br from-primary via-primary/80 to-accent-foreground flex items-center justify-center mr-2.5 mt-0.5 shrink-0 shadow-sm shadow-primary/15">
                      <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[82%] relative",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-[18px] rounded-br-[6px] px-4 py-2.5 shadow-sm shadow-primary/10"
                      : "rounded-[18px] rounded-bl-[6px]"
                  )}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-p:leading-relaxed prose-ul:my-1.5 prose-li:my-0.5 prose-headings:mb-2 prose-headings:mt-3 prose-code:text-primary prose-code:bg-primary/8 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[12px] prose-pre:bg-card prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-[14px] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    )}

                    {/* Actions */}
                    {msg.role === "assistant" && !isLoading && (
                      <div className="flex items-center gap-1 mt-3">
                        <button
                          onClick={() => copyText(msg.content, i)}
                          className={cn(
                            "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg transition-all",
                            copiedIdx === i
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                          )}
                        >
                          {copiedIdx === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedIdx === i ? "Copié" : "Copier"}
                        </button>
                        {i === messages.length - 1 && (
                          <button
                            onClick={() => {
                              const userMsg = [...messages].reverse().find(m => m.role === "user");
                              setPptxTopic(userMsg?.content || msg.content.slice(0, 200));
                              setPptxOpen(true);
                            }}
                            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 px-2.5 py-1 rounded-lg transition-all"
                          >
                            <FileDown className="w-3 h-3" />
                            PowerPoint
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex mb-4"
              >
                <div className="w-7 h-7 rounded-[10px] bg-gradient-to-br from-primary via-primary/80 to-accent-foreground flex items-center justify-center mr-2.5 mt-0.5 shrink-0 shadow-sm shadow-primary/15">
                  <Sparkles className="w-3.5 h-3.5 text-primary-foreground animate-pulse" />
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="relative p-3 pt-2 bg-background/80 backdrop-blur-2xl border-t border-border/30">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2 bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl px-3 py-1.5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={listening ? "Je t'écoute..." : "Écrivez votre message..."}
              rows={1}
              className="flex-1 resize-none bg-transparent py-2 text-[14px] focus:outline-none placeholder:text-muted-foreground/60"
              style={{ maxHeight: "120px" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
            />
            <Button
              type="button"
              onClick={toggleVoice}
              size="icon"
              variant={voiceMode ? "default" : "ghost"}
              aria-label={voiceMode ? "Arrêter le mode vocal" : "Parler à OmniAI"}
              className={`rounded-xl h-9 w-9 shrink-0 mb-0.5 ${listening ? "animate-pulse" : ""}`}
            >
              {voiceMode ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button
              onClick={() => send()}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="rounded-xl h-9 w-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/20 shrink-0 mb-0.5 disabled:opacity-30"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5 font-medium">
            OmniAI peut faire des erreurs. Vérifiez les informations importantes.
          </p>
        </div>
      </div>

      <PptxEmailDialog open={pptxOpen} onOpenChange={setPptxOpen} topic={pptxTopic} />
    </motion.div>
  );
}
