
-- Drop broken restrictive policies
DROP POLICY IF EXISTS "Authenticated users can read ads" ON public.user_ads;
DROP POLICY IF EXISTS "Admins can manage ads" ON public.user_ads;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Authenticated users can read ads"
ON public.user_ads
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage ads"
ON public.user_ads
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
