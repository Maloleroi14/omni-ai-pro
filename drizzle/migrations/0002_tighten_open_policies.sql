-- site_data: only project owners
DROP POLICY IF EXISTS "Anyone can delete site data" ON public.site_data;
DROP POLICY IF EXISTS "Anyone can update site data" ON public.site_data;
DROP POLICY IF EXISTS "Anyone can insert site data" ON public.site_data;
DROP POLICY IF EXISTS "Anyone can read site data" ON public.site_data;
CREATE POLICY "Project owners manage site data" ON public.site_data FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_projects p WHERE p.id = site_data.project_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_projects p WHERE p.id = site_data.project_id AND p.user_id = auth.uid()));

-- site_form_submissions: only project owners
DROP POLICY IF EXISTS "Anyone can insert form submissions" ON public.site_form_submissions;
DROP POLICY IF EXISTS "Anyone can read form submissions" ON public.site_form_submissions;
CREATE POLICY "Project owners manage form submissions" ON public.site_form_submissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_projects p WHERE p.id = site_form_submissions.project_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_projects p WHERE p.id = site_form_submissions.project_id AND p.user_id = auth.uid()));

-- calculator_unlocks: admins only
DROP POLICY IF EXISTS "Anyone can insert unlocks" ON public.calculator_unlocks;
DROP POLICY IF EXISTS "Anyone can read unlocks" ON public.calculator_unlocks;
CREATE POLICY "Admins manage unlocks" ON public.calculator_unlocks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- pending_deletions: remove open read (owner + service policies remain)
DROP POLICY IF EXISTS "Anyone can read by recovery token" ON public.pending_deletions;

-- forced_maintenance_users: users see only their own entry
DROP POLICY IF EXISTS "Anyone can read forced maintenance" ON public.forced_maintenance_users;
CREATE POLICY "Users read own forced maintenance" ON public.forced_maintenance_users FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));

-- profiles: signed-in users only
DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;
CREATE POLICY "Signed-in users view profiles" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);