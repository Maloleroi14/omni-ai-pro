
-- Create banned_users table
CREATE TABLE public.banned_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  banned_by UUID NOT NULL,
  reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

-- Only admins can manage bans
CREATE POLICY "Admins can manage bans"
ON public.banned_users
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can check if they are banned
CREATE POLICY "Users can check own ban status"
ON public.banned_users
FOR SELECT
USING (auth.uid() = user_id);
