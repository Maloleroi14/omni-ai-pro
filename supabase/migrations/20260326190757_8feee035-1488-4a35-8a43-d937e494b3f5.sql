
ALTER TABLE public.banned_users 
ADD COLUMN IF NOT EXISTS ban_message text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ban_type text DEFAULT 'default',
ADD COLUMN IF NOT EXISTS message_read boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS message_read_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS permanent boolean DEFAULT true;
