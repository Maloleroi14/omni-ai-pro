
-- Table for storing data from generated sites (generic key-value store per project)
CREATE TABLE public.site_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  collection text NOT NULL DEFAULT 'default',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_site_data_project_collection ON public.site_data(project_id, collection);

-- Enable RLS
ALTER TABLE public.site_data ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read/write site data (public sites need public data)
CREATE POLICY "Anyone can read site data" ON public.site_data FOR SELECT USING (true);
CREATE POLICY "Anyone can insert site data" ON public.site_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update site data" ON public.site_data FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete site data" ON public.site_data FOR DELETE USING (true);

-- Table for form submissions from generated sites
CREATE TABLE public.site_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  form_name text NOT NULL DEFAULT 'contact',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_site_form_project ON public.site_form_submissions(project_id, form_name);

ALTER TABLE public.site_form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert form submissions" ON public.site_form_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read form submissions" ON public.site_form_submissions FOR SELECT USING (true);
