
-- Create troll_mode table to track which users have troll mode active
CREATE TABLE public.troll_mode (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  activated_by uuid NOT NULL,
  activated_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.troll_mode ENABLE ROW LEVEL SECURITY;

-- Admins can manage troll mode
CREATE POLICY "Admins can manage troll mode"
ON public.troll_mode
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage (for edge functions)
CREATE POLICY "Service role can manage troll mode"
ON public.troll_mode
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);
