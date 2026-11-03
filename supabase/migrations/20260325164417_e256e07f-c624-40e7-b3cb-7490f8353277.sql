
CREATE TABLE public.changelog_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  type text NOT NULL DEFAULT 'update',
  is_published boolean NOT NULL DEFAULT true,
  release_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published changelog" ON public.changelog_entries
  FOR SELECT TO public USING (is_published = true);

CREATE POLICY "Admins can manage changelog" ON public.changelog_entries
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  category text NOT NULL DEFAULT 'feature',
  is_published boolean NOT NULL DEFAULT true,
  target_date text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published roadmap" ON public.roadmap_items
  FOR SELECT TO public USING (is_published = true);

CREATE POLICY "Admins can manage roadmap" ON public.roadmap_items
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
