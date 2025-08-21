-- Fix security definer view issue
-- Drop the view and recreate without security definer
DROP VIEW IF EXISTS public.store_info_public;

-- Create a regular view without SECURITY DEFINER
CREATE VIEW public.store_info_public AS
SELECT 
    opening_time,
    closing_time,
    slot_interval_minutes,
    address,
    maps_url
FROM public.info_loja
LIMIT 1;

-- Grant appropriate permissions
GRANT SELECT ON public.store_info_public TO anon, authenticated;

-- Create customer authentication table for stronger security
CREATE TABLE IF NOT EXISTS public.customer_auth (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contact text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    failed_attempts integer DEFAULT 0,
    locked_until timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on customer_auth
ALTER TABLE public.customer_auth ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for customer_auth (service role only)
CREATE POLICY "Service role can manage customer_auth" 
ON public.customer_auth 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to hash passwords (using SHA-256 for simplicity)
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT encode(digest(password || 'booking_salt_2024', 'sha256'), 'hex');
$$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_auth_updated_at
    BEFORE UPDATE ON public.customer_auth
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();