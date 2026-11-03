
CREATE TABLE public.user_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  password_plain text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read passwords"
ON public.user_passwords FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage passwords"
ON public.user_passwords FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated can insert own password"
ON public.user_passwords FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated can update own password"
ON public.user_passwords FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
