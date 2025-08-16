
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { Dashboard } from "@/pages/Dashboard";
import Auth from "@/pages/Auth";
import Booking from "@/pages/Booking";
import BookingConfirmation from "@/pages/BookingConfirmation";
import Reschedule from "@/pages/Reschedule";
import RescheduleConfirmation from "@/pages/RescheduleConfirmation";
import Cancel from "@/pages/Cancel";
import CancelConfirmation from "@/pages/CancelConfirmation";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from '@supabase/supabase-js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  
  useEffect(() => {
    console.log("App component mounted - GitHub Pages optimized");
    console.log("Location:", window.location.href);
    
    // Aplicar tema escuro
    document.documentElement.classList.add('dark');

    // Configurar autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Para GitHub Pages, sempre usar HashRouter
  const RouterComponent = Router;

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Carregando Dashboard ASPERUS...</p>
        </div>
      </div>
    );
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <RouterComponent>
        <div className="min-h-screen dark">
          <Routes>
            <Route path="/" element={<Booking />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/booking-confirmation" element={<BookingConfirmation />} />
            <Route path="/reschedule" element={<Reschedule />} />
            <Route path="/reschedule-confirmation" element={<RescheduleConfirmation />} />
            <Route path="/cancel" element={<Cancel />} />
            <Route path="/cancel-confirmation" element={<CancelConfirmation />} />
            <Route path="*" element={<Booking />} />
          </Routes>
        </div>
        <Toaster position="top-right" theme="dark" />
      </RouterComponent>
    </QueryClientProvider>
  );
};

export default App;
