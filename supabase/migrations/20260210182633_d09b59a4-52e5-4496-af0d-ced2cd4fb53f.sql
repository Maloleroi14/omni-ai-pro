
-- Fix messages table: replace permissive "Allow all access" with proper policies
DROP POLICY IF EXISTS "Allow all access to messages" ON public.messages;

CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_id 
    AND (c.user_id = auth.uid() OR c.is_global = true)
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Authenticated users can insert messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own messages"
ON public.messages FOR UPDATE
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own messages"
ON public.messages FOR DELETE
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Fix admin_settings: restrict read to authenticated users only
DROP POLICY IF EXISTS "Everyone can read settings" ON public.admin_settings;

CREATE POLICY "Authenticated users can read settings"
ON public.admin_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Fix device_blocks: restrict insert to authenticated users, restrict select
DROP POLICY IF EXISTS "Anyone can check block status" ON public.device_blocks;
DROP POLICY IF EXISTS "Anyone can create blocks" ON public.device_blocks;

CREATE POLICY "Authenticated users can check block status"
ON public.device_blocks FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create blocks"
ON public.device_blocks FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix learned_capabilities: restrict insert/update to admins
DROP POLICY IF EXISTS "Service role can insert capabilities" ON public.learned_capabilities;
DROP POLICY IF EXISTS "Service role can update capabilities" ON public.learned_capabilities;

CREATE POLICY "Admins can insert capabilities"
ON public.learned_capabilities FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update capabilities"
ON public.learned_capabilities FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin moderation for reactions
CREATE POLICY "Admins can manage reactions"
ON public.message_reactions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
