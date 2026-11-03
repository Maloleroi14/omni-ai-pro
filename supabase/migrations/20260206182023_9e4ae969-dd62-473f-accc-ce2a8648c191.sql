-- Enable realtime for messages table to support group chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;