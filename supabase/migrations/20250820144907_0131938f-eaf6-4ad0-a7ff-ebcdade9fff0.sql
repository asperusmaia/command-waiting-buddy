-- Remover a política atual que permite acesso público total
DROP POLICY IF EXISTS "Permitir leitura pública na tabela nova" ON agendamentos_robustos;

-- Criar políticas seguras para agendamentos
-- 1. Política para permitir leitura apenas via edge functions (service role)
CREATE POLICY "Service role can read all appointments" 
ON agendamentos_robustos 
FOR SELECT 
TO service_role 
USING (true);

-- 2. Política para permitir inserção via edge functions
CREATE POLICY "Service role can insert appointments" 
ON agendamentos_robustos 
FOR INSERT 
TO service_role 
WITH CHECK (true);

-- 3. Política para permitir atualização via edge functions  
CREATE POLICY "Service role can update appointments" 
ON agendamentos_robustos 
FOR UPDATE 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 4. Política para permitir exclusão via edge functions
CREATE POLICY "Service role can delete appointments" 
ON agendamentos_robustos 
FOR DELETE 
TO service_role 
USING (true);

-- 5. Bloquear acesso público direto à tabela
-- Remover qualquer acesso público anônimo
REVOKE ALL ON agendamentos_robustos FROM anon;
REVOKE ALL ON agendamentos_robustos FROM authenticated;