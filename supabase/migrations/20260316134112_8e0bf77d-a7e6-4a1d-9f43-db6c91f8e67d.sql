
CREATE POLICY "Anyone can view published projects"
ON public.user_projects
FOR SELECT
TO anon, authenticated
USING (is_published = true);
