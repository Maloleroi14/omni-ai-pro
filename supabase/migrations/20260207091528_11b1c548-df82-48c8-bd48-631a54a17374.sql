-- Add user_id column to conversations table to link conversations to users
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS user_id uuid;

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);

-- Update RLS policies to allow users to only see their own private conversations
DROP POLICY IF EXISTS "Allow all access to conversations" ON public.conversations;

-- Users can view their own conversations
CREATE POLICY "Users can view own conversations"
ON public.conversations
FOR SELECT
USING (
  user_id = auth.uid() 
  OR is_global = true
);

-- Users can create their own conversations
CREATE POLICY "Users can create own conversations"
ON public.conversations
FOR INSERT
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations"
ON public.conversations
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own conversations
CREATE POLICY "Users can delete own conversations"
ON public.conversations
FOR DELETE
USING (user_id = auth.uid());

-- Admins can manage all conversations
CREATE POLICY "Admins can manage all conversations"
ON public.conversations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));