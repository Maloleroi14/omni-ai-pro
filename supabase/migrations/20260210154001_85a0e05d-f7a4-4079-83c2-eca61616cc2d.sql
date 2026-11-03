
-- Table to track blocked devices/users
CREATE TABLE public.device_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  user_id UUID,
  user_email TEXT,
  blocked_word TEXT NOT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 day'),
  unblocked_by_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.device_blocks ENABLE ROW LEVEL SECURITY;

-- Anyone can read their own block status (by device_id via anon)
CREATE POLICY "Anyone can check block status"
ON public.device_blocks
FOR SELECT
USING (true);

-- Anyone can insert a block (triggered by the app when bad word detected)
CREATE POLICY "Anyone can create blocks"
ON public.device_blocks
FOR INSERT
WITH CHECK (true);

-- Only admin can update (unblock)
CREATE POLICY "Admins can update blocks"
ON public.device_blocks
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admin can delete blocks
CREATE POLICY "Admins can delete blocks"
ON public.device_blocks
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
