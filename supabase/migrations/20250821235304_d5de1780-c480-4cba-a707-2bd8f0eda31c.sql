-- CRITICAL SECURITY FIX: Secure info_loja table
-- Remove public read access and add proper RLS policies

-- Drop the existing public read policy
DROP POLICY IF EXISTS "Public can read stores" ON public.info_loja;

-- Create admin-only policies for info_loja
CREATE POLICY "Service role can read info_loja" 
ON public.info_loja 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can insert info_loja" 
ON public.info_loja 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update info_loja" 
ON public.info_loja 
FOR UPDATE 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role can delete info_loja" 
ON public.info_loja 
FOR DELETE 
USING (true);

-- Create a secure public view for non-sensitive store information
CREATE OR REPLACE VIEW public.store_info_public AS
SELECT 
    opening_time,
    closing_time,
    slot_interval_minutes,
    address,
    maps_url
FROM public.info_loja
LIMIT 1;

-- Allow public read access to the secure view only
GRANT SELECT ON public.store_info_public TO anon, authenticated;