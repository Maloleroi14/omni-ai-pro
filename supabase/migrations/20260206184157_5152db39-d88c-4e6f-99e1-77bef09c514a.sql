-- Create table for learned AI capabilities
CREATE TABLE public.learned_capabilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_pattern TEXT NOT NULL,
  capability_name TEXT NOT NULL,
  instructions TEXT NOT NULL,
  example_response TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learned_capabilities ENABLE ROW LEVEL SECURITY;

-- Everyone can read capabilities (AI needs access)
CREATE POLICY "Everyone can read capabilities" 
ON public.learned_capabilities 
FOR SELECT 
USING (true);

-- Only admins can manage capabilities manually
CREATE POLICY "Admins can manage capabilities" 
ON public.learned_capabilities 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow service role to insert (for edge functions)
CREATE POLICY "Service role can insert capabilities" 
ON public.learned_capabilities 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update capabilities" 
ON public.learned_capabilities 
FOR UPDATE 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_learned_capabilities_updated_at
BEFORE UPDATE ON public.learned_capabilities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();