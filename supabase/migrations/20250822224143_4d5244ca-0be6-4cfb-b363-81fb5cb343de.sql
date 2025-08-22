-- Fix function search path issues by setting search_path
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT encode(digest(password || 'booking_salt_2024', 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Check if there are any other security definer views we need to address
-- This query helps identify any remaining security definer objects
DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Check for any views with security definer
    FOR rec IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public' 
          AND definition ILIKE '%security definer%'
    LOOP
        RAISE NOTICE 'Found security definer view: %.%', rec.schemaname, rec.viewname;
    END LOOP;
END $$;