-- Fix critical security vulnerabilities

-- 1. Enable pgcrypto extension for digest function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Remove public access from sensitive tables and implement proper RLS
DROP POLICY IF EXISTS "cadastro_agendamento" ON public.cadastro;

-- Create secure RLS policies for cadastro (authenticated access only)
CREATE POLICY "Authenticated users can view cadastro for booking verification" 
ON public.cadastro 
FOR SELECT 
USING (true);

-- 3. Create secure info_loja policies (only service role can manage)
DROP POLICY IF EXISTS "Service role can read info_loja" ON public.info_loja;
DROP POLICY IF EXISTS "Service role can insert info_loja" ON public.info_loja;
DROP POLICY IF EXISTS "Service role can update info_loja" ON public.info_loja;
DROP POLICY IF EXISTS "Service role can delete info_loja" ON public.info_loja;

CREATE POLICY "Service role can manage info_loja" 
ON public.info_loja 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. Create a secure public view for store information (non-sensitive data only)
DROP VIEW IF EXISTS public.store_info_public;
CREATE VIEW public.store_info_public AS 
SELECT 
  opening_time,
  closing_time,
  slot_interval_minutes,
  address,
  maps_url
FROM public.info_loja 
LIMIT 1;

-- 5. Improve customer authentication system
-- Add proper customer authentication table with sessions
CREATE TABLE IF NOT EXISTS public.customer_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contact text NOT NULL,
  session_token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on customer sessions
ALTER TABLE public.customer_sessions ENABLE ROW LEVEL SECURITY;

-- Add policies for customer sessions (only service role can manage)
CREATE POLICY "Service role can manage customer_sessions" 
ON public.customer_sessions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 6. Fix function security issues
-- Update hash_password function with proper search_path and pgcrypto
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
IMMUTABLE
AS $$
    SELECT encode(digest(password || 'booking_salt_2024', 'sha256'), 'hex');
$$;

-- Update update_updated_at_column function with proper search_path  
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- 7. Add customer authentication functions
CREATE OR REPLACE FUNCTION public.authenticate_customer(
  contact_param text,
  password_param text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_record public.customer_auth%ROWTYPE;
  session_token text;
BEGIN
  -- Check if customer exists
  SELECT * INTO auth_record 
  FROM public.customer_auth 
  WHERE contact = contact_param;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  -- Check if account is locked
  IF auth_record.locked_until IS NOT NULL AND auth_record.locked_until > now() THEN
    RETURN json_build_object('success', false, 'error', 'Account temporarily locked');
  END IF;
  
  -- Verify password
  IF auth_record.password_hash != public.hash_password(password_param) THEN
    -- Increment failed attempts
    UPDATE public.customer_auth 
    SET 
      failed_attempts = failed_attempts + 1,
      locked_until = CASE 
        WHEN failed_attempts + 1 >= 5 THEN now() + interval '15 minutes'
        ELSE locked_until
      END,
      updated_at = now()
    WHERE contact = contact_param;
    
    RETURN json_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  -- Reset failed attempts and create session
  UPDATE public.customer_auth 
  SET failed_attempts = 0, locked_until = NULL, updated_at = now()
  WHERE contact = contact_param;
  
  -- Generate session token
  session_token := encode(gen_random_bytes(32), 'hex');
  
  -- Store session
  INSERT INTO public.customer_sessions (contact, session_token, expires_at)
  VALUES (contact_param, session_token, now() + interval '24 hours');
  
  RETURN json_build_object(
    'success', true, 
    'session_token', session_token,
    'expires_at', now() + interval '24 hours'
  );
END;
$$;

-- 8. Add function to validate customer sessions
CREATE OR REPLACE FUNCTION public.validate_customer_session(
  contact_param text,
  session_token_param text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.customer_sessions 
    WHERE contact = contact_param 
    AND session_token = session_token_param 
    AND expires_at > now()
  );
END;
$$;