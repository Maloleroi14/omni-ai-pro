
CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert contact submissions" ON public.contact_submissions
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Admins can manage contact submissions" ON public.contact_submissions
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
