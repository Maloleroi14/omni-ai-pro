ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;
ALTER TABLE public.user_projects ADD COLUMN IF NOT EXISTS template_name text DEFAULT null;