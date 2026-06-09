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
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-sm font-semibold uppercase tracking-widest text-primary">Vos données</p><h1 className="text-3xl font-bold">Historique</h1></div>
      <Button disabled={!entries.length} onClick={() => downloadCsv(entries)}><Download className="mr-1 inline" size={18} /> Exporter CSV</Button>
    </div>
    {!entries.length ? <Card><p className="text-muted-foreground">Aucune journée enregistrée pour le moment.</p></Card> :
      <div className="space-y-3">{entries.map((entry) => <Link key={entry.id} to={`/journal/${entry.date}`} className="block">
        <Card className="transition hover:border-primary"><div className="flex items-center justify-between gap-4"><div>
          <h2 className="font-bold capitalize">{displayDate(entry.date)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{entry.food_consumptions.length} aliment{entry.food_consumptions.length === 1 ? "" : "s"} · Douleur: {entry.bladder_pain_morning ?? "–"} → {entry.bladder_pain_evening ?? "–"}</p>
        </div><span className="text-primary">Modifier</span></div></Card>
      </Link>)}</div>}
  </div>;
}

