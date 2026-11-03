import { useState, useRef, useCallback, useEffect } from "react";
import { Globe, ArrowLeft, ArrowRight, RotateCw, X, ExternalLink, Plus, Star, StarOff, Clock, Search, Home, Trash2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// Sites known to block iframe embedding
// Only sites that strictly refuse iframe embedding via X-Frame-Options / CSP
const BLOCKED_SITES = [
  "accounts.google.com",
  "facebook.com", "instagram.com",
  "twitter.com", "x.com",
  "linkedin.com",
  "discord.com",
  "paypal.com",
  "icloud.com",
];

const DEFAULT_QUICK_LINKS = [
  { name: "Google", url: "https://www.google.com/search?igu=1", icon: "🔍" },
  { name: "YouTube", url: "https://www.youtube.com", icon: "▶️" },
  { name: "Wikipedia", url: "https://www.wikipedia.org", icon: "📚" },
  { name: "ChatGPT", url: "https://chat.openai.com", icon: "🤖" },
  { name: "GitHub", url: "https://github.com", icon: "💻" },
  { name: "Reddit", url: "https://www.reddit.com", icon: "📰" },
  { name: "Amazon", url: "https://www.amazon.com", icon: "🛒" },
  { name: "Stack Overflow", url: "https://stackoverflow.com", icon: "📋" },
  { name: "Netflix", url: "https://www.netflix.com", icon: "🎬" },
  { name: "Spotify", url: "https://open.spotify.com", icon: "🎵" },
  { name: "Twitch", url: "https://www.twitch.tv", icon: "🎮" },
  { name: "TikTok", url: "https://www.tiktok.com", icon: "🎶" },
];

interface QuickLink {
  name: string;
  url: string;
  icon: string;
}

interface Tab {
  id: string;
  url: string;
  displayUrl: string;
  title: string;
  isLoading: boolean;
  error: boolean;
  blocked: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

interface HistoryEntry {
  url: string;
  title: string;
  timestamp: Date;
}

interface Bookmark {
  url: string;
  title: string;
}

let tabIdCounter = 0;
const createTab = (url = ""): Tab => ({
  id: `tab-${++tabIdCounter}`,
  url,
  displayUrl: url,
  title: url ? (() => { try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname; } catch { return "Nouvel onglet"; } })() : "Nouvel onglet",
  isLoading: false,
  error: false,
  blocked: false,
  canGoBack: false,
  canGoForward: false,
});

function isBlockedSite(url: string, adminBlockedDomains: string[]): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const allBlocked = [...BLOCKED_SITES, ...adminBlockedDomains];
    return allBlocked.some(blocked => hostname.includes(blocked));
  } catch {
    return false;
  }
}

interface BrowserPanelProps {
  initialUrl?: string;
  onClose: () => void;
}

export function BrowserPanel({ initialUrl = "", onClose }: BrowserPanelProps) {
  const [tabs, setTabs] = useState<Tab[]>([createTab(initialUrl)]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try {
      const saved = localStorage.getItem("browser-bookmarks");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [adminBlockedDomains, setAdminBlockedDomains] = useState<string[]>([]);
  const [customLinks, setCustomLinks] = useState<QuickLink[]>(() => {
    try {
      const saved = localStorage.getItem("browser-custom-links");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Load admin-blocked sites on mount
  useEffect(() => {
    const loadBlockedSites = async () => {
      const { data } = await supabase.from("blocked_sites").select("domain");
      if (data) setAdminBlockedDomains(data.map((d: any) => d.domain));
    };
    loadBlockedSites();
  }, []);

  useEffect(() => {
    localStorage.setItem("browser-bookmarks", JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem("browser-custom-links", JSON.stringify(customLinks));
  }, [customLinks]);

  const formatUrl = (input: string) => {
    let formatted = input.trim();
    if (!formatted) return "";
    // Already a full URL
    if (formatted.startsWith("http://") || formatted.startsWith("https://")) {
      return formatted;
    }
    // Looks like a domain (contains a dot, no spaces)
    if (formatted.includes(".") && !formatted.includes(" ")) {
      return "https://" + formatted;
    }
    // Otherwise treat as search query
    return `https://www.google.com/search?igu=1&q=${encodeURIComponent(formatted)}`;
  };

  const updateTab = useCallback((id: string, updates: Partial<Tab>) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const navigate = (tabId: string, targetUrl?: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    const finalUrl = formatUrl(targetUrl || tab.displayUrl);
    if (!finalUrl) return;

    const blocked = isBlockedSite(finalUrl, adminBlockedDomains);
    let title = "Chargement...";
    try { title = new URL(finalUrl).hostname; } catch {}

    // Save to DB history
    const saveHistory = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await supabase.from("browser_history").insert({
          user_id: userData.user.id,
          user_email: userData.user.email || null,
          url: finalUrl,
          title,
        });
      }
    };
    saveHistory();

    if (blocked) {
      updateTab(tabId, { url: finalUrl, displayUrl: finalUrl, isLoading: false, error: false, blocked: true, title });
      setHistory(prev => [{ url: finalUrl, title, timestamp: new Date() }, ...prev.slice(0, 99)]);
      return;
    }

    updateTab(tabId, { url: finalUrl, displayUrl: finalUrl, isLoading: true, error: false, blocked: false, title });
    setHistory(prev => [{ url: finalUrl, title, timestamp: new Date() }, ...prev.slice(0, 99)]);

    // Set a timeout to detect if iframe fails to load (some sites don't trigger onerror)
    setTimeout(() => {
      setTabs(prev => prev.map(t => {
        if (t.id === tabId && t.isLoading && t.url === finalUrl) {
          return { ...t, isLoading: false };
        }
        return t;
      }));
    }, 10000);
  };

  const addTab = () => {
    const newTab = createTab();
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const closeTab = (id: string) => {
    if (tabs.length === 1) {
      onClose();
      return;
    }
    const idx = tabs.findIndex(t => t.id === id);
    const newTabs = tabs.filter(t => t.id !== id);
    if (activeTabId === id) {
      setActiveTabId(newTabs[Math.min(idx, newTabs.length - 1)].id);
    }
    setTabs(newTabs);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") navigate(activeTabId);
  };

  const toggleBookmark = () => {
    if (!activeTab.url) return;
    const exists = bookmarks.some(b => b.url === activeTab.url);
    if (exists) {
      setBookmarks(prev => prev.filter(b => b.url !== activeTab.url));
    } else {
      setBookmarks(prev => [...prev, { url: activeTab.url, title: activeTab.title }]);
    }
  };

  const isBookmarked = activeTab.url ? bookmarks.some(b => b.url === activeTab.url) : false;

  const goHome = () => {
    updateTab(activeTabId, { url: "", displayUrl: "", title: "Nouvel onglet", isLoading: false, error: false, blocked: false });
  };

  const addCustomLink = () => {
    if (!newLinkName.trim() || !newLinkUrl.trim()) return;
    const url = newLinkUrl.startsWith("http") ? newLinkUrl : `https://${newLinkUrl}`;
    let icon = "🌐";
    try { icon = new URL(url).hostname.charAt(0).toUpperCase(); } catch {}
    setCustomLinks(prev => [...prev, { name: newLinkName.trim(), url, icon }]);
    setNewLinkName("");
    setNewLinkUrl("");
    setShowAddLink(false);
  };

  const removeCustomLink = (idx: number) => {
    setCustomLinks(prev => prev.filter((_, i) => i !== idx));
  };

  const allQuickLinks = [...DEFAULT_QUICK_LINKS, ...customLinks];

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    navigate(activeTabId, searchQuery);
    setSearchQuery("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-200">
      {/* Tab bar */}
      <div className="flex items-center bg-muted/70 border-b px-1 pt-1 gap-0.5 overflow-x-auto min-h-[36px] scrollbar-none">
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={cn(
              "group flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs cursor-pointer max-w-[180px] min-w-[100px] transition-colors select-none",
              tab.id === activeTabId
                ? "bg-background border border-b-0 border-border text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {tab.blocked ? (
              <span className="text-[10px] shrink-0">🚫</span>
            ) : (
              <Globe className="w-3 h-3 shrink-0" />
            )}
            <span className="truncate flex-1">{tab.title}</span>
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              className="opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20 rounded p-0.5 transition-opacity shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button
          onClick={addTab}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="Nouvel onglet"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Browser toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b bg-muted/50">
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose} title="Fermer">
          <X className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => iframeRefs.current[activeTabId]?.contentWindow?.history.back()} title="Précédent">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => iframeRefs.current[activeTabId]?.contentWindow?.history.forward()} title="Suivant">
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(activeTabId, activeTab.url)} title="Actualiser">
            <RotateCw className={cn("w-3.5 h-3.5", activeTab.isLoading && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goHome} title="Accueil">
            <Home className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex-1 flex items-center gap-2 bg-background rounded-full border px-3 py-1">
          {activeTab.blocked ? (
            <span className="text-xs">🚫</span>
          ) : activeTab.url ? (
            <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          ) : (
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          )}
          <Input
            value={activeTab.displayUrl}
            onChange={(e) => updateTab(activeTabId, { displayUrl: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher ou entrer une URL..."
            className="border-0 h-7 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm"
          />
        </div>

        <Button size="sm" onClick={() => navigate(activeTabId)} className="shrink-0 h-7 text-xs px-3">
          Aller
        </Button>

        {/* Bookmark */}
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={toggleBookmark} title={isBookmarked ? "Retirer des favoris" : "Ajouter aux favoris"}>
          {isBookmarked ? <Star className="w-3.5 h-3.5 text-primary fill-primary" /> : <StarOff className="w-3.5 h-3.5" />}
        </Button>

        {/* Bookmarks dropdown */}
        {bookmarks.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Favoris">
                <Star className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-popover z-[60]">
              <DropdownMenuLabel className="text-xs">Favoris</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {bookmarks.map((b, i) => (
                <DropdownMenuItem key={i} onClick={() => navigate(activeTabId, b.url)} className="text-xs gap-2 cursor-pointer">
                  <Globe className="w-3 h-3 shrink-0" />
                  <span className="truncate">{b.title || b.url}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* History dropdown */}
        {history.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Historique">
                <Clock className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto bg-popover z-[60]">
              <DropdownMenuLabel className="text-xs">Historique récent</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {history.slice(0, 20).map((h, i) => (
                <DropdownMenuItem key={i} onClick={() => navigate(activeTabId, h.url)} className="text-xs gap-2 cursor-pointer">
                  <Globe className="w-3 h-3 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{h.title}</p>
                    <p className="truncate text-muted-foreground text-[10px]">{h.url}</p>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* External link */}
        {activeTab.url && (
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild title="Ouvrir dans le navigateur">
            <a href={activeTab.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Button>
        )}
      </div>

      {/* Bookmarks bar */}
      {bookmarks.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-1 border-b bg-muted/30 overflow-x-auto scrollbar-none">
          {bookmarks.map((b, i) => (
            <button
              key={i}
              onClick={() => navigate(activeTabId, b.url)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap shrink-0"
            >
              <Globe className="w-3 h-3" />
              {b.title || b.url}
            </button>
          ))}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 relative">
        {tabs.map(tab => (
          <div key={tab.id} className={cn("absolute inset-0", tab.id !== activeTabId && "hidden")}>
            {!tab.url ? (
              /* Home page */
              <div className="flex flex-col items-center justify-center h-full px-4 gap-6 max-w-2xl mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Globe className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Navigateur intégré</h2>

                {/* Search bar on home */}
                <div className="w-full max-w-md flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-muted rounded-full border px-4 py-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="Rechercher sur le web..."
                      className="flex-1 bg-transparent outline-none text-sm"
                    />
                  </div>
                  <Button onClick={handleSearch} size="sm">Rechercher</Button>
                </div>

                {/* Quick links */}
                <div className="w-full max-w-lg mx-auto">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <p className="text-xs text-muted-foreground">Accès rapide</p>
                    <button
                      onClick={() => setShowAddLink(!showAddLink)}
                      className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Ajouter
                    </button>
                  </div>

                  {showAddLink && (
                    <div className="flex gap-2 mb-3 px-1">
                      <input
                        value={newLinkName}
                        onChange={(e) => setNewLinkName(e.target.value)}
                        placeholder="Nom"
                        className="flex-1 bg-muted rounded-lg border px-3 py-1.5 text-xs outline-none focus:ring-1 ring-primary"
                      />
                      <input
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        placeholder="URL (ex: example.com)"
                        onKeyDown={(e) => e.key === "Enter" && addCustomLink()}
                        className="flex-1 bg-muted rounded-lg border px-3 py-1.5 text-xs outline-none focus:ring-1 ring-primary"
                      />
                      <Button size="sm" onClick={addCustomLink} className="h-7 text-xs">OK</Button>
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-3">
                    {allQuickLinks.map((link, idx) => (
                      <button
                        key={`${link.name}-${idx}`}
                        onClick={() => navigate(tab.id, link.url)}
                        className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-muted group-hover:bg-background flex items-center justify-center text-lg transition-colors">
                          {link.icon}
                        </div>
                        <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-full">
                          {link.name}
                        </span>
                        {idx >= DEFAULT_QUICK_LINKS.length && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeCustomLink(idx - DEFAULT_QUICK_LINKS.length); }}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 rounded bg-destructive/10 hover:bg-destructive/20 transition-all"
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </button>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center max-w-sm">
                  Certains sites bloquent l'intégration — ils s'ouvriront dans un nouvel onglet du navigateur.
                </p>
              </div>
            ) : tab.blocked ? (
              /* Blocked site */
              <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-4">
                <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center text-2xl">
                  🚫
                </div>
                <h3 className="text-lg font-semibold">Site non disponible en intégré</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  <strong>{(() => { try { return new URL(tab.url).hostname; } catch { return tab.url; } })()}</strong> bloque l'affichage intégré pour des raisons de sécurité.
                </p>
                <Button onClick={() => window.open(tab.url, "_blank")} className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Ouvrir dans le navigateur
                </Button>
                <Button variant="ghost" size="sm" onClick={goHome} className="gap-1 text-muted-foreground">
                  <Home className="w-3.5 h-3.5" />
                  Retour à l'accueil
                </Button>
              </div>
            ) : tab.error ? (
              /* Error */
              <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-4">
                <p className="text-muted-foreground">
                  Ce site ne peut pas être affiché dans le navigateur intégré.
                </p>
                <Button onClick={() => window.open(tab.url, "_blank")} variant="outline" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Ouvrir dans le navigateur
                </Button>
                <Button variant="ghost" size="sm" onClick={goHome} className="gap-1 text-muted-foreground">
                  <Home className="w-3.5 h-3.5" />
                  Retour à l'accueil
                </Button>
              </div>
            ) : (
              <iframe
                ref={(el) => { iframeRefs.current[tab.id] = el; }}
                src={tab.url}
                className="w-full h-full border-0"
                onLoad={() => updateTab(tab.id, { isLoading: false })}
                onError={() => updateTab(tab.id, { isLoading: false, error: true })}
                sandbox="allow-same-origin allow-scripts allow-forms"
                title={tab.title}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
