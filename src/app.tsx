import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "./lib/supabase";
import { localDate } from "./lib/date";
import { Layout } from "./components/layout";
import { LoginPage } from "./pages/login";
import { JournalPage } from "./pages/journal";
import { HistoryPage } from "./pages/history";

const queryClient = new QueryClient();

function Authenticated({ session }: { session: Session | null }) {
  return session ? <Layout /> : <Navigate to="/login" replace />;
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);
  if (!ready) return <main className="p-6">Chargement…</main>;
  const router = createBrowserRouter([
    { path: "/login", element: <LoginPage session={session} /> },
    { path: "/", element: <Authenticated session={session} />, children: [
      { index: true, element: <Navigate to={`/journal/${localDate()}`} replace /> },
      { path: "journal/:date", element: <JournalPage /> },
      { path: "history", element: <HistoryPage /> }
    ]},
    { path: "*", element: <Navigate to="/" replace /> }
  ]);
  return <QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>;
}
