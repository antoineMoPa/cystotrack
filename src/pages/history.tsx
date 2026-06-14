import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, Card } from "../components/ui";
import { displayDate } from "../lib/date";
import { downloadCsv } from "../lib/csv";
import { fetchHistory } from "../lib/journal";

export function HistoryPage() {
  const query = useQuery({ queryKey: ["history"], queryFn: fetchHistory });
  if (query.isLoading) return <p>Chargement de l’historique…</p>;
  if (query.isError) return <p role="alert" className="text-destructive">Impossible de charger l’historique.</p>;
  const entries = query.data ?? [];
  const ingredientCount = (entry: typeof entries[number]) => entry.plates.reduce((sum, plate) => sum + plate.plate_ingredients.length, 0);
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Vos données</p><h1 className="font-display text-4xl font-bold tracking-[-0.04em] sm:text-6xl">Historique</h1></div>
      <Button disabled={!entries.length} onClick={() => downloadCsv(entries)}><Download className="mr-1 inline" size={18} /> Exporter CSV</Button>
    </div>
    {!entries.length ? <Card><p className="text-muted-foreground">Aucune journée enregistrée pour le moment.</p></Card> :
      <div className="overflow-hidden rounded-xl border border-border bg-card">{entries.map((entry) => <Link key={entry.id} to={`/journal/${entry.date}`} className="block border-b border-border last:border-b-0 transition hover:bg-muted/60">
        <div className="flex items-center justify-between gap-4 px-4 py-3"><div>
          <h2 className="font-bold capitalize">{displayDate(entry.date)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{entry.plates.length} plat{entry.plates.length === 1 ? "" : "s"} · {ingredientCount(entry)} ingrédient{ingredientCount(entry) === 1 ? "" : "s"} · Douleur: {entry.bladder_pain_morning ?? "–"} → {entry.bladder_pain_evening ?? "–"}</p>
        </div><span className="text-sm font-medium text-primary">Modifier</span></div>
      </Link>)}</div>}
  </div>;
}
