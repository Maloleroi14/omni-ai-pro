
CREATE TABLE public.session_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  session_id text NOT NULL,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  page_url text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.session_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all recordings"
  ON public.session_recordings FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own recordings"
  ON public.session_recordings FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recordings"
  ON public.session_recordings FOR UPDATE
  TO public
  USING (auth.uid() = user_id);

CREATE INDEX idx_session_recordings_user ON public.session_recordings(user_id);
CREATE INDEX idx_session_recordings_active ON public.session_recordings(is_active);
CREATE INDEX idx_session_recordings_started ON public.session_recordings(started_at DESC);
