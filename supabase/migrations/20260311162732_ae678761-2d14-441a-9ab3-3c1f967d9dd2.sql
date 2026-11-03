
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notifications" ON public.admin_notifications
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert notifications" ON public.admin_notifications
  FOR INSERT TO public
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE INDEX idx_admin_notifications_created ON public.admin_notifications (created_at DESC);
CREATE INDEX idx_admin_notifications_unread ON public.admin_notifications (is_read) WHERE is_read = false;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

-- Trigger function to create notification on new user signup
CREATE OR REPLACE FUNCTION public.notify_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, metadata)
  VALUES (
    'new_user',
    'Nouvel utilisateur',
    'Un nouvel utilisateur s''est inscrit : ' || COALESCE(NEW.email, 'inconnu'),
    jsonb_build_object('user_id', NEW.user_id, 'email', NEW.email, 'display_name', NEW.display_name)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_profile_notify
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_user();

-- Trigger for ban events
CREATE OR REPLACE FUNCTION public.notify_user_banned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  INSERT INTO public.admin_notifications (type, title, message, metadata)
  VALUES (
    'user_banned',
    'Utilisateur banni',
    'L''utilisateur ' || COALESCE(user_email, NEW.user_id::text) || ' a été banni',
    jsonb_build_object('user_id', NEW.user_id, 'email', user_email, 'reason', NEW.reason)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_banned_notify
  AFTER INSERT ON public.banned_users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_banned();
