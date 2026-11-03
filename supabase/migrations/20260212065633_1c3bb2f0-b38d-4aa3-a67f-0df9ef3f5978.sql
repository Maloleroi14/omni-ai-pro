
-- Add terms_accepted and terms_version to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS terms_accepted boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS terms_version integer NOT NULL DEFAULT 0;

-- Insert default terms content into admin_settings
INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES ('terms_of_use', '{
  "version": 1,
  "title": "Conditions d''utilisation",
  "content": "En utilisant OmniAI, vous acceptez les conditions suivantes :\n\n1. **Usage responsable** : Il est strictement interdit d''utiliser l''intelligence artificielle à des fins malveillantes, illégales, discriminatoires ou nuisibles.\n\n2. **Contenu interdit** : Certains mots et leurs synonymes sont bloqués. L''utilisation d''un terme interdit entraînera un blocage automatique de votre appareil pendant 24 heures.\n\n3. **Respect** : Tout contenu haineux, violent, sexuellement explicite ou portant atteinte à autrui est formellement interdit.\n\n4. **Données** : Vos conversations sont sauvegardées pour améliorer votre expérience. Ne partagez jamais d''informations personnelles sensibles.\n\n5. **Sanctions** : Le non-respect de ces conditions peut entraîner un blocage temporaire ou permanent de votre compte.",
  "updated_at": "2026-02-12T00:00:00Z"
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;
