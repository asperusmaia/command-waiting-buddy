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
    const { contact, senha } = body ?? {};

    if (!contact || !senha) {
      return new Response(JSON.stringify({ error: "Contato e senha são obrigatórios" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('Buscando agendamentos para contato:', contact);

    // Data e hora atual do Brasil (Rio de Janeiro)
    const now = new Date();
    const brazilOffset = -3; // UTC-3 (horário de Brasília)
    const brazilTime = new Date(now.getTime() + (brazilOffset * 60 * 60 * 1000));
    const todayStr = brazilTime.toISOString().split('T')[0];
    const currentTime = brazilTime.toTimeString().slice(0, 5); // HH:MM

    console.log('Data atual Brasil:', todayStr, 'Hora atual Brasil:', currentTime);

    // Buscar agendamentos do contato (excluindo cancelados)
    const { data, error } = await supabase
      .from("agendamentos_robustos")
      .select("*")
      .eq("CONTATO", contact)
      .neq("STATUS", "CANCELADO")
      .gte("DATA", todayStr)
      .order("DATA", { ascending: true })
      .order("HORA", { ascending: true });

    if (error) {
      console.error('Erro ao buscar agendamentos:', error);
      throw error;
    }

    // Filtrar agendamentos válidos com base na senha da coluna 'senha'
    const validBookings = (data || []).filter((booking: any) => {
      const isValidPassword = senha === booking.senha;
      
      if (!isValidPassword) return false;
      
      // Se for hoje, verificar se o horário ainda não passou
      if (booking.DATA === todayStr) {
        return booking.HORA > currentTime;
      }
      
      // Se for data futura, incluir
      return booking.DATA > todayStr;
    });

    console.log('Agendamentos válidos encontrados:', validBookings.length);

    return new Response(JSON.stringify({ 
      bookings: validBookings 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("query_bookings error", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});