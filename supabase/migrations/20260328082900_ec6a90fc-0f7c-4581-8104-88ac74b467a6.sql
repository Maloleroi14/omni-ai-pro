
-- Create a SECURITY DEFINER function to check if a user is a collaborator
-- This avoids infinite recursion between user_projects and project_collaborators RLS policies
CREATE OR REPLACE FUNCTION public.is_project_collaborator(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_collaborators
    WHERE user_id = _user_id
      AND project_id = _project_id
  )
$$;

-- Also create a function to check if a user owns a project (to avoid recursion on project_collaborators)
CREATE OR REPLACE FUNCTION public.is_project_owner(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_projects
    WHERE user_id = _user_id
      AND id = _project_id
  )
$$;

-- Drop the recursive policies
DROP POLICY IF EXISTS "Collaborators can access shared projects" ON public.user_projects;
DROP POLICY IF EXISTS "Project owners can manage collaborators" ON public.project_collaborators;

-- Recreate user_projects collaborator policy using the SECURITY DEFINER function
CREATE POLICY "Collaborators can access shared projects"
ON public.user_projects
FOR SELECT
TO authenticated
USING (
  public.is_project_collaborator(auth.uid(), id)
);

-- Recreate project_collaborators owner policy using the SECURITY DEFINER function  
CREATE POLICY "Project owners can manage collaborators"
ON public.project_collaborators
FOR ALL
TO authenticated
USING (
  public.is_project_owner(auth.uid(), project_id)
)
WITH CHECK (
  public.is_project_owner(auth.uid(), project_id)
);
