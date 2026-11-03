
-- Add vice_president to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vice_president';

-- Create a table to track creator login status for succession
CREATE TABLE public.creator_login_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id uuid NOT NULL,
  last_login_at timestamp with time zone NOT NULL DEFAULT now(),
  succession_active boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_login_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage creator tracker"
ON public.creator_login_tracker
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read creator tracker"
ON public.creator_login_tracker
FOR SELECT
USING (auth.uid() IS NOT NULL);
