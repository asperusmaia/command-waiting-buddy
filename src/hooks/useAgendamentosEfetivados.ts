import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

export const useAgendamentosEfetivados = () => {
  // Garantir que pegamos a data local, não UTC
  const hoje = new Date();
  const year = hoje.getFullYear();
  const month = String(hoje.getMonth() + 1).padStart(2, '0');
  const day = String(hoje.getDate()).padStart(2, '0');
  const dataHoje = `${year}-${month}-${day}`;

  const [data, setData] = useState<{ efetivados: number; agendamentos: any[] }>({ efetivados: 0, agendamentos: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Carregamento inicial dos dados
    const fetchAgendamentosEfetivados = async () => {
      try {
        setIsLoading(true);
        const { data: agendamentos, error } = await supabase
          .from('agendamentos_robustos')
          .select('*')
          .eq('DATA', dataHoje)
          .eq('status_final', 'EFETIVADO');

        if (error) {
          throw error;
        }

        setData({
          efetivados: agendamentos?.length || 0,
          agendamentos: agendamentos || []
        });
        setError(null);
      } catch (err: any) {
        console.error('Error fetching agendamentos efetivados:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgendamentosEfetivados();

    // Configuração do Realtime para atualizações
    const channel = supabase
      .channel('agendamentos-efetivados-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agendamentos_robustos'
        },
        (payload) => {
          // Recarregar apenas se a mudança afeta agendamentos do dia atual
          const newData = payload.new as any;
          const oldData = payload.old as any;
          const isToday = newData?.DATA === dataHoje || oldData?.DATA === dataHoje;
          if (isToday) {
            fetchAgendamentosEfetivados();
          }
        }
      )
      .subscribe();

    // Limpeza da assinatura
    return () => {
      supabase.removeChannel(channel);
    };
  }, [dataHoje]);

  return { data, isLoading, error };
};