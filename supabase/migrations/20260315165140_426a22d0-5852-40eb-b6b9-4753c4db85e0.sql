
-- Table for admin internal notes on users
CREATE TABLE public.admin_user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  admin_email text NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user notes" ON public.admin_user_notes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Table for blocked/banned words
CREATE TABLE public.blocked_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL UNIQUE,
  added_by uuid NOT NULL,
  added_by_email text NOT NULL,
  severity text NOT NULL DEFAULT 'block',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage blocked words" ON public.blocked_words
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read blocked words" ON public.blocked_words
  FOR SELECT TO authenticated
  USING (true);
