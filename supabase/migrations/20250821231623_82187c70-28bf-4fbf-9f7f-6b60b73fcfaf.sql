-- Limpar agendamentos com datas passadas (antes de hoje 20/08/2025)
DELETE FROM agendamentos_robustos 
WHERE "DATA" < '2025-08-20';