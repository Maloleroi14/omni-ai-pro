
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Monitor, Clock, Users, RefreshCw, Wifi, ArrowLeft, Maximize2, Minimize2, MousePointer, Hand } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

const FAKE_TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
const FAKE_TEST_EMAIL = "lucas.martin@gmail.com";
const FAKE_DISPLAY_NAME = "Lucas M.";

interface ActiveSession {
  id: string;
  user_id: string;
  user_email: string | null;
  current_page: string;
  last_activity_at: string;
  started_at: string;
  is_active: boolean;
  user_agent: string | null;
}

function LiveScreenViewer({ userId, userEmail, onClose }: { userId: string; userEmail: string | null; onClose: () => void }) {
  const eventsRef = useRef<any[]>([]);
  const replayerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const controlChannelRef = useRef<any>(null);
  const rrwebRootRef = useRef<HTMLDivElement | null>(null);
  const [connected, setConnected] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [status, setStatus] = useState<"waiting" | "playing" | "error">("waiting");
  const [controlMode, setControlMode] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 1280, height: 720 });

  // Inject rrweb-player CSS once
  useEffect(() => {
    if (!document.getElementById("rrweb-replayer-css")) {
      const style = document.createElement("style");
      style.id = "rrweb-replayer-css";
      style.textContent = `
        .replayer-wrapper { position: relative !important; }
        .replayer-wrapper > iframe { border: none !important; background: white; }
        .replayer-mouse {
          position: absolute;
          width: 20px;
          height: 20px;
          transition: left 0.05s linear, top 0.05s linear;
          background-size: contain;
          background-repeat: no-repeat;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000'%3E%3Cpath d='M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z'/%3E%3C/svg%3E");
        }
        .replayer-mouse::after { content: none !important; }
        .replayer-mouse-tail { display: none !important; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Subscribe to screen mirror events
  useEffect(() => {
    const channelName = `screen-mirror-${userId}`;
    const channel = supabase.channel(channelName);

    channel
      .on("broadcast", { event: "rrweb-events" }, (msg: any) => {
        const newEvents = msg.payload?.events;
        if (!newEvents?.length) return;

        // Capture viewport size from meta events
        for (const ev of newEvents) {
          if (ev.type === 4 && ev.data?.width && ev.data?.height) {
            setViewportSize({ width: ev.data.width, height: ev.data.height });
          }
        }

        eventsRef.current.push(...newEvents);
        setEventCount(c => c + newEvents.length);

        if (replayerRef.current) {
          for (const ev of newEvents) {
            try {
              replayerRef.current.addEvent(ev);
            } catch (err) {
              // If a full snapshot fails, destroy and recreate replayer
              if (ev.type === 2) {
                console.warn("[Replayer] Crash on full snapshot, reinitializing...");
                try { replayerRef.current.destroy(); } catch {}
                replayerRef.current = null;
                if (rrwebRootRef.current) {
                  rrwebRootRef.current.remove();
                  rrwebRootRef.current = null;
                }
                initReplayer();
                break;
              }
              // Ignore other replay errors (missing nodes etc)
            }
          }
        } else {
          const hasFullSnapshot = eventsRef.current.some((e: any) => e.type === 2);
          if (hasFullSnapshot && containerRef.current) {
            initReplayer();
          }
        }
      })
      .subscribe((s: string) => {
        if (s === "SUBSCRIBED") setConnected(true);
      });

    return () => {
      supabase.removeChannel(channel);
      if (replayerRef.current) {
        try { replayerRef.current.destroy(); } catch {}
        replayerRef.current = null;
      }
    };
  }, [userId]);

  const controlSubscribedRef = useRef(false);

  // Control channel for sending commands to user
  useEffect(() => {
    const controlChannel = supabase.channel(`screen-control-${userId}`, {
      config: { broadcast: { self: false } },
    });
    controlChannel.subscribe((status: string) => {
      controlSubscribedRef.current = status === "SUBSCRIBED";
    });
    controlChannelRef.current = controlChannel;

    return () => {
      controlSubscribedRef.current = false;
      supabase.removeChannel(controlChannel);
      controlChannelRef.current = null;
    };
  }, [userId]);

  const sendControlAction = useCallback((action: any) => {
    if (controlChannelRef.current && controlSubscribedRef.current) {
      controlChannelRef.current.send({
        type: "broadcast",
        event: "remote-action",
        payload: action,
      }).catch(() => {
        console.warn("[RemoteControl] Failed to send action");
      });
    }
  }, []);

  // Handle clicks on the replayer overlay
  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!controlMode || !containerRef.current) return;

    const wrapper = containerRef.current.querySelector(".replayer-wrapper") as HTMLElement;
    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const iframe = wrapper.querySelector("iframe");
    if (!iframe) return;

    const iframeRect = iframe.getBoundingClientRect();
    // Calculate scale factor between displayed size and actual viewport
    const scaleX = viewportSize.width / iframeRect.width;
    const scaleY = viewportSize.height / iframeRect.height;

    const x = (e.clientX - iframeRect.left) * scaleX;
    const y = (e.clientY - iframeRect.top) * scaleY;

    sendControlAction({ type: "click", x: Math.round(x), y: Math.round(y) });
  }, [controlMode, viewportSize, sendControlAction]);

  // Handle scroll on overlay
  const handleOverlayWheel = useCallback((e: WheelEvent) => {
    if (!controlMode) return;
    e.preventDefault();
    sendControlAction({ type: "scroll", deltaX: e.deltaX, deltaY: e.deltaY });
  }, [controlMode, sendControlAction]);

  const initReplayer = async () => {
    if (!containerRef.current || replayerRef.current) return;

    try {
      const rrwebModule = await import("rrweb");
      const Replayer = rrwebModule.Replayer;
      
      // Create a dedicated div for rrweb that React doesn't manage
      const rrwebRoot = document.createElement("div");
      containerRef.current.appendChild(rrwebRoot);
      rrwebRootRef.current = rrwebRoot;
      
      const replayer = new Replayer(eventsRef.current, {
        root: rrwebRoot,
        liveMode: true,
        triggerFocus: false,
        UNSAFE_replayCanvas: false,
        // No insertStyleRules — causes insertBefore crashes on complex DOMs
      });
      replayer.startLive();
      replayerRef.current = replayer;
      setStatus("playing");
    } catch (err) {
      console.error("Failed to init replayer:", err);
      setStatus("error");
    }
  };

  // Cleanup replayer DOM on unmount to avoid React conflicts
  useEffect(() => {
    return () => {
      if (replayerRef.current) {
        try { replayerRef.current.destroy(); } catch {}
        replayerRef.current = null;
      }
      // Clear any rrweb-injected DOM
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  // Attach wheel listener (needs passive: false)
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const handler = (e: WheelEvent) => handleOverlayWheel(e);
    overlay.addEventListener("wheel", handler, { passive: false });
    return () => overlay.removeEventListener("wheel", handler);
  }, [handleOverlayWheel, status, controlMode]);

  return (
    <div className={`space-y-3 ${fullscreen ? "fixed inset-0 z-50 bg-background p-4 overflow-auto" : ""}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{userEmail || "Utilisateur"}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${connected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {connected ? "🟢 Connecté" : "⏳ Connexion..."}
            </span>
            <span>{eventCount} évts</span>
            {status === "playing" && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground">▶ Live</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {status === "playing" && (
            <Button
              variant={controlMode ? "default" : "outline"}
              size="sm"
              onClick={() => setControlMode(c => !c)}
              className="gap-1.5"
            >
              {controlMode ? <Hand className="w-3.5 h-3.5" /> : <MousePointer className="w-3.5 h-3.5" />}
              {controlMode ? "Contrôle actif" : "Prendre le contrôle"}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setFullscreen(f => !f)}>
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {controlMode && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary">
          <Hand className="w-3.5 h-3.5 shrink-0" />
          <span>Mode contrôle actif — Cliquez sur l'écran pour interagir à distance</span>
        </div>
      )}

      <Card className={`overflow-hidden border-2 ${controlMode ? "border-primary bg-muted/30" : "bg-muted/30"}`}>
        {status === "waiting" && (
          <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
            <Eye className="w-12 h-12 mb-3 animate-pulse" />
            <p className="text-sm font-medium">En attente de l'activité de l'utilisateur...</p>
            <p className="text-xs mt-1">L'écran apparaîtra dès que l'utilisateur navigue sur le site</p>
          </div>
        )}
        {status === "error" && (
          <div className="flex flex-col items-center justify-center h-[400px] text-destructive">
            <p className="text-sm font-medium">Erreur lors de l'initialisation du lecteur</p>
          </div>
        )}
        <div className="relative">
          <div
            ref={containerRef}
            className="w-full overflow-auto relative"
            style={{
              minHeight: status === "playing" ? (fullscreen ? "calc(100vh - 150px)" : 400) : 0,
              maxHeight: fullscreen ? "calc(100vh - 150px)" : 600,
              display: status === "playing" ? "block" : "none",
              pointerEvents: controlMode ? "none" : "auto",
            }}
          />
          {/* Transparent overlay OUTSIDE containerRef to avoid interfering with Replayer DOM */}
          {controlMode && status === "playing" && (
            <div
              ref={overlayRef}
              data-control-overlay
              className="absolute inset-0 z-10"
              style={{ cursor: "crosshair", pointerEvents: "auto" }}
              onClick={handleOverlayClick}
            />
          )}
        </div>
      </Card>
    </div>
  );
}

export function AdminLiveUsersSection() {
  const { user } = useAuthContext();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingUser, setViewingUser] = useState<{ userId: string; email: string | null } | null>(null);
  const [testActive, setTestActive] = useState(false);
  

  // Realistic activity simulation for test user
  const FAKE_ACTIONS = [
    { page: "/", label: "Accueil", duration: 8000 },
    { page: "/chat", label: "Chat IA", duration: 15000 },
    { page: "/chat", label: "Chat IA — écriture...", duration: 12000 },
    { page: "/code-editor", label: "Éditeur — création site", duration: 20000 },
    { page: "/code-editor", label: "Éditeur — modification CSS", duration: 10000 },
    { page: "/profile", label: "Mon Profil", duration: 6000 },
    { page: "/", label: "Accueil — parcours modèles", duration: 9000 },
    { page: "/code-editor", label: "Éditeur — nouveau projet", duration: 18000 },
    { page: "/chat", label: "Chat IA — question code", duration: 14000 },
    { page: "/", label: "Accueil — publication site", duration: 7000 },
  ];

  const createFakeSnapshot = useCallback((actionLabel: string) => {
    const ts = Date.now();
    const meta = { type: 4, data: { href: "https://online-omni-ai-pro.lovable.app/", width: 1280, height: 720 }, timestamp: ts };
    const fullSnapshot = {
      type: 2,
      data: {
        node: {
          type: 0, childNodes: [{
            type: 1, name: "html", publicId: "", systemId: "", id: 1
          }, {
            type: 2, tagName: "html", attributes: {}, childNodes: [{
              type: 2, tagName: "head", attributes: {}, childNodes: [{
                type: 2, tagName: "title", attributes: {}, childNodes: [{
                  type: 3, textContent: `${FAKE_DISPLAY_NAME} — Omni AI`, id: 5
                }], id: 4
              }], id: 3
            }, {
              type: 2, tagName: "body", attributes: { style: "margin:0;font-family:system-ui;background:#0f172a;color:white;display:flex;align-items:center;justify-content:center;min-height:100vh" }, childNodes: [{
                type: 2, tagName: "div", attributes: { style: "text-align:center;padding:40px;max-width:600px" }, childNodes: [{
                  type: 2, tagName: "h1", attributes: { style: "font-size:42px;margin-bottom:16px" }, childNodes: [{
                    type: 3, textContent: "🤖 Omni AI", id: 9
                  }], id: 8
                }, {
                  type: 2, tagName: "p", attributes: { style: "font-size:18px;opacity:0.8;margin-bottom:32px", id: "status-text" }, childNodes: [{
                    type: 3, textContent: actionLabel, id: 11
                  }], id: 10
                }, {
                  type: 2, tagName: "div", attributes: { style: "display:flex;gap:16px;justify-content:center;flex-wrap:wrap" }, childNodes: [{
                    type: 2, tagName: "div", attributes: { style: "background:#1e293b;border-radius:12px;padding:20px 28px;min-width:120px" }, childNodes: [{
                      type: 3, textContent: "💬 Chat", id: 14
                    }], id: 13
                  }, {
                    type: 2, tagName: "div", attributes: { style: "background:#1e293b;border-radius:12px;padding:20px 28px;min-width:120px" }, childNodes: [{
                      type: 3, textContent: `⚡ ${Math.floor(Math.random() * 30 + 5)} crédits`, id: 16
                    }], id: 15
                  }, {
                    type: 2, tagName: "div", attributes: { style: "background:#1e293b;border-radius:12px;padding:20px 28px;min-width:120px" }, childNodes: [{
                      type: 3, textContent: `🕐 ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`, id: 18
                    }], id: 17
                  }], id: 12
                }], id: 7
              }], id: 6
            }], id: 2
          }], id: 0
        },
        initialOffset: { top: 0, left: 0 },
      },
      timestamp: ts + 1,
    };
    return [meta, fullSnapshot];
  }, []);

  // Auto-start test user on mount
  useEffect(() => {
    let cancelled = false;
    let actionInterval: ReturnType<typeof setTimeout>;
    let heartbeatInterval: ReturnType<typeof setInterval>;
    let channel: any;
    let actionIdx = Math.floor(Math.random() * FAKE_ACTIONS.length);

    const start = async () => {
      // Upsert fake session
      await supabase.from("active_user_sessions").delete().eq("user_id", FAKE_TEST_USER_ID);
      await supabase.from("active_user_sessions").insert({
        user_id: FAKE_TEST_USER_ID,
        user_email: FAKE_TEST_EMAIL,
        current_page: "/",
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0",
        is_active: true,
      } as any);

      channel = supabase.channel(`screen-mirror-${FAKE_TEST_USER_ID}`, {
        config: { broadcast: { self: false } },
      });
      await channel.subscribe();

      // Send initial snapshot
      const action = FAKE_ACTIONS[actionIdx];
      const snap = createFakeSnapshot(action.label);
      channel.send({ type: "broadcast", event: "rrweb-events", payload: { events: snap } });

      // Simulate action cycle
      const nextAction = () => {
        if (cancelled) return;
        actionIdx = (actionIdx + 1) % FAKE_ACTIONS.length;
        const act = FAKE_ACTIONS[actionIdx];

        // Text mutation
        const textEvent = {
          type: 3,
          data: {
            source: 0,
            texts: [{ id: 11, value: `${act.label} — ${new Date().toLocaleTimeString("fr-FR")}` }],
            attributes: [],
            removes: [],
            adds: [],
          },
          timestamp: Date.now(),
        };
        channel.send({ type: "broadcast", event: "rrweb-events", payload: { events: [textEvent] } });

        // Update session
        supabase.from("active_user_sessions")
          .update({ current_page: act.page, last_activity_at: new Date().toISOString() } as any)
          .eq("user_id", FAKE_TEST_USER_ID)
          .then(() => {});

        // Fresh snapshot every 3 actions
        if (actionIdx % 3 === 0) {
          const snap = createFakeSnapshot(act.label);
          channel.send({ type: "broadcast", event: "rrweb-events", payload: { events: snap } });
        }

        // Random jitter for realism (between 60% and 140% of base duration)
        const jitter = act.duration * (0.6 + Math.random() * 0.8);
        actionInterval = setTimeout(nextAction, jitter);
      };

      actionInterval = setTimeout(nextAction, FAKE_ACTIONS[actionIdx].duration);

      // Heartbeat to keep session alive
      heartbeatInterval = setInterval(async () => {
        if (cancelled) return;
        await supabase.from("active_user_sessions")
          .update({ last_activity_at: new Date().toISOString() } as any)
          .eq("user_id", FAKE_TEST_USER_ID);
      }, 20000);
    };

    start();
    setTestActive(true);

    return () => {
      cancelled = true;
      clearTimeout(actionInterval);
      clearInterval(heartbeatInterval);
      if (channel) supabase.removeChannel(channel);
      // Don't delete the session on unmount so it stays visible briefly
    };
  }, [createFakeSnapshot]);

  const fetchSessions = async () => {
    setLoading(true);
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("active_user_sessions")
      .select("*")
      .eq("is_active", true)
      .gte("last_activity_at", fiveMinAgo)
      .order("last_activity_at", { ascending: false });
    if (data) setSessions(data as ActiveSession[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();

    const channel = supabase
      .channel("live-users-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "active_user_sessions" }, () => {
        fetchSessions();
      })
      .subscribe();

    const interval = setInterval(fetchSessions, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const getStatus = (lastActivity: string) => {
    const diff = Date.now() - new Date(lastActivity).getTime();
    if (diff < 60000) return { label: "En ligne", color: "bg-green-500", textColor: "text-green-700" };
    if (diff < 180000) return { label: "Inactif", color: "bg-yellow-500", textColor: "text-yellow-700" };
    return { label: "Absent", color: "bg-red-500", textColor: "text-red-700" };
  };

  const getDuration = (started: string) => {
    const diff = Date.now() - new Date(started).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "< 1min";
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h${mins % 60}min`;
  };

  const getDeviceFromUA = (ua: string | null) => {
    if (!ua) return "Inconnu";
    if (/mobile/i.test(ua)) return "📱 Mobile";
    if (/tablet/i.test(ua)) return "📱 Tablette";
    return "💻 Desktop";
  };

  const getPageLabel = (page: string) => {
    const labels: Record<string, string> = {
      "/": "Accueil",
      "/chat": "Chat IA",
      "/auth": "Connexion",
      "/profile": "Profil",
      "/code-editor": "Éditeur",
      "/build": "Builder",
    };
    if (page.startsWith("/admin")) return "🔧 Admin" + page.replace("/admin", "");
    return labels[page] || page;
  };

  const onlineCount = sessions.filter(s => {
    const diff = Date.now() - new Date(s.last_activity_at).getTime();
    return diff < 60000;
  }).length;

  if (viewingUser) {
    return (
      <LiveScreenViewer
        userId={viewingUser.userId}
        userEmail={viewingUser.email}
        onClose={() => setViewingUser(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <Eye className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Utilisateurs en direct</h2>
          <p className="text-sm text-muted-foreground">Cliquez sur un utilisateur pour voir son écran en temps réel</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Wifi className="w-3 h-3 text-green-500" />
            {onlineCount} actif{onlineCount > 1 ? "s" : ""}
          </Badge>
          <Badge variant="secondary">{sessions.length} session{sessions.length > 1 ? "s" : ""}</Badge>
          {testActive && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Monitor className="w-3 h-3" /> Utilisateur simulé actif
            </Badge>
          )}
          <Button variant="ghost" size="icon" onClick={fetchSessions} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-lg font-semibold mb-1">Aucun utilisateur connecté</h3>
          <p className="text-sm text-muted-foreground">Les sessions actives apparaîtront ici en temps réel</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sessions.map((s) => {
            const status = getStatus(s.last_activity_at);
            return (
              <Card
                key={s.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer hover:ring-2 hover:ring-primary/30"
                onClick={() => setViewingUser({ userId: s.user_id, email: s.user_email })}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                      {(s.user_email || "?")[0].toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${status.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{s.user_email || "Utilisateur anonyme"}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        {getPageLabel(s.current_page)}
                      </span>
                      <span>{getDeviceFromUA(s.user_agent)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <Badge variant="outline" className={`text-xs ${status.textColor}`}>
                        {status.label}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 justify-end">
                        <Clock className="w-3 h-3" />
                        {getDuration(s.started_at)}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={(e) => { e.stopPropagation(); setViewingUser({ userId: s.user_id, email: s.user_email }); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
