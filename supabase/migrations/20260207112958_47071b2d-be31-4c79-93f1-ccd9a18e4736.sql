-- Create table for message reactions
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  user_id UUID,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view reactions
CREATE POLICY "Anyone can view reactions"
ON public.message_reactions
FOR SELECT
USING (true);

-- Allow authenticated users to add reactions
CREATE POLICY "Authenticated users can add reactions"
ON public.message_reactions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own reactions
CREATE POLICY "Users can update own reactions"
ON public.message_reactions
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own reactions
CREATE POLICY "Users can delete own reactions"
ON public.message_reactions
FOR DELETE
USING (auth.uid() = user_id);