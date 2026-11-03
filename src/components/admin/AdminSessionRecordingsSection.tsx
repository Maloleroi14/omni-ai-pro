import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Play, Clock, RefreshCw, Trash2, Eye, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, formatDistanceToNow, startOfDay, endOfDay, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface SessionRecording {
  id: string;
  user_id: string;
  user_email: string | null;
  session_id: string;
  events: any[];
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
  page_url: string | null;
  user_agent: string | null;
}

export function AdminSessionRecordingsSection() {
  const [recordings, setRecordings] = useState<SessionRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState<SessionRecording | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "ended">("all");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [exporting, setExporting] = useState<string | null>(null);
  const replayContainerRef = useRef<HTMLDivElement>(null);
  const replayerRef = useRef<any>(null);

  const loadEvents = async (id: string): Promise<any[]> => {
    const { data, error } = await supabase.from("session_recordings").select("events").eq("id", id).maybeSingle();
    if (error) { toast.error("Impossible de charger l'enregistrement"); return []; }
    return Array.isArray((data as any)?.events) ? (data as any).events : [];
  };

  const fetchRecordings = async (silent = false) => {
    if (!silent) setLoading(true);
    let query = supabase
      .from("session_recordings")
      .select("id,user_id,user_email,session_id,started_at,ended_at,is_active,page_url,user_agent")
      .order("started_at", { ascending: false })
      .limit(50);

    if (filter === "active") query = query.eq("is_active", true);
    if (filter === "ended") query = query.eq("is_active", false);
    if (dateRange.from) query = query.gte("started_at", startOfDay(dateRange.from).toISOString());
    if (dateRange.to) query = query.lte("started_at", endOfDay(dateRange.to).toISOString());

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching recordings:", error);
      toast.error("Erreur de chargement");
    } else {
      setRecordings(((data as any[]) || []).map((r) => ({ ...r, events: [] })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecordings();
    const interval = setInterval(() => fetchRecordings(true), 30000);
    return () => clearInterval(interval);
  }, [filter, dateRange]);

  const filteredRecordings = recordings.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.user_email?.toLowerCase().includes(s) ||
      r.session_id.toLowerCase().includes(s) ||
      r.user_id.toLowerCase().includes(s)
    );
  });

  const deleteRecording = async (id: string) => {
    const { error } = await supabase.from("session_recordings").delete().eq("id", id);
    if (!error) {
      setRecordings((prev) => prev.filter((r) => r.id !== id));
      if (selectedRecording?.id === id) setSelectedRecording(null);
      toast.success("Enregistrement supprimé");
    }
  };

  const exportToVideo = async (recording: SessionRecording) => {
    setExporting(recording.id);
    try {
      const events = await loadEvents(recording.id);
      if (events.length < 2) {
        toast.error("Pas assez d'événements pour exporter");
        setExporting(null);
        return;
      }

      // Create an offscreen container for replay
      const offscreen = document.createElement("div");
      offscreen.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1280px;height:720px;";
      document.body.appendChild(offscreen);

      const rrwebPlayerModule = await import("rrweb-player");
      const RRWebPlayer = rrwebPlayerModule.default;

      const player = new (RRWebPlayer as any)({
        target: offscreen,
        props: { events, width: 1280, height: 720, autoPlay: false, showController: false, speed: 1 },
      });

      // Use canvas recording via MediaRecorder
      const iframe = offscreen.querySelector("iframe");
      if (!iframe) {
        toast.error("Impossible de capturer la session");
        document.body.removeChild(offscreen);
        setExporting(null);
        return;
      }

      // Wait for iframe load
      await new Promise(r => setTimeout(r, 500));

      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d")!;
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const totalTime = events[events.length - 1].timestamp - events[0].timestamp;
      const maxDuration = Math.min(totalTime, 120000); // Cap at 2 min

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `session-${recording.user_email || recording.session_id.slice(0, 8)}-${format(new Date(recording.started_at), "yyyy-MM-dd")}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(offscreen);
        setExporting(null);
        toast.success("Vidéo exportée !");
      };

      mediaRecorder.start();
      player.play();

      // Capture frames
      const captureFrame = () => {
        try {
          ctx.drawImage(iframe as unknown as CanvasImageSource, 0, 0, 1280, 720);
        } catch { /* cross-origin, draw blank */ }
      };
      const frameInterval = setInterval(captureFrame, 33); // ~30fps

      setTimeout(() => {
        clearInterval(frameInterval);
        mediaRecorder.stop();
        player.pause();
      }, Math.min(maxDuration, totalTime) + 500);

    } catch (err) {
      console.error("Export error:", err);
      toast.error("Erreur d'export vidéo");
      setExporting(null);
    }
  };

  const playRecording = async (recording: SessionRecording) => {
    setSelectedRecording(recording);
    setTimeout(async () => {
      if (!replayContainerRef.current) return;
      replayContainerRef.current.innerHTML = "";
      const events = await loadEvents(recording.id);
      if (!replayContainerRef.current) return;
      if (events.length < 2) {
        replayContainerRef.current.innerHTML = `<div class="flex items-center justify-center h-full text-muted-foreground text-sm">Pas assez d'événements pour rejouer cette session</div>`;
        return;
      }
      try {
        const rrwebPlayerModule = await import("rrweb-player");
        const RRWebPlayer = rrwebPlayerModule.default;
        replayerRef.current = new (RRWebPlayer as any)({
          target: replayContainerRef.current,
          props: { events, width: replayContainerRef.current.clientWidth, height: 500, autoPlay: true, showController: true, speed: 1 },
        });
      } catch (err) {
        console.error("Replay error:", err);
        replayContainerRef.current.innerHTML = `<div class="flex items-center justify-center h-full text-destructive text-sm">Erreur de lecture du replay</div>`;
      }
    }, 100);
  };

  const getDeviceIcon = (ua: string | null) => {
    if (!ua) return "💻";
    const lower = ua.toLowerCase();
    if (lower.includes("mobile") || lower.includes("android") || lower.includes("iphone")) return "📱";
    if (lower.includes("tablet") || lower.includes("ipad")) return "📱";
    return "💻";
  };

  const getDuration = (started: string, ended: string | null) => {
    const start = new Date(started).getTime();
    const end = ended ? new Date(ended).getTime() : Date.now();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}min ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}min`;
  };

  const datePresets = [
    { label: "Aujourd'hui", fn: () => setDateRange({ from: new Date(), to: new Date() }) },
    { label: "7 derniers jours", fn: () => setDateRange({ from: subDays(new Date(), 7), to: new Date() }) },
    { label: "30 derniers jours", fn: () => setDateRange({ from: subDays(new Date(), 30), to: new Date() }) },
    { label: "Tout", fn: () => setDateRange({ from: undefined, to: undefined }) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Enregistrements de sessions</h2>
          <p className="text-sm text-muted-foreground">
            Visualisez ce que chaque utilisateur fait sur le site en temps réel
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchRecordings()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Rechercher par email, ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-border bg-background text-sm"
        />
        <div className="flex gap-1">
          {(["all", "active", "ended"] as const).map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {f === "all" ? "Toutes" : f === "active" ? "🟢 Actives" : "⏹️ Terminées"}
            </Button>
          ))}
        </div>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        {datePresets.map((p) => (
          <Button key={p.label} variant="outline" size="sm" className="text-xs h-7" onClick={p.fn}>
            {p.label}
          </Button>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
              <Calendar className="w-3 h-3" />
              {dateRange.from
                ? `${format(dateRange.from, "dd/MM")}${dateRange.to ? ` → ${format(dateRange.to, "dd/MM")}` : ""}`
                : "Période personnalisée"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="range"
              selected={dateRange.from && dateRange.to ? { from: dateRange.from, to: dateRange.to } : undefined}
              onSelect={(range: any) => setDateRange({ from: range?.from, to: range?.to })}
              numberOfMonths={1}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        {dateRange.from && (
          <span className="text-xs text-muted-foreground">
            Filtre : {format(dateRange.from, "dd MMM yyyy", { locale: fr })}
            {dateRange.to && ` → ${format(dateRange.to, "dd MMM yyyy", { locale: fr })}`}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border border-border bg-card">
          <div className="text-2xl font-bold">{recordings.length}</div>
          <div className="text-xs text-muted-foreground">Total sessions</div>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card">
          <div className="text-2xl font-bold text-green-500">
            {recordings.filter((r) => r.is_active).length}
          </div>
          <div className="text-xs text-muted-foreground">Actives maintenant</div>
        </div>
        <div className="p-3 rounded-xl border border-border bg-card">
          <div className="text-2xl font-bold">
            {new Set(recordings.map((r) => r.user_id)).size}
          </div>
          <div className="text-xs text-muted-foreground">Utilisateurs uniques</div>
        </div>
      </div>

      {/* Replay player */}
      {selectedRecording && (
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                Replay : {selectedRecording.user_email || "Anonyme"}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(selectedRecording.started_at), "dd/MM/yyyy HH:mm", { locale: fr })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={exporting === selectedRecording.id}
                onClick={() => exportToVideo(selectedRecording)}
              >
                {exporting === selectedRecording.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                Exporter vidéo
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedRecording(null)}>
                Fermer
              </Button>
            </div>
          </div>
          <div ref={replayContainerRef} className="w-full bg-black/5" style={{ minHeight: 500 }} />
        </div>
      )}

      {/* Recordings list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredRecordings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Aucun enregistrement trouvé
        </div>
      ) : (
        <div className="space-y-2">
          {filteredRecordings.map((rec) => (
            <div
              key={rec.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                selectedRecording?.id === rec.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
              onClick={() => playRecording(rec)}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                  {getDeviceIcon(rec.user_agent)}
                </div>
                {rec.is_active && (
                  <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {rec.user_email || "Utilisateur anonyme"}
                  </span>
                  {rec.is_active && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">
                      EN DIRECT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getDuration(rec.started_at, rec.ended_at)}
                  </span>
                  <span>
                    {formatDistanceToNow(new Date(rec.started_at), { addSuffix: true, locale: fr })}
                  </span>
                  {rec.page_url && (
                    <span className="truncate max-w-[150px]">{rec.page_url}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8"
                  onClick={(e) => { e.stopPropagation(); exportToVideo(rec); }}
                  disabled={exporting === rec.id}
                >
                  {exporting === rec.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"
                  onClick={(e) => { e.stopPropagation(); playRecording(rec); }}
                >
                  <Play className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); deleteRecording(rec.id); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
