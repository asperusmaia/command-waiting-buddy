-- Fix security definer view and enable required extensions

-- Enable pgcrypto extension for digest function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop the existing problematic view
DROP VIEW IF EXISTS public.store_info_public;

-- Remove public access policies from sensitive tables
DROP POLICY IF EXISTS "cadastro_agendamento" ON public.cadastro;
DROP POLICY IF EXISTS "Public can read feriados" ON public.feriados;

-- Create a secure function to get store info instead of using a view
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
        i.opening_time,
        i.closing_time,
        i.slot_interval_minutes,
        i.address,
        i.maps_url
    FROM public.info_loja i
    LIMIT 1;
$function$;

-- Grant access to the function for public users
GRANT EXECUTE ON FUNCTION public.get_store_info() TO anon;
GRANT EXECUTE ON FUNCTION public.get_store_info() TO authenticated;

-- Create secure RLS policy for feriados (holidays)
CREATE POLICY "Public can read holidays"
ON public.feriados
FOR SELECT
TO public
USING (true);

-- Fix existing functions with proper search path
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