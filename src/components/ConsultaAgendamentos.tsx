import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Agendamento {
  id: string;
  NOME: string;
  CONTATO: string;
  DATA: string;
  HORA: string;
  PROFISSIONAL: string;
  servico: string;
  STATUS: string;
}

export default function ConsultaAgendamentos() {
  const [contact, setContact] = useState("");
  const [userBookings, setUserBookings] = useState<Agendamento[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Buscar agendamentos do usuário quando contato é preenchido
  useEffect(() => {
    const searchUserBookings = async () => {
      if (!contact) {
        setUserBookings([]);
        return;
      }

      setLoadingBookings(true);
      try {
        // Data atual do Brasil
        const now = new Date();
        const brazilOffset = -3;
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const brazilTime = new Date(utc + (brazilOffset * 3600000));
        const todayStr = brazilTime.toISOString().split('T')[0];

        const { data, error } = await supabase
          .from("agendamentos_robustos")
          .select("*")
          .eq("CONTATO", contact)
          .neq("STATUS", "CANCELADO")
          .gte("DATA", todayStr)
          .order("DATA", { ascending: true })
          .order("HORA", { ascending: true });

        if (error) {
          console.error("Erro ao buscar agendamentos:", error);
          return;
        }

        setUserBookings(data || []);
      } catch (err) {
        console.error("Erro na busca de agendamentos:", err);
      } finally {
        setLoadingBookings(false);
      }
    };

    searchUserBookings();
  }, [contact]);

  return (
    <Card className="border-green-500/20 bg-card/95 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-green-600">Consultar Agendamento</CardTitle>
        <p className="text-sm text-muted-foreground">
          Digite seu contato para consultar seus agendamentos
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="consultaContact">Contato (Telefone)</Label>
          <Input 
            id="consultaContact" 
            value={contact} 
            onChange={e => setContact(e.target.value)} 
            placeholder="Digite seu telefone" 
            className="border-green-500/40" 
          />
        </div>

        {/* Agendamentos encontrados */}
        {contact && (
          <div className="mt-4">
            {loadingBookings ? (
              <p className="text-sm text-muted-foreground">Buscando agendamentos...</p>
            ) : userBookings.length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium text-green-600">Seus Agendamentos:</h4>
                {userBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-3 border border-green-500/20 rounded-lg bg-green-500/5"
                  >
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium text-green-600">Nome:</span>
                        <p>{booking.NOME}</p>
                      </div>
                      <div>
                        <span className="font-medium text-green-600">Data:</span>
                        <p>{format(new Date(booking.DATA), "dd/MM/yyyy", { locale: ptBR })}</p>
                      </div>
                      <div>
                        <span className="font-medium text-green-600">Horário:</span>
                        <p>{booking.HORA}</p>
                      </div>
                      <div>
                        <span className="font-medium text-green-600">Profissional:</span>
                        <p>{booking.PROFISSIONAL || "Não especificado"}</p>
                      </div>
                    </div>
                    {booking.servico && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium text-green-600">Serviço:</span>
                        <p>{booking.servico}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {contact ? "Nenhum agendamento futuro encontrado para este contato." : ""}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}