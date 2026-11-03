
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email TEXT NOT NULL,
  admin_user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  target_email TEXT,
  target_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage audit logs" ON public.audit_logs
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
  FOR INSERT TO public
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
