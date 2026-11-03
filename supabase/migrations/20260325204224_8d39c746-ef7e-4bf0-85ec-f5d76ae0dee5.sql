CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  daily_credits_amount INTEGER;
  setting_val JSONB;
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, SPLIT_PART(NEW.email, '@', 1));
  
  SELECT setting_value::jsonb INTO setting_val
  FROM public.admin_settings
  WHERE setting_key = 'daily_credits'
  LIMIT 1;
  
  daily_credits_amount := COALESCE((setting_val->>'amount')::INTEGER, 15);
  
  IF NEW.email = 'omniaiproultime@gmail.com' THEN
    INSERT INTO public.user_credits (user_id, credits, last_reset)
    VALUES (NEW.id, 999999, now());
  ELSE
    INSERT INTO public.user_credits (user_id, credits, last_reset)
    VALUES (NEW.id, daily_credits_amount, now());
  END IF;
  
  IF NEW.email = 'omniaiproultime@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;