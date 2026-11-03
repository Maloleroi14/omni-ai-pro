-- Fix: Read daily_credits from admin_settings instead of hardcoding 15
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  daily_credits_amount INTEGER;
  setting_val JSONB;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, SPLIT_PART(NEW.email, '@', 1));
  
  -- Read daily credits from admin_settings
  SELECT setting_value::jsonb INTO setting_val
  FROM public.admin_settings
  WHERE setting_key = 'daily_credits'
  LIMIT 1;
  
  daily_credits_amount := COALESCE((setting_val->>'amount')::INTEGER, 15);
  
  -- Create credits with the configured amount
  INSERT INTO public.user_credits (user_id, credits, last_reset)
  VALUES (NEW.id, daily_credits_amount, now());
  
  -- Auto-promote admin if email matches
  IF NEW.email = 'malo.michel84@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  
  -- Add default user role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;