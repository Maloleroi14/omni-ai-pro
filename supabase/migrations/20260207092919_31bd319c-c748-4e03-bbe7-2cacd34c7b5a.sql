-- Add site presentation settings to admin_settings if not exists
INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES (
  'site_presentation',
  '{
    "title": "OmniAI Pro",
    "subtitle": "IA ultra-puissante",
    "description": "L''une des IA les plus avancées au monde. Propulsée par Gemini 2.5 Pro avec recherche web et génération d''images.",
    "welcome_message": "Bienvenue sur OmniAI Pro !",
    "primary_color": "purple",
    "show_features": true
  }'::jsonb
)
ON CONFLICT (setting_key) DO NOTHING;