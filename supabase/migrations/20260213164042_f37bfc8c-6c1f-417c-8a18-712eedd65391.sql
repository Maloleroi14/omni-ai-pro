
-- Table for credit purchase requests
CREATE TABLE public.credit_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  amount INTEGER NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID
);

-- Enable RLS
ALTER TABLE public.credit_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
ON public.credit_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create own requests"
ON public.credit_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all requests
CREATE POLICY "Admins can manage all requests"
ON public.credit_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
