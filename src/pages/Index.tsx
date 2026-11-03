import { useRef, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import confetti from "canvas-confetti";
import { useChat } from "@/hooks/useChat";
import { useGroupChat } from "@/hooks/useGroupChat";
import { supabase } from "@/integrations/supabase/client";
import { useCustomization } from "@/hooks/useCustomization";
import { useAuthContext } from "@/contexts/AuthContext";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { PersonaSelector } from "@/components/PersonaSelector";
import { PinnedMessages } from "@/components/PinnedMessages";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { GroupChatPanel } from "@/components/GroupChatPanel";
import { CustomizationPanel } from "@/components/CustomizationPanel";
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PreviewPanel } from "@/components/PreviewPanel";
import { TypingIndicator } from "@/components/TypingIndicator";
import { ScrollToBottomButton } from "@/components/ScrollToBottomButton";
import { ChatSkeleton } from "@/components/ChatSkeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Sparkles, Menu, X, Zap, Globe, Image, Brain, Code, LogIn, MessageCircle, FileText } from "lucide-react";
import { BrowserPanel } from "@/components/BrowserPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { getGuestMessagesLeft, GUEST_MAX_MESSAGES } from "@/hooks/useGuestLimits";
import { TermsDialog } from "@/components/TermsDialog";
import { UserAdsDisplay } from "@/components/UserAdsDisplay";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { SupportTicketDialog } from "@/components/SupportTicketDialog";
import { SearchCommandDialog } from "@/components/SearchCommandDialog";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { ConversationFavorites } from "@/components/ConversationFavorites";
import { ShareConversationButton } from "@/components/ShareConversationButton";
import { ConversationExport } from "@/components/ConversationExport";
import { WordCounter } from "@/components/WordCounter";
import { MessageTemplates } from "@/components/MessageTemplates";
import { VPWelcomeDialog } from "@/components/VPWelcomeDialog";
import { useActiveEventContext } from "@/App";
import { useWakeLock } from "@/hooks/useWakeLock";

const Index = () => {
  const { user, credits, useCredits: deductCredits, isAdmin, isCoCreator, isVicePresident } = useAuthContext();
  const { t } = useLanguage();
  const activeEvent = useActiveEventContext();
  
  const { 
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
  } = useChat({ useCredits: deductCredits });
  
  const {
    groupChats,
    currentGroupId,
    messages: groupMessages,
    isLoading: isGroupLoading,
    loadGroupChats,
    loadGroupMessages,
    sendGroupMessage,
    deleteMessage: deleteGroupMessage,
    closeGroupChat,
  } = useGroupChat();
  
  // Keep screen awake while AI is streaming
  useWakeLock(isLoading);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserUrl, setBrowserUrl] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Auto-send message from landing page ?q= param
  const initialQuerySent = useRef(false);
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !initialQuerySent.current) {
      initialQuerySent.current = true;
      setSearchParams({}, { replace: true });
      setTimeout(() => {
        sendMessage(q);
      }, 300);
    }
    // Auto-load conversation from ?conv= param
    const convId = searchParams.get("conv");
    if (convId && !initialQuerySent.current) {
      initialQuerySent.current = true;
      setSearchParams({}, { replace: true });
      setTimeout(() => {
        loadConversation(convId);
      }, 300);
    }
  }, [searchParams, sendMessage, setSearchParams, loadConversation]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewConversation: () => { newConversation(); closeGroupChat(); },
    onToggleSidebar: () => setSidebarOpen(prev => !prev),
    onSearch: () => setSearchOpen(true),
  });

  // Confetti milestones
  const confettiTriggered = useRef<Set<number>>(new Set());
  useEffect(() => {
    const milestones = [10, 25, 50, 100, 200, 500];
    const count = messages.length;
    for (const m of milestones) {
      if (count >= m && !confettiTriggered.current.has(m)) {
        confettiTriggered.current.add(m);
        confetti({
          particleCount: 80 + m,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#7c3aed', '#a855f7', '#ec4899', '#f59e0b', '#06b6d4'],
        });
      }
    }
  }, [messages.length]);

  const connectionLoggedRef = useRef(false);
  useEffect(() => {
    if (user && !connectionLoggedRef.current) {
      connectionLoggedRef.current = true;
      const ua = navigator.userAgent;
      const deviceType = /mobile/i.test(ua) ? "mobile" : /tablet/i.test(ua) ? "tablet" : "desktop";
      supabase.from("connection_logs").insert({
        user_id: user.id,
        user_email: user.email,
        user_agent: ua,
        device_type: deviceType,
      } as any).then(() => {});
    }
  }, [user]);

  const customization = useCustomization(user?.id);
  const [sitePresentation, setSitePresentation] = useState({
    title: "OmniAI Pro",
    subtitle: "IA ultra-puissante",
    description: "L'une des IA les plus avancées au monde. Propulsée par Gemini 2.5 Pro avec recherche web et génération d'images.",
    welcome_message: "Bienvenue sur OmniAI Pro !",
    show_features: true
  });

  // Force scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    const scrollElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollElement) {
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, []);

  // Scroll to bottom when messages change or conversation loads
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        scrollToBottom();
        setTimeout(scrollToBottom, 100);
      });
    }
  }, [messages, currentConversationId, scrollToBottom]);

  // Track scroll position for scroll-to-bottom button + progress bar
  useEffect(() => {
    const scrollElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      setShowScrollButton(!isNearBottom && messages.length > 0);
      
      // Scroll progress
      const total = scrollHeight - clientHeight;
      setScrollProgress(total > 0 ? (scrollTop / total) * 100 : 0);
    };

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

  // Load site presentation settings
  useEffect(() => {
    const loadPresentation = async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "site_presentation")
        .single();
      
      if (data?.setting_value) {
        setSitePresentation(prev => ({ ...prev, ...data.setting_value as object }));
      }
    };
    loadPresentation();
  }, []);

  const CREATOR_EMAIL = "omniaiproultime@gmail.com";
  const isCreator = user?.email === CREATOR_EMAIL;

  // Load group chats when user/admin status changes
  useEffect(() => {
    if (user) {
      loadGroupChats(isAdmin, isCoCreator, isVicePresident, isCreator);
    }
  }, [user, isAdmin, isCoCreator, isVicePresident, isCreator, loadGroupChats]);

  const features = [
    { icon: Brain, label: t("feature.model"), desc: t("feature.model_desc") },
    { icon: Globe, label: t("feature.web"), desc: t("feature.web_desc") },
    { icon: Image, label: t("feature.image"), desc: t("feature.image_desc") },
    { icon: Code, label: t("feature.code"), desc: t("feature.code_desc") },
    { icon: Zap, label: t("feature.memory"), desc: t("feature.memory_desc") },
  ];

  // Wrap sendMessage with success animation
  const handleSend = useCallback((msg: string, file?: any) => {
    sendMessage(msg, file);
    setSendSuccess(true);
    setTimeout(() => setSendSuccess(false), 400);
  }, [sendMessage]);

  const layoutClasses = {
    default: "max-w-4xl",
    compact: "max-w-2xl",
    wide: "max-w-6xl",
  };

  // Date separator helper
  const getDateLabel = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    if (isToday) return "Aujourd'hui";
    if (isYesterday) return "Hier";
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  };

  // If a group chat is open, render only the group chat fullscreen
  if (currentGroupId) {
    return (
      <div className="h-screen w-screen">
        <GroupChatPanel
          title={groupChats.find(g => g.id === currentGroupId)?.title || "Groupe"}
          messages={groupMessages}
          currentUserId={user?.id || null}
          currentUserEmail={user?.email || null}
          onSend={(content) => sendGroupMessage(content, user?.id || "", user?.email || "")}
          onDelete={(messageId) => deleteGroupMessage(messageId, user?.id || "", user?.email === "omniaiproultime@gmail.com")}
          onClose={closeGroupChat}
          isLoading={isGroupLoading}
        />
      </div>
    );
  }

  return (
    <div className={cn(
      "flex h-screen bg-gradient-to-br from-background via-background to-muted/30 grain-overlay",
      customization.layout === "compact" && "text-sm"
    )}>
      {/* Sidebar */}
      {sidebarOpen && (
        <ConversationSidebar
          conversations={conversations}
          currentId={currentConversationId}
          onSelect={(id) => {
            loadConversation(id);
            closeGroupChat();
            if (isMobile) setSidebarOpen(false);
          }}
          onNew={() => {
            newConversation();
            closeGroupChat();
            if (isMobile) setSidebarOpen(false);
          }}
          onDelete={deleteConversation}
          onRename={renameConversation}
          onTogglePin={async (id, isPinned) => {
            await supabase.from("conversations").update({ is_pinned: !isPinned } as any).eq("id", id);
            const { data } = await supabase.from("conversations").select("*").eq("user_id", user!.id).order("updated_at", { ascending: false });
            if (currentConversationId) loadConversation(currentConversationId);
          }}
          groupChats={groupChats}
          currentGroupId={currentGroupId}
          onSelectGroup={(id) => {
            loadGroupMessages(id);
            newConversation();
            if (isMobile) setSidebarOpen(false);
          }}
          isAuthenticated={!!user}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Scroll progress bar */}
        {messages.length > 0 && scrollProgress > 0 && (
          <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />
        )}

        {/* Header */}
        <header className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b bg-background/80 backdrop-blur-xl gap-1">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Hamburger morphing button */}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 relative"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <div className="flex flex-col gap-1 items-center justify-center w-4">
                <span className={cn(
                  "block h-[2px] w-4 bg-foreground rounded-full hamburger-line",
                  sidebarOpen && "rotate-45 translate-y-[3px]"
                )} />
                <span className={cn(
                  "block h-[2px] w-4 bg-foreground rounded-full hamburger-line",
                  sidebarOpen && "opacity-0 scale-0"
                )} />
                <span className={cn(
                  "block h-[2px] w-4 bg-foreground rounded-full hamburger-line",
                  sidebarOpen && "-rotate-45 -translate-y-[3px]"
                )} />
              </div>
            </Button>
            {/* Animated logo */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25 shrink-0 logo-animated">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold font-display tracking-tight truncate">{sitePresentation.title}</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {sitePresentation.subtitle}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Feature badges with hover animation */}
            <div className="hidden md:flex items-center gap-2">
              {features.slice(0, 4).map((f) => (
                <div 
                  key={f.label}
                  className="feature-badge flex items-center gap-1.5 px-2 py-1 bg-muted rounded-full text-xs cursor-default"
                >
                  <f.icon className="w-3 h-3 text-primary feature-badge-icon" />
                  <span className="text-muted-foreground">{f.label}</span>
                </div>
              ))}
            </div>
            {messages.length >= 4 && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={summarizeConversation} disabled={isLoading} title="Résumer la conversation">
                <FileText className="w-4 h-4" />
              </Button>
            )}
            <ConversationFavorites conversationId={currentConversationId} />
            <ShareConversationButton conversationId={currentConversationId} />
            <ConversationExport messages={messages.map(m => ({ role: m.role, content: m.content, createdAt: m.createdAt }))} />
            <PomodoroTimer />
            <PinnedMessages messages={pinnedMessages.map(m => ({ id: m.id!, content: m.content, createdAt: m.createdAt }))} onUnpin={togglePin} />
            <Button variant="ghost" size="icon" className="hidden sm:flex h-8 w-8" onClick={() => { setBrowserUrl(""); setBrowserOpen(true); }} title="Navigateur intégré">
              <Globe className="w-4 h-4" />
            </Button>
            <PreviewPanel items={previewItems} onClear={clearPreviewItems} />
            <SupportTicketDialog />
            <LanguageToggle />
            <ThemeToggle />
            <CustomizationPanel
              isUnlocked={customization.isUnlocked}
              theme={customization.theme}
              accentColor={customization.accentColor}
              layout={customization.layout}
              fontSize={customization.fontSize}
              voiceLanguage={customization.voiceLanguage}
              onUnlock={customization.unlock}
              onLock={customization.lock}
              onThemeChange={customization.setTheme}
              onAccentColorChange={customization.setAccentColor}
              onLayoutChange={customization.setLayout}
              onFontSizeChange={customization.setFontSize}
              onVoiceLanguageChange={customization.setVoiceLanguage}
              onReset={customization.reset}
            />
            {user ? (
              <UserMenu />
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-muted rounded-full text-[10px] sm:text-xs">
                  <MessageCircle className="w-3 h-3 text-primary" />
                  <span className="text-muted-foreground">{getGuestMessagesLeft()}/{GUEST_MAX_MESSAGES}</span>
                </div>
                <Button 
                  onClick={() => navigate("/auth")} 
                  className="gap-1 sm:gap-2 h-8 text-xs sm:text-sm px-2 sm:px-3 ripple-btn"
                  size="sm"
                >
                  <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Connexion</span>
                </Button>
              </div>
            )}
          </div>
        </header>


        {/* Chat Area */}
        <ScrollArea ref={scrollRef} className="flex-1 px-4 py-6 mesh-gradient-1">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 logo-animated">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold font-display mb-2">{sitePresentation.title}</h2>
              {activeEvent && activeEvent.styles.ai_greeting ? (
                <div className="px-4 py-3 rounded-xl mb-4 text-sm font-medium animate-fade-in" style={{
                  background: activeEvent.styles.background_gradient,
                  color: "#fff",
                  boxShadow: activeEvent.styles.glow_effect ? `0 0 20px ${activeEvent.styles.primary_color}40` : undefined,
                }}>
                  🎉 {activeEvent.styles.ai_greeting}
                </div>
              ) : (
                <p className="text-muted-foreground max-w-md mb-4">
                  {t("app.description")}
                </p>
              )}
              
              {/* Feature cards with glow */}
              {sitePresentation.show_features && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 w-full max-w-2xl">
                  {features.map((f) => (
                    <div key={f.label} className="p-3 rounded-xl bg-muted/50 border text-center card-glow gradient-border transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 group">
                      <f.icon className="w-6 h-6 mx-auto mb-2 text-primary transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" />
                      <p className="text-sm font-medium font-display">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-2 w-full max-w-md">
                {[
                  t("suggestion.1"),
                  t("suggestion.2"),
                  t("suggestion.3"),
                  t("suggestion.4"),
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    className="h-auto py-2.5 px-4 text-left justify-start text-sm whitespace-normal ripple-btn hover:border-primary/30 hover:shadow-sm transition-all"
                    onClick={() => handleSend(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : isLoadingConversation ? (
            <div className={cn("mx-auto", layoutClasses[customization.layout])}>
              <ChatSkeleton />
            </div>
          ) : (
            <div className={cn("space-y-4 mx-auto", layoutClasses[customization.layout])}>
              {messages.map((msg, i) => {
                const isLastAssistant = msg.role === "assistant" && 
                  i === messages.map((m, idx) => m.role === "assistant" ? idx : -1).filter(x => x >= 0).pop();
                
                // Date separator
                const currentDate = msg.createdAt ? new Date(msg.createdAt).toDateString() : null;
                const prevDate = i > 0 && messages[i - 1].createdAt ? new Date(messages[i - 1].createdAt!).toDateString() : null;
                const showDateSeparator = i === 0 || (currentDate && currentDate !== prevDate);

                return (
                  <div key={msg.id || i}>
                    {showDateSeparator && msg.createdAt && (
                      <div className="date-separator my-4 text-center">
                        <span className="px-3 py-1 bg-muted rounded-full text-[11px] font-medium">
                          {getDateLabel(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <ChatMessage 
                      role={msg.role}
                      content={msg.content}
                      imageUrl={msg.imageUrl}
                      messageId={msg.id}
                      createdAt={msg.createdAt}
                      onDelete={deleteMessage}
                      onRegenerate={i === messages.length - 1 && msg.role === "assistant" ? regenerateLastMessage : undefined}
                      onPin={togglePin}
                      isPinned={msg.id ? pinnedMessageIds.has(msg.id) : false}
                      isRegenerating={isRegenerating && i === messages.length - 1}
                      isLastAssistant={isLastAssistant}
                    />
                  </div>
                );
              })}
              {isLoading && <TypingIndicator />}
            </div>
          )}
        </ScrollArea>

        {/* Scroll to bottom button */}
        <ScrollToBottomButton 
          visible={showScrollButton} 
          onClick={scrollToBottom} 
        />

        {/* Code Editor Button */}
        {generatedCode && (
          <div className="px-4 py-2 border-t bg-primary/5">
            <Button 
              onClick={openCodeEditor}
              className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80"
            >
              <Code className="w-4 h-4" />
              Ouvrir l'éditeur de code
            </Button>
          </div>
        )}

        {/* Persona + Input */}
        <div className="border-t bg-background/80 backdrop-blur-sm">
          <AnnouncementBanner userEmail={user?.email || undefined} userId={user?.id} />
          {user && <VPWelcomeDialog userId={user.id} isVicePresident={isVicePresident} />}
          <div className="px-4 pt-2">
            <UserAdsDisplay />
            <div className="flex items-center gap-2">
              <PersonaSelector persona={persona} onChange={setPersona} />
            </div>
          </div>
          <div className="flex items-center gap-1 px-4">
            <MessageTemplates onSelect={(text) => handleSend(text)} />
            <WordCounter messages={messages.map(m => ({ role: m.role, content: m.content }))} />
          </div>
          <div className={cn(sendSuccess && "send-success")}>
            <ChatInput 
              onSend={handleSend} 
              isLoading={isLoading} 
              messages={messages.map(m => ({ role: m.role, content: m.content }))}
              userId={user?.id}
              voiceLanguage={customization.voiceLanguage}
            />
          </div>
        </div>
      </div>

      {/* Terms Dialog */}
      {user && <TermsDialog />}
      {/* Browser Panel */}
      {browserOpen && (
        <BrowserPanel initialUrl={browserUrl} onClose={() => setBrowserOpen(false)} />
      )}
      {/* Search Dialog */}
      <SearchCommandDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        conversations={conversations}
        onSelect={(id) => { loadConversation(id); closeGroupChat(); }}
      />
    </div>
  );
};

export default Index;
