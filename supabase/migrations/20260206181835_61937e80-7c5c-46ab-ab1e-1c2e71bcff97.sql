-- Add type column to conversations for group chats
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'private',
ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;

-- Create global group chat for all members
INSERT INTO public.conversations (id, title, type, is_global)
VALUES ('00000000-0000-0000-0000-000000000001', 'Chat Général', 'group_all', true)
ON CONFLICT (id) DO NOTHING;

-- Create admin-only group chat
INSERT INTO public.conversations (id, title, type, is_global)
VALUES ('00000000-0000-0000-0000-000000000002', 'Chat Admins', 'group_admin', true)
ON CONFLICT (id) DO NOTHING;

-- Add user_id to messages to track who sent what in group chats
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS user_email text;