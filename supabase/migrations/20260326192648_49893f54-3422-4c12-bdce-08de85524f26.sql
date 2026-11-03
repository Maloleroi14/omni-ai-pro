
CREATE TABLE public.banned_user_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id uuid NOT NULL,
  email text NOT NULL,
  display_name text,
  backup_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(original_user_id)
);

ALTER TABLE public.banned_user_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage backups" ON public.banned_user_backups FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role can manage backups" ON public.banned_user_backups FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
