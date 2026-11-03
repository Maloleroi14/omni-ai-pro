CREATE POLICY "Anyone can view template projects"
ON public.user_projects
FOR SELECT
TO public
USING (is_template = true AND is_published = true);