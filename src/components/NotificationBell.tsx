import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type Notification = {
  id: string;
  title: string;
  content: string;
  type: "info" | "success" | "warning";
  read: boolean;
  created_at: string;
};

export function NotificationBell() {
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    // Get user email for filtering targeted announcements
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", user.id)
      .single();
    const userEmail = profile?.email;

    // Use announcements as notifications source
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      // Filter: only show announcements targeted at this user
      const filtered = data.filter((a) => {
        if (a.type === "update") return false;
        if (a.target === "specific" && userEmail) {
          return (a.target_emails || []).includes(userEmail);
        }
        if (a.target === "specific" && !userEmail) return false;
        return a.target === "all";
      });

      setNotifications(
        filtered.map((a) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          type: a.type === "warning" ? "warning" : a.type === "success" ? "success" : "info",
          read: (a.dismissed_by || []).includes(user.id),
          created_at: a.created_at,
        }))
      );
    }
  };

  const markRead = async (id: string) => {
    if (!user) return;
    const notif = notifications.find((n) => n.id === id);
    if (!notif || notif.read) return;
    
    const { data: current } = await supabase.from("announcements").select("dismissed_by").eq("id", id).single();
    const dismissed = [...(current?.dismissed_by || []), user.id];
    await supabase.from("announcements").update({ dismissed_by: dismissed } as any).eq("id", id);
    
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    for (const n of notifications.filter((n) => !n.read)) {
      await markRead(n.id);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <button className="text-xs text-primary hover:underline" onClick={markAllRead}>
              Tout marquer lu
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune notification</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors",
                  !n.read && "bg-primary/5"
                )}
                onClick={() => markRead(n.id)}
              >
                <div className="flex items-start gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                    !n.read ? "bg-primary" : "bg-transparent"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.content}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
