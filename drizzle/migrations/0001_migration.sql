CREATE INDEX IF NOT EXISTS idx_user_projects_user_updated ON public.user_projects (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON public.admin_settings (setting_key);