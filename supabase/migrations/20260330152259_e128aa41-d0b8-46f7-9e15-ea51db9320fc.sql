
-- Create dm_group_members first (without FK, we add it after dm_groups)
CREATE TABLE public.dm_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member',
  added_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Table pour les groupes DM
CREATE TABLE public.dm_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  photo_url text,
  created_by uuid NOT NULL,
  allow_member_invite boolean DEFAULT false,
  only_admins_can_send boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add FK now
ALTER TABLE public.dm_group_members ADD CONSTRAINT dm_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.dm_groups(id) ON DELETE CASCADE;

-- RLS for dm_groups
ALTER TABLE public.dm_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view groups" ON public.dm_groups
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.dm_group_members WHERE group_id = id AND user_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Creator can manage group" ON public.dm_groups
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Creator can delete group" ON public.dm_groups
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can create groups" ON public.dm_groups
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- RLS for dm_group_members
ALTER TABLE public.dm_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group members" ON public.dm_group_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.dm_group_members m WHERE m.group_id = dm_group_members.group_id AND m.user_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Group creators and admins can manage members" ON public.dm_group_members
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.dm_groups g WHERE g.id = group_id AND (g.created_by = auth.uid() OR has_role(auth.uid(), 'admin')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.dm_groups g WHERE g.id = group_id AND (g.created_by = auth.uid() OR has_role(auth.uid(), 'admin')))
  );

CREATE POLICY "Users can join via invite" ON public.dm_group_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Table pour les messages de groupe
CREATE TABLE public.dm_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.dm_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.dm_group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group messages" ON public.dm_group_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.dm_group_members WHERE group_id = dm_group_messages.group_id AND user_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Members can send group messages" ON public.dm_group_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      EXISTS (SELECT 1 FROM public.dm_group_members WHERE group_id = dm_group_messages.group_id AND user_id = auth.uid())
      OR has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Admin can delete group messages" ON public.dm_group_messages
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR auth.uid() = sender_id);

-- Enable realtime for group messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_group_messages;
