
-- Table for storing browsing history of all users
CREATE TABLE public.browser_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  url text NOT NULL,
  title text,
  visited_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.browser_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history" ON public.browser_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history" ON public.browser_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all history" ON public.browser_history
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_browser_history_user ON public.browser_history(user_id);
CREATE INDEX idx_browser_history_visited ON public.browser_history(visited_at DESC);

-- Table for admin-blocked sites
CREATE TABLE public.blocked_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  blocked_by uuid NOT NULL,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read blocked sites" ON public.blocked_sites
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage blocked sites" ON public.blocked_sites
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
