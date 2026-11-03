CREATE TABLE public.faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active FAQ items" ON public.faq_items
  FOR SELECT TO public USING (is_active = true);

CREATE POLICY "Admins can manage FAQ items" ON public.faq_items
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));