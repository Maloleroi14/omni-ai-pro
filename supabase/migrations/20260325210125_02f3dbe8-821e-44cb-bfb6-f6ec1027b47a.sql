
-- Table for project invitations
CREATE TABLE public.project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.user_projects(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  invited_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invitation_token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);

ALTER TABLE public.project_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can manage invitations" ON public.project_invitations
  FOR ALL TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Invited users can view their invitations" ON public.project_invitations
  FOR SELECT TO authenticated
  USING (invited_email IN (SELECT email FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Invited users can update their invitations" ON public.project_invitations
  FOR UPDATE TO authenticated
  USING (invited_email IN (SELECT email FROM public.profiles WHERE user_id = auth.uid()));

-- Table for project collaborators
CREATE TABLE public.project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.user_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can manage collaborators" ON public.project_collaborators
  FOR ALL TO authenticated
  USING (
    project_id IN (SELECT id FROM public.user_projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM public.user_projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Collaborators can view their own entries" ON public.project_collaborators
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Collaborators can access shared projects" ON public.user_projects
  FOR SELECT TO authenticated
  USING (id IN (SELECT project_id FROM public.project_collaborators WHERE user_id = auth.uid()));

-- Table for project visit analytics
CREATE TABLE public.project_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.user_projects(id) ON DELETE CASCADE,
  visitor_ip TEXT,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INTEGER DEFAULT 0
);

ALTER TABLE public.project_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can view visits" ON public.project_visits
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.user_projects WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can insert visits" ON public.project_visits
  FOR INSERT TO public
  WITH CHECK (true);
