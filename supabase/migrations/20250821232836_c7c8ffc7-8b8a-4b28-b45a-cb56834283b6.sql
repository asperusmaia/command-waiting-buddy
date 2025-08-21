-- Remove the overly permissive policy that allows public access to all customer data
DROP POLICY IF EXISTS "cadastro_agendamento" ON public.cadastro;

-- Add a user_id column to link records to authenticated users
-- We'll make it nullable initially to not break existing data
ALTER TABLE public.cadastro 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create secure RLS policies that only allow users to access their own data

-- Users can only view their own cadastro records
CREATE POLICY "Users can view own cadastro" 
ON public.cadastro 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can only insert their own cadastro records
CREATE POLICY "Users can insert own cadastro" 
ON public.cadastro 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own cadastro records
CREATE POLICY "Users can update own cadastro" 
ON public.cadastro 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own cadastro records
CREATE POLICY "Users can delete own cadastro" 
ON public.cadastro 
FOR DELETE 
USING (auth.uid() = user_id);

-- Service role maintains full access for admin operations
CREATE POLICY "Service role full access to cadastro" 
ON public.cadastro 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);