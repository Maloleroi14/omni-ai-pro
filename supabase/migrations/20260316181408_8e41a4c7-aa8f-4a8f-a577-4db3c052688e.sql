CREATE POLICY "Admins can manage all sessions"
ON public.active_user_sessions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));