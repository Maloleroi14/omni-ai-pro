
-- Active user sessions for live tracking
CREATE TABLE public.active_user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  current_page text DEFAULT '/',
  last_activity_at timestamptz DEFAULT now(),
  started_at timestamptz DEFAULT now(),
  user_agent text,
  is_active boolean DEFAULT true
);

ALTER TABLE public.active_user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all sessions" ON public.active_user_sessions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own session" ON public.active_user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own session" ON public.active_user_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own session" ON public.active_user_sessions FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.active_user_sessions;

-- User favorites for bookmarking conversations
CREATE TABLE public.user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  message_id uuid,
  created_at timestamptz DEFAULT now(),
  note text
);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own favorites" ON public.user_favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all favorites" ON public.user_favorites FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Shared conversations
CREATE TABLE public.shared_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  shared_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true
);

ALTER TABLE public.shared_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own shares" ON public.shared_conversations FOR ALL USING (auth.uid() = shared_by) WITH CHECK (auth.uid() = shared_by);
CREATE POLICY "Anyone can read active shares" ON public.shared_conversations FOR SELECT USING (is_active = true);
