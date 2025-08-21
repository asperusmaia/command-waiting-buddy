-- Fix RLS enabled but no policies on bd_ativo table
CREATE POLICY "Service role full access to bd_ativo" 
ON public.bd_ativo 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Fix RLS enabled but no policies on feriados table  
CREATE POLICY "Public can read feriados" 
ON public.feriados 
FOR SELECT 
USING (true);

CREATE POLICY "Service role full access to feriados" 
ON public.feriados 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);