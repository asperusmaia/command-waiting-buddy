-- Adicionar coluna status_final na tabela agendamentos_robustos
ALTER TABLE public.agendamentos_robustos 
ADD COLUMN status_final TEXT DEFAULT NULL;

-- Adicionar comentário para documentar a coluna
COMMENT ON COLUMN public.agendamentos_robustos.status_final IS 'Status final do agendamento definido pelo administrador: EFETIVADO ou NÃO EFETIVADO';