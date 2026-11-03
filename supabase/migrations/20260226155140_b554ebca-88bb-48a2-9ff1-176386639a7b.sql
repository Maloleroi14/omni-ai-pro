
-- Fix RLS policies: drop restrictive ones and recreate as permissive
DROP POLICY IF EXISTS "Authenticated users can read ads" ON public.user_ads;
DROP POLICY IF EXISTS "Admins can manage ads" ON public.user_ads;

CREATE POLICY "Authenticated users can read ads"
ON public.user_ads
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage ads"
ON public.user_ads
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
