ALTER TABLE public.user_projects 
ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS lock_code text;