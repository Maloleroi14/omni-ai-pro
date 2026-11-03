
CREATE OR REPLACE FUNCTION public.auto_changelog_from_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  changelog_title TEXT;
  changelog_desc TEXT;
  changelog_type TEXT;
  version_num TEXT;
  entry_count INT;
BEGIN
  -- Map action types to changelog entries
  CASE NEW.action_type
    WHEN 'toggle_feature' THEN
      changelog_title := 'Fonctionnalité mise à jour';
      changelog_desc := COALESCE(NEW.action_details->>'feature_name', 'Une fonctionnalité a été modifiée');
      changelog_type := 'update';
    WHEN 'update_settings' THEN
      changelog_title := 'Paramètres mis à jour';
      changelog_desc := COALESCE(NEW.action_details->>'description', 'Les paramètres du système ont été modifiés');
      changelog_type := 'improvement';
    WHEN 'add_capability' THEN
      changelog_title := COALESCE(NEW.action_details->>'capability_name', 'Nouvelle capacité');
      changelog_desc := COALESCE(NEW.action_details->>'description', 'Une nouvelle fonctionnalité a été ajoutée');
      changelog_type := 'feature';
    WHEN 'create_event' THEN
      changelog_title := 'Nouvel événement : ' || COALESCE(NEW.action_details->>'event_name', 'Événement');
      changelog_desc := COALESCE(NEW.action_details->>'description', 'Un nouvel événement a été créé');
      changelog_type := 'feature';
    WHEN 'create_announcement' THEN
      changelog_title := 'Nouvelle annonce';
      changelog_desc := COALESCE(NEW.action_details->>'title', 'Une annonce a été publiée');
      changelog_type := 'update';
    ELSE
      -- Skip non-relevant actions
      RETURN NEW;
  END CASE;

  -- Auto-generate version based on count
  SELECT COUNT(*) INTO entry_count FROM public.changelog_entries;
  version_num := '2.' || (5 + (entry_count / 10))::INT || '.' || (entry_count % 10);

  INSERT INTO public.changelog_entries (version, title, description, type, release_date)
  VALUES (version_num, changelog_title, changelog_desc, changelog_type, CURRENT_DATE);

  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_changelog_trigger
  AFTER INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_changelog_from_audit();
