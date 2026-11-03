
-- Direct messages conversations between users
CREATE TABLE public.direct_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL,
  user2_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own direct conversations"
ON public.direct_conversations FOR SELECT
TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Authenticated can create direct conversations"
ON public.direct_conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update own direct conversations"
ON public.direct_conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Admins can manage all direct conversations"
ON public.direct_conversations FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Direct messages
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_read boolean NOT NULL DEFAULT false
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
ON public.direct_messages FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.direct_conversations dc
  WHERE dc.id = conversation_id AND (dc.user1_id = auth.uid() OR dc.user2_id = auth.uid())
));

CREATE POLICY "Users can send messages in their conversations"
ON public.direct_messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.direct_conversations dc
    WHERE dc.id = conversation_id AND (dc.user1_id = auth.uid() OR dc.user2_id = auth.uid())
  )
);

CREATE POLICY "Admins can manage all direct messages"
ON public.direct_messages FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Update proposals for voting
CREATE TABLE public.update_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'feature',
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.update_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published proposals"
ON public.update_proposals FOR SELECT
TO public
USING (is_published = true);

CREATE POLICY "Admins can manage all proposals"
ON public.update_proposals FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Votes on proposals
CREATE TABLE public.proposal_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.update_proposals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(proposal_id, user_id)
);

ALTER TABLE public.proposal_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all votes"
ON public.proposal_votes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert own vote"
ON public.proposal_votes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vote"
ON public.proposal_votes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all votes"
ON public.proposal_votes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for direct messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
