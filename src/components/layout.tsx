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
    <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <NavLink to={links[0].to} className="font-display text-xl font-bold tracking-[-0.04em] text-foreground">CystoTrack</NavLink>
        <nav className="hidden items-center gap-1 sm:flex">
          {links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition hover:bg-muted", isActive ? "text-primary" : "text-muted-foreground")}><Icon size={16} />{label}</NavLink>)}
        </nav>
        <button aria-label="Se déconnecter" className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground" onClick={() => supabase.auth.signOut()}><LogOut size={20} /></button>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-6 pb-24 pt-8 sm:pb-12 lg:pt-12"><Outlet /></main>
    <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-card/90 backdrop-blur sm:hidden">
      <div className="mx-auto grid max-w-7xl grid-cols-2">
        {links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => cn("flex flex-col items-center gap-1 py-3 text-xs font-medium", isActive ? "text-primary" : "text-muted-foreground")}><Icon size={20} />{label}</NavLink>)}
      </div>
    </nav>
  </div>;
}
