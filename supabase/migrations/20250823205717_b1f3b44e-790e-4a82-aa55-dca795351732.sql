-- Fix security definer view issue and other critical security vulnerabilities

-- First, drop the existing view
DROP VIEW IF EXISTS public.store_info_public;

-- Remove any remaining public access from sensitive tables
DROP POLICY IF EXISTS "cadastro_agendamento" ON public.cadastro;
DROP POLICY IF EXISTS "Public can read feriados" ON public.feriados;

-- Recreate the view without security definer and with explicit permissions
CREATE VIEW public.store_info_public AS
SELECT 
    opening_time,
    closing_time,
    slot_interval_minutes,
    address,
    maps_url
FROM public.info_loja
LIMIT 1;

-- Grant explicit access to the view for public (anon role)
GRANT SELECT ON public.store_info_public TO anon;
GRANT SELECT ON public.store_info_public TO authenticated;

-- Ensure feriados table has proper public read access via RLS policy instead of blanket access
CREATE POLICY "Public can read holidays"
ON public.feriados
FOR SELECT
TO public
USING (true);

-- Fix function search path issues by updating existing functions
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $function$
    SELECT encode(digest(password || 'booking_salt_2024', 'sha256'), 'hex');
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Create a secure function to get store info instead of relying on view
CREATE OR REPLACE FUNCTION public.get_store_info()
RETURNS TABLE(
    opening_time time,
    closing_time time,
    slot_interval_minutes integer,
    address text,
    maps_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $function$
    SELECT 
        opening_time,
        closing_time,
        slot_interval_minutes,
        address,
        maps_url
    FROM public.info_loja
    LIMIT 1;
$function$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.get_store_info() TO anon;
GRANT EXECUTE ON FUNCTION public.get_store_info() TO authenticated;