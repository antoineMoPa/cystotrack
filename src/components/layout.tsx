import { BookOpen, CalendarDays, LogOut } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { localDate } from "../lib/date";
import { cn } from "../lib/utils";

export function Layout() {
  const links = [
    { to: `/journal/${localDate()}`, label: "Aujourd’hui", icon: BookOpen },
    { to: "/history", label: "Historique", icon: CalendarDays }
  ];
  return <div className="min-h-screen">
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <NavLink to={links[0].to} className="text-xl font-bold tracking-tight text-primary">CystoTrack</NavLink>
        <button aria-label="Se déconnecter" className="rounded-lg p-2 text-muted-foreground hover:bg-muted" onClick={() => supabase.auth.signOut()}><LogOut size={20} /></button>
      </div>
    </header>
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-6"><Outlet /></main>
    <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-white">
      <div className="mx-auto grid max-w-4xl grid-cols-2">
        {links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => cn("flex flex-col items-center gap-1 py-3 text-xs font-medium", isActive ? "text-primary" : "text-muted-foreground")}><Icon size={20} />{label}</NavLink>)}
      </div>
    </nav>
  </div>;
}
