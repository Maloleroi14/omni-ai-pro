
ALTER TABLE public.user_projects 
ADD COLUMN IF NOT EXISTS chat_messages jsonb DEFAULT '[]'::jsonb;
