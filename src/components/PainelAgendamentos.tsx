import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAgendamentosRealtime } from "@/hooks/useAgendamentosRealtime";
import { Calendar, Clock, User, Briefcase, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'AGENDADO':
      return <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">Agendado</Badge>;
    case 'REAGENDADO':
      return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30">Reagendado</Badge>;
    case 'CANCELADO':
      return <Badge className="bg-red-500/20 text-red-300 border-red-400/30">Cancelado</Badge>;
    default:
      return <Badge className="bg-gray-500/20 text-gray-300 border-gray-400/30">{status}</Badge>;
  }
};
const formatDate = (dateString: string) => {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};
const formatTime = (timeString: string) => {
  return timeString.slice(0, 5); // Remove segundos se existirem
};
export const PainelAgendamentos = () => {
  const { toast } = useToast();
  const {
    agendamentos,
    isLoading,
    error
  } = useAgendamentosRealtime();

  const handleStatusFinal = async (agendamentoId: string, statusFinal: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos_robustos')
        .update({ status_final: statusFinal })
        .eq('id', agendamentoId);

      if (error) {
        throw error;
      }

      toast({
        title: "Status atualizado",
        description: `Agendamento marcado como ${statusFinal.toLowerCase()}`,
      });
    } catch (error) {
      console.error('Erro ao atualizar status final:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do agendamento",
        variant: "destructive",
      });
    }
  };
  if (error) {
    return <div className="p-6">
        <h1 className="text-3xl font-bold text-primary mb-6">Acompanhamento de Agendamentos</h1>
        <div className="text-red-400 bg-red-500/10 border border-red-400/30 rounded-lg p-4">
          Erro ao carregar agendamentos: {error}
        </div>
      </div>;
  }
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-primary mb-6">Acompanhamento de Agendamentos</h1>
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando agendamentos...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {agendamentos?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum agendamento encontrado para hoje.</p>
          ) : (
            agendamentos?.map((agendamento) => (
              <Card key={agendamento.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-sm">{formatDate(agendamento.DATA)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-sm">{formatTime(agendamento.HORA)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{agendamento.NOME}</span>
                      </div>
                      {agendamento.PROFISSIONAL && (
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-primary" />
                          <span className="text-sm">{agendamento.PROFISSIONAL}</span>
                        </div>
                      )}
                    </div>
                    {getStatusBadge(agendamento.STATUS)}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Contato: {agendamento.CONTATO}
                    </div>
                    
                    {/* Botões de Status Final - apenas para agendamentos AGENDADO ou REAGENDADO */}
                    {(agendamento.STATUS === 'AGENDADO' || agendamento.STATUS === 'REAGENDADO') && !agendamento.status_final && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleStatusFinal(agendamento.id, 'EFETIVADO')}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 h-8"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          EFETIVADO
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleStatusFinal(agendamento.id, 'NÃO EFETIVADO')}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 h-8"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          N.E
                        </Button>
                      </div>
                    )}
                    
                    {/* Mostrar status final se já foi definido */}
                    {agendamento.status_final && (
                      <Badge 
                        className={
                          agendamento.status_final === 'EFETIVADO' 
                            ? "bg-green-500/20 text-green-300 border-green-400/30" 
                            : "bg-orange-500/20 text-orange-300 border-orange-400/30"
                        }
                      >
                        {agendamento.status_final}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};