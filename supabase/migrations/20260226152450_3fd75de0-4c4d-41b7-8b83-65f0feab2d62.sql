
-- Sticky notes per user
CREATE TABLE public.sticky_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'yellow',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sticky_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sticky notes" ON public.sticky_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sticky notes" ON public.sticky_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sticky notes" ON public.sticky_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sticky notes" ON public.sticky_notes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all sticky notes" ON public.sticky_notes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Ads system (global + per-user)
CREATE TABLE public.user_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  target_user_id UUID, -- NULL = global ad for all users
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_ads ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read ads (filtering done in app)
CREATE POLICY "Authenticated users can read ads" ON public.user_ads FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage ads" ON public.user_ads FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_sticky_notes_updated_at BEFORE UPDATE ON public.sticky_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_ads_updated_at BEFORE UPDATE ON public.user_ads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
