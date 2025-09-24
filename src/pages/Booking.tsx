
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import authBackground from "@/assets/auth-background.jpg";
import ConsultaAgendamentos from "@/components/ConsultaAgendamentos";

interface LojaConfig {
  opening_time?: string;
  closing_time?: string;
  slot_interval_minutes?: number;
  nome_profissionais?: string;
  escolha_serviços?: string;
  instructions?: string;
}

export default function Booking() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<LojaConfig | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [professional, setProfessional] = useState<string>("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [slotsByDate, setSlotsByDate] = useState<Record<string, string[]>>({});
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [pros, setPros] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [service, setService] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    document.title = "Agendar atendimento | ÁSPERUS";
  }, []);

  // Carregar configuração
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("info_loja").select("*").limit(1).maybeSingle();
      if (error) {
        console.error(error);
        toast.error("Não foi possível carregar as configurações.");
        return;
      }
      setConfig(data || {});
    })();
  }, []);

  // Carregar profissionais e serviços de todas as linhas da tabela
  useEffect(() => {
    const loadProfissionaisEServicos = async () => {
      try {
        const { data, error } = await supabase.from("info_loja").select("nome_profissionais, escolha_serviços");
        if (error) {
          console.error("Erro ao carregar profissionais e serviços:", error);
          return;
        }

        // Combinar todos os profissionais de todas as linhas
        const allProfissionais = data?.map((row: any) => row.nome_profissionais || "").join(";").split(/[;,\n]/).map(s => s.trim()).filter(Boolean) || [];

        // Combinar todos os serviços de todas as linhas
        const allServicos = data?.map((row: any) => row.escolha_serviços || "").join(";").split(/[;,\n]/).map(s => s.trim()).filter(Boolean) || [];
        setPros([...new Set(allProfissionais)]); // Remove duplicatas
        setServices([...new Set(allServicos)]); // Remove duplicatas

        console.log("Profissionais carregados:", allProfissionais);
        console.log("Serviços carregados:", allServicos);
      } catch (err) {
        console.error("Erro ao buscar profissionais e serviços:", err);
      }
    };
    loadProfissionaisEServicos();
  }, []);

  const dateStr = useMemo(() => {
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [date]);

  // Gerar próximas 6 datas a partir do dia atual (Brasil timezone) - excluindo domingos
  const nextSixDates = useMemo(() => {
    const arr: string[] = [];
    
    // Obter data atual do Brasil usando toLocaleString
    const brazilTime = new Date().toLocaleString("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit", 
      day: "2-digit"
    }).split('T')[0]; // Formato YYYY-MM-DD
    
    // Converter para objeto Date baseado na data local do Brasil
    const [year, month, day] = brazilTime.split('-').map(Number);
    const today = new Date(year, month - 1, day); // month é 0-indexed
    
    let i = 0;
    while (arr.length < 6) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      
      // Pular domingos (0 = domingo)
      if (targetDate.getDay() !== 0) {
        const y = targetDate.getFullYear();
        const m = String(targetDate.getMonth() + 1).padStart(2, "0");
        const d = String(targetDate.getDate()).padStart(2, "0");
        arr.push(`${y}-${m}-${d}`);
      }
      i++;
    }
    
    console.log('Data Brasil hoje:', brazilTime);
    console.log('Datas geradas (sem domingos):', arr);
    return arr;
  }, []);

  async function fetchSlotsFor(dStr: string) {
    console.log('Buscando slots para:', {
      date: dStr,
      professional
    });
    try {
      const { data, error } = await supabase.functions.invoke("get_available_slots", {
        body: {
          date: dStr,
          professional: professional || undefined
        }
      });
      if (error) {
        console.error('Erro detalhado ao buscar slots:', error);
        throw error;
      }
      console.log('Slots retornados para', dStr, ':', data);
      return data?.slots as string[] || [];
    } catch (err) {
      console.error('Erro na função fetchSlotsFor:', err);
      return [];
    }
  }

  async function fetchAllSlots() {
    if (!config) {
      console.log('Não buscando slots - configuração não carregada');
      return;
    }
    console.log('Iniciando busca de slots para as datas:', nextSixDates);
    console.log('Profissional selecionado:', professional);
    setLoadingSlots(true);
    try {
      const results: [string, string[]][] = await Promise.all(nextSixDates.map(async (d): Promise<[string, string[]]> => {
        try {
          const s = await fetchSlotsFor(d);
          console.log(`Slots para ${d}:`, s);
          return [d, s];
        } catch (error) {
          console.error('Erro ao buscar slots para data', d, ':', error);
          return [d, [] as string[]];
        }
      }));
      const map: Record<string, string[]> = {};
      results.forEach(([d, s]) => {
        map[d] = s;
      });
      console.log('Mapa final de slots:', map);
      setSlotsByDate(map);
    } catch (e: any) {
      console.error('Erro geral ao buscar slots:', e);
      toast.error("Erro ao buscar horários disponíveis.");
    } finally {
      setLoadingSlots(false);
    }
  }

  // Atualização automática ao mudar data/profissional
  useEffect(() => {
    if (!config) return;
    console.log('useEffect disparado - fetchAllSlots');
    fetchAllSlots();
  }, [config, professional]);

  // Realtime para atualizar slots quando houver mudanças 
  useEffect(() => {
    if (!config) return;
    const channel = supabase.channel("booking-slots").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "agendamentos_robustos"
    }, () => fetchAllSlots()).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [config, professional]);

  async function handleBook() {
    if (!name || !contact) {
      toast.warning("Preencha nome e contato.");
      return;
    }
    if (!professional) {
      toast.warning("Selecione um profissional.");
      return;
    }
    if (!service) {
      toast.warning("Selecione um serviço.");
      return;
    }
    if (!selectedSlot || !selectedDateStr) {
      toast.warning("Escolha um horário disponível.");
      return;
    }
    try {
      console.log('Dados do agendamento:', {
        date: selectedDateStr,
        time: selectedSlot,
        name,
        contact,
        professional,
        service
      });
      const { data, error } = await supabase.functions.invoke("book_slot", {
        body: {
          date: selectedDateStr,
          time: selectedSlot,
          name,
          contact,
          professional,
          service
        }
      });
      if (error) {
        console.error('Erro na edge function book_slot:', error);
        throw error;
      }
      console.log('Agendamento criado com sucesso:', data);

      // Redirecionar para página de confirmação
      navigate("/booking-confirmation", {
        state: {
          date: selectedDateStr,
          time: selectedSlot,
          name,
          contact,
          professional,
          service,
          senha: data?.booking?.senha
        }
      });
    } catch (e: any) {
      console.error('Erro completo ao agendar:', e);
      const msg = e?.message || "Erro ao confirmar agendamento.";
      toast.error(msg.includes("duplicate") ? "Horário indisponível." : msg);
    }
  }

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat relative" style={{
      backgroundImage: `url(${authBackground})`
    }}>
      {/* Overlay escuro para melhor legibilidade */}
      <div className="absolute inset-0 bg-black/50"></div>
      
      <main className="container mx-auto px-6 py-8 relative z-10">
        <header className="mb-8 text-center relative">
          {/* Botões superiores com layout responsivo */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 sm:mb-8">
            <div className="flex gap-2 order-2 sm:order-1">
              <Button 
                onClick={() => navigate("/cancel")} 
                className="text-slate-50 bg-red-600 hover:bg-red-500 text-xs sm:text-sm px-3 sm:px-4"
              >
                CANCELAR
              </Button>
              <Button 
                onClick={() => navigate("/reschedule")} 
                className="bg-warning hover:bg-warning/90 text-slate-50 text-xs sm:text-sm px-3 sm:px-4"
              >
                REAGENDAR
              </Button>
            </div>
            <div className="order-1 sm:order-2">
              <Button 
                variant="outline" 
                onClick={() => navigate("/auth")}
                className="text-xs sm:text-sm px-3 sm:px-4"
              >
                ACESSO ADM
              </Button>
            </div>
          </div>
          
          {/* Título responsivo */}
          <div className="space-y-2">
            <h1 className="font-bold text-primary text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
              Agendar Atendimento
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Informe Seus Dados para Agendamento
            </p>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Data */}
          <Card>
            <CardHeader>
              <CardTitle>Data</CardTitle>
            </CardHeader>
            <CardContent>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon />
                    {date ? format(date, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={newDate => {
                    setDate(newDate);
                    setIsDatePickerOpen(false); // Fechar calendário após seleção
                  }} initialFocus className={cn("p-3 pointer-events-auto [&_.rdp-head]:hidden [&_.rdp-weekdays]:hidden")} />
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          {/* Profissional (opcional) */}
          <Card>
            <CardHeader>
              <CardTitle>Profissional</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={professional || undefined} onValueChange={setProfessional}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  {pros.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Serviço (obrigatório) */}
          <Card>
            <CardHeader>
              <CardTitle>Serviço</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={service || undefined} onValueChange={setService}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Grid com Profissional/Serviços e Consulta de Agendamentos */}
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          {/* Consulta de Agendamentos */}
          <ConsultaAgendamentos />
        </div>

        {/* Horários */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Horários Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            {!config ? <p className="text-sm text-muted-foreground">Carregando configurações...</p> : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {nextSixDates.map(d => (
                  <div key={d} className="space-y-2">
                     <div className="text-sm font-medium mx-[5px] my-[5px] py-[5px] px-[5px] rounded-sm">
                      {format(new Date(d + 'T12:00:00'), "PPP", { locale: ptBR })}
                    </div>
                    {loadingSlots ? (
                      <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-9 rounded-md bg-muted animate-pulse" />
                        ))}
                      </div>
                    ) : slotsByDate[d]?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {slotsByDate[d].map(s => {
                          const isSelected = selectedSlot === s && selectedDateStr === d;
                          return (
                            <Button
                              key={s}
                              variant={isSelected ? "default" : "secondary"}
                              onClick={() => {
                                setSelectedSlot(s);
                                setSelectedDateStr(d);
                              }}
                              size="sm"
                              className="mx-[4px] my-[4px] py-[4px] px-[4px] font-semibold text-base"
                            >
                              {s}
                            </Button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum horário disponível.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dados do cliente */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Seus Dados</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="mx-[12px] my-[12px] py-[12px] px-[12px]">Nome</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact" className="mx-[12px] my-[12px] py-[12px] px-[12px]">Contato</Label>
              <Input id="contact" value={contact} onChange={e => setContact(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Button
                onClick={handleBook}
                disabled={!selectedSlot || !selectedDateStr || !name || !contact || !professional || !service}
                className="w-full text-slate-50 text-xl font-bold"
              >
                AGENDAR
              </Button>
              {!selectedSlot && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Confirme e seja redirecionado(a) a confirmação de seu agendamento
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Confirmação */}
        {booking && (
          <Card className="mt-6 border-primary/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <CheckCircle2 /> Agendamento confirmado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                {format(new Date(booking.DATA), "PPP", { locale: ptBR })} às {String(booking.HORA).slice(0, 5)}
                {booking.PROFISSIONAL ? ` com ${booking.PROFISSIONAL}` : ""}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
