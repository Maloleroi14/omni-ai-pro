import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, MicOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { streamResearch, type Msg } from "./ResearchAI";

type Status = "idle" | "listening" | "thinking" | "speaking";

const VOICE_HINT: Msg = {
  role: "user",
  content:
    "(Consigne : nous sommes en conversation vocale. Réponds en français parlé naturel, en 1 à 4 phrases courtes, sans markdown, sans listes, sans liens. Reste naturel comme un ami au téléphone.)",
};

function cleanForSpeech(t: string) {
  return t
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[#*_`>|~[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function VoiceChat() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("idle");
  const [active, setActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const activeRef = useRef(false);
  const historyRef = useRef<Msg[]>([]);
  const recRef = useRef<any>(null);
  const supported =
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const stopAll = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    setStatus("idle");
    try { recRef.current?.abort(); } catch {}
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const browserSpeak = (clean: string, after: () => void) => {
    if (!("speechSynthesis" in window)) return after();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "fr-FR";
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("fr"));
    const male = voices.find((v) => /thomas|paul|henri|nicolas|claude|male|homme|guillaume|mathieu|antoine|remy/i.test(v.name));
    if (male || voices[0]) u.voice = (male || voices[0])!;
    u.pitch = 0.85;
    u.rate = 1;
    u.onend = after;
    u.onerror = after;
    window.speechSynthesis.speak(u);
  };

  const speak = useCallback(async (text: string, after: () => void) => {
    const clean = cleanForSpeech(text);
    if (!clean) return after();
    setStatus("speaking");
    try {
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ text: clean }),
      });
      if (!r.ok) throw new Error("tts");
      const blob = await r.blob();
      if (!activeRef.current) return;
      const url = URL.createObjectURL(blob);
      const a = audioRef.current || new Audio();
      audioRef.current = a;
      a.src = url;
      a.onended = () => { URL.revokeObjectURL(url); after(); };
      a.onerror = () => { URL.revokeObjectURL(url); browserSpeak(clean, after); };
      await a.play();
    } catch {
      if (activeRef.current) browserSpeak(clean, after);
    }
  }, []);

  const listen = useCallback(() => {
    if (!activeRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "fr-FR";
    rec.interimResults = true;
    rec.continuous = true;
    let finalText = "";
    let latest = "";
    let silenceTimer: any = null;
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      latest = text;
      setTranscript(text);
      clearTimeout(silenceTimer);
      // Tu ne parles plus depuis 1,4 s → on envoie
      silenceTimer = setTimeout(() => { finalText = latest; try { rec.stop(); } catch {} }, 1400);
    };
    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        toast.error("Autorise l'accès au micro dans ton navigateur pour parler à OmniAI.");
        stopAll();
      }
    };
    rec.onend = () => {
      clearTimeout(silenceTimer);
      if (!finalText && latest) finalText = latest;
      if (!activeRef.current) return;
      if (finalText.trim()) ask(finalText.trim());
      else setTimeout(listen, 250); // silence → keep listening
    };
    recRef.current = rec;
    setTranscript("");
    setStatus("listening");
    try { rec.start(); } catch { setTimeout(listen, 500); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopAll]);

  const ask = useCallback(async (text: string) => {
    setStatus("thinking");
    setReply("");
    const userMsg: Msg = { role: "user", content: text };
    historyRef.current = [...historyRef.current, userMsg].slice(-20);
    let answer = "";
    await streamResearch({
      messages: [VOICE_HINT, ...historyRef.current],
      onDelta: (c) => { answer += c; setReply(answer); },
      onDone: () => {
        historyRef.current = [...historyRef.current, { role: "assistant" as const, content: answer }].slice(-20);
        if (!activeRef.current) return;
        speak(answer, () => { if (activeRef.current) listen(); });
      },
      onError: (err) => {
        toast.error(err);
        if (activeRef.current) setTimeout(listen, 800);
      },
    }).catch(() => {
      toast.error("Connexion perdue, je réessaie d'écouter.");
      if (activeRef.current) setTimeout(listen, 1000);
    });
  }, [listen, speak]);

  const start = async () => {
    if (!supported) {
      toast.error("La voix n'est pas supportée sur ce navigateur. Utilise Chrome ou Edge.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      toast.error("Accès au micro refusé. Autorise-le dans les réglages du navigateur.");
      return;
    }
    window.speechSynthesis?.getVoices();
    // unlock audio playback on mobile (user gesture)
    const a = audioRef.current || new Audio();
    audioRef.current = a;
    a.src = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7pyn3Xf//WreyTRUoAWgBgkOAGbZHBgG1OF6zM82DWbZaUmMBptgQhGjsyYqc9ae9XFz280948NMBWInljyzsNRFLPWdnZGWrddDsjK1unuSrVN9jJsK8KuQtQCtMBjCEtImISdNKJOopIpBFpNSMbIHCSRpRR5iakjTiyzLhchUUBwCgyKiweBv/7UsQbg8isVNoMPMjAAAA0gAAABEVFGmgqK////9bP/6XCykxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";
    a.play().catch(() => {});
    activeRef.current = true;
    setActive(true);
    listen();
  };

  // Tap during speaking = interrupt and talk
  const interrupt = () => {
    if (status === "speaking") {
      window.speechSynthesis.cancel();
      audioRef.current?.pause();
      listen();
    }
  };

  useEffect(() => () => stopAll(), [stopAll]);

  const label =
    status === "listening" ? "Je t'écoute…" :
    status === "thinking" ? "Je réfléchis…" :
    status === "speaking" ? "Je parle… (touche le cercle pour m'interrompre)" :
    "Appuie sur le micro pour commencer";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" onClick={() => { stopAll(); navigate("/"); }} aria-label="Retour">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold text-lg" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Conversation vocale</h1>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 text-center">
        <button
          onClick={interrupt}
          aria-label="Orbe vocal"
          className={`relative w-48 h-48 rounded-full bg-gradient-to-br from-primary to-primary/40 shadow-2xl shadow-primary/30 transition-transform duration-500 ${
            status === "listening" ? "scale-110 animate-pulse" : status === "speaking" ? "scale-105" : status === "thinking" ? "scale-95 opacity-80" : "scale-100 opacity-60"
          }`}
        >
          {status === "speaking" && <span className="absolute inset-0 rounded-full border-4 border-primary/40 animate-ping" />}
        </button>

        <p className="text-muted-foreground text-sm font-medium">{label}</p>

        <div className="max-w-xl min-h-[6rem] space-y-3">
          {transcript && status === "listening" && <p className="text-lg">« {transcript} »</p>}
          {reply && status !== "listening" && <p className="text-base text-foreground/80">{cleanForSpeech(reply)}</p>}
        </div>
      </main>

      <footer className="flex justify-center gap-6 pb-10">
        {!active ? (
          <Button size="lg" onClick={start} className="rounded-full h-16 w-16 p-0" aria-label="Démarrer">
            <Mic className="w-7 h-7" />
          </Button>
        ) : (
          <>
            <Button size="lg" variant="secondary" onClick={() => { window.speechSynthesis.cancel(); audioRef.current?.pause(); try { recRef.current?.abort(); } catch {} activeRef.current = false; setActive(false); setStatus("idle"); }} className="rounded-full h-16 w-16 p-0" aria-label="Pause">
              <MicOff className="w-7 h-7" />
            </Button>
            <Button size="lg" variant="destructive" onClick={() => { stopAll(); navigate("/"); }} className="rounded-full h-16 w-16 p-0" aria-label="Terminer">
              <X className="w-7 h-7" />
            </Button>
          </>
        )}
      </footer>
    </div>
  );
}
