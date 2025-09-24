
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const { date, time, name, contact, professional, service } = body ?? {};

    if (!date || !time || !name || !contact || !professional || !service) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: data, horário, nome, contato, profissional e serviço" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verificar se não é feriado
    const { data: feriado, error: feriadoErr } = await supabase
      .from("feriados")
      .select("data")
      .eq("data", date)
      .maybeSingle();
    if (feriadoErr) throw feriadoErr;
    if (feriado) {
      return new Response(JSON.stringify({ error: "Não é possível agendar para feriados." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verificar se o horário está disponível
    const { data: conflicts, error: conflictError } = await supabase
      .from("agendamentos_robustos")
      .select("id")
      .eq("DATA", date)
      .eq("HORA", time)
      .eq("PROFISSIONAL", professional)
      .neq("STATUS", "CANCELADO");

    if (conflictError) throw conflictError;

    if (conflicts && conflicts.length > 0) {
      return new Response(JSON.stringify({ error: "Horário não disponível" }), {
        status: 409,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Gerar senha de 4 dígitos alfanuméricos
    const generatePassword = () => {
      const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let result = '';
      for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    
    const senha = generatePassword();

    // Usar timezone correto do Brasil para inserção
    const now = new Date();
    const brazilTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    
    // Criar agendamento
    const { data: booking, error: bookingError } = await supabase
      .from("agendamentos_robustos")
      .insert({
        DATA: date,
        HORA: time,
        NOME: name,
        CONTATO: contact,
        PROFISSIONAL: professional,
        servico: service,
        STATUS: "AGENDADO",
        senha: senha,
        created_at: brazilTime.toISOString()
      })
      .select("*")
      .maybeSingle();

    if (bookingError) {
      console.error('Erro ao criar agendamento:', bookingError);
      throw bookingError;
    }

    console.log('Agendamento criado com sucesso:', booking);

    return new Response(JSON.stringify({ booking }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("book_slot error", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
