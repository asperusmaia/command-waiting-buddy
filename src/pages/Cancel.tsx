import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import authBackground from "@/assets/auth-background.jpg";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
export default function Cancel() {
  const navigate = useNavigate();
  const [contact, setContact] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userBookings, setUserBookings] = useState<Agendamento[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Agendamento | null>(null);
  useEffect(() => {
    document.title = "Cancelar atendimento | ÁSPERUS";
  }, []);

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
  async function handleCancel() {
    if (!selectedBooking) {
      toast.warning("Selecione o agendamento que deseja cancelar.");
      return;
    }
    
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("cancel_booking", {
        body: {
          name: selectedBooking.NOME,
          contact: selectedBooking.CONTATO,
          date: selectedBooking.DATA,
          time: selectedBooking.HORA
        }
      });
      if (error) {
        console.error('Erro na edge function cancel_booking:', error);
        
        // Verificar se é erro de validação específico
        if (error.message?.includes("não encontrado")) {
          toast.error("Agendamento não encontrado. Verifique os dados informados.");
        } else {
          toast.error("Erro ao cancelar. Verifique os dados e tente novamente.");
        }
        return;
      }

      // Redirecionar para página de confirmação
      navigate("/cancel-confirmation", {
        state: {
          name: selectedBooking.NOME,
          contact: selectedBooking.CONTATO,
          date: selectedBooking.DATA,
          time: selectedBooking.HORA,
          message: data?.message
        }
      });
    } catch (e: any) {
      console.error('Erro completo ao cancelar:', e);
      toast.error("Erro ao cancelar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }
  return <div className="min-h-screen bg-cover bg-center bg-no-repeat relative" style={{
    backgroundImage: `url(${authBackground})`
  }}>
      <div className="absolute inset-0 bg-black/50"></div>
      
      <main className="container mx-auto px-6 py-8 relative z-10">
        <header className="mb-8 text-center relative">
          <Button variant="outline" className="absolute top-0 left-0 flex items-center gap-2" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="font-bold text-3xl text-red-600">Cancelar Atendimento</h1>
          <p className="text-slate-50">Informe os dados do agendamento que deseja cancelar</p>
        </header>

        <div className="max-w-4xl mx-auto">
          {/* Buscar agendamentos */}
          <Card className="mb-6 bg-card/95 backdrop-blur-sm border-destructive/20">
            <CardHeader>
              <CardTitle className="text-center text-red-600">Buscar Agendamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="contact">Contato (Telefone)</Label>
                <Input 
                  id="contact" 
                  value={contact} 
                  onChange={e => setContact(e.target.value)} 
                  placeholder="Digite seu telefone para buscar agendamentos" 
                  className="border-destructive/40" 
                  disabled={isLoading} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Agendamentos encontrados */}
          {contact && (
            <Card className="mb-6 bg-card/95 backdrop-blur-sm border-destructive/20">
              <CardHeader>
                <CardTitle className="text-red-600">Seus Agendamentos</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Selecione o agendamento que deseja cancelar
                </p>
              </CardHeader>
              <CardContent>
                {loadingBookings ? (
                  <p className="text-sm text-muted-foreground">Buscando agendamentos...</p>
                ) : userBookings.length > 0 ? (
                  <div className="grid gap-3">
                    {userBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className={cn(
                          "p-4 border rounded-lg cursor-pointer transition-colors",
                          selectedBooking?.id === booking.id
                            ? "border-destructive bg-destructive/10"
                            : "border-border hover:border-destructive/50"
                        )}
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="font-medium text-red-600">Nome:</span>
                            <p>{booking.NOME}</p>
                          </div>
                          <div>
                            <span className="font-medium text-red-600">Data:</span>
                            <p>{format(new Date(booking.DATA), "dd/MM/yyyy", { locale: ptBR })}</p>
                          </div>
                          <div>
                            <span className="font-medium text-red-600">Horário:</span>
                            <p>{booking.HORA}</p>
                          </div>
                          <div>
                            <span className="font-medium text-red-600">Profissional:</span>
                            <p>{booking.PROFISSIONAL || "Não especificado"}</p>
                          </div>
                        </div>
                        {booking.servico && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium text-red-600">Serviço:</span>
                            <p>{booking.servico}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {contact ? "Nenhum agendamento futuro encontrado para este contato." : "Digite seu contato para buscar agendamentos."}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Botão cancelar */}
          <Card className="bg-card/95 backdrop-blur-sm border-destructive/20">
            <CardContent className="pt-6">
              <Button 
                onClick={handleCancel} 
                disabled={!selectedBooking || isLoading} 
                className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xl font-bold"
              >
                {isLoading ? "CANCELANDO..." : "CANCELAR AGENDAMENTO"}
              </Button>
              
              {!selectedBooking && contact && userBookings.length > 0 && (
                <p className="mt-2 text-sm text-muted-foreground text-center">
                  Selecione um agendamento para cancelar
                </p>
              )}
              
              {selectedBooking && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Você está prestes a cancelar o agendamento de <strong>{selectedBooking.NOME}</strong> 
                  para <strong>{format(new Date(selectedBooking.DATA), "dd/MM/yyyy", { locale: ptBR })}</strong> 
                  às <strong>{selectedBooking.HORA}</strong>.
                  Esta ação não pode ser desfeita.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>;
}