import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { dayEntrySchema, emptyDayEntry, fetchDay, saveDay, type DayEntryForm } from "../lib/journal";
import { displayDate, localDate } from "../lib/date";
import { Button, Card, Field, Select, Textarea } from "../components/ui";
import { FoodEditor } from "../components/food-editor";

const scoreOptions = Array.from({ length: 11 }, (_, value) => ({ value, label: String(value) }));
const sleepOptions = Array.from({ length: 49 }, (_, index) => {
  const value = index / 2;
  return { value, label: `${value.toLocaleString("fr-CA")} h` };
});
const hydrationOptions = Array.from({ length: 11 }, (_, index) => {
  const value = index * 500;
  return { value, label: `${(value / 1000).toLocaleString("fr-CA", { maximumFractionDigits: 2 })} L` };
});

const numericFields = [
  ["bladderPainMorning", "Douleur au réveil", "0 = aucune douleur, 10 = douleur maximale", scoreOptions],
  ["bladderPainEvening", "Douleur au coucher", "0 = aucune douleur, 10 = douleur maximale", scoreOptions],
  ["perceivedStress", "Stress ressenti", "État émotionnel général", scoreOptions],
  ["externalStress", "Stress externe", "Intensité des événements externes", scoreOptions],
  ["sleepHours", "Sommeil", "Heures dormies la nuit précédente", sleepOptions],
  ["hydrationMl", "Hydratation", "Quantité totale en litres", hydrationOptions]
] as const;

export function JournalPage() {
  const { date } = useParams();
  const queryClient = useQueryClient();
  const validDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const query = useQuery({
    queryKey: ["day", date],
    queryFn: async ({ signal }) => {
      const timeoutController = new AbortController();
      const timeoutId = window.setTimeout(() => timeoutController.abort(), 10_000);
      const combinedSignal = AbortSignal.any([signal, timeoutController.signal]);
      try {
        return await fetchDay(date!, combinedSignal);
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    enabled: Boolean(validDate),
    retry: false
  });
  const form = useForm<DayEntryForm>({ resolver: zodResolver(dayEntrySchema), defaultValues: emptyDayEntry });
  useEffect(() => { if (query.data) form.reset(query.data); }, [query.data, form]);
  const mutation = useMutation({
    mutationFn: (value: DayEntryForm) => saveDay(date!, value),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["day", date] }); queryClient.invalidateQueries({ queryKey: ["history"] }); }
  });
  if (!validDate) return <Navigate to={`/journal/${localDate()}`} replace />;
  if (query.isLoading) return <p>Chargement du journal…</p>;
  if (query.isError) return <p role="alert" className="text-destructive">Impossible de charger cette journée.</p>;

  return <form className="space-y-5" onSubmit={form.handleSubmit((value) => mutation.mutate(value))}>
    <div><p className="text-sm font-semibold uppercase tracking-widest text-primary">Journal quotidien</p><h1 className="text-3xl font-bold capitalize">{displayDate(date!)}</h1></div>
    <Card><h2 className="mb-4 text-xl font-bold">Symptômes et facteurs</h2>
      <div className="grid gap-5 sm:grid-cols-2">{numericFields.map(([name, label, hint, options]) =>
        <Controller key={name} control={form.control} name={name} render={({ field, fieldState }) => <Field label={label} hint={fieldState.error?.message ?? hint}>
          <Select value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value === "" ? null : Number(event.target.value))} aria-invalid={Boolean(fieldState.error)}>
            <option value="">Non renseigné</option>
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </Field>} />)}
      </div>
    </Card>
    <Card><h2 className="mb-4 text-xl font-bold">Aliments consommés</h2>
      <Controller control={form.control} name="consumptions" render={({ field }) => <FoodEditor value={field.value} onChange={field.onChange} />} />
    </Card>
    <Card><Controller control={form.control} name="notes" render={({ field }) => <Field label="Notes (facultatif)"><Textarea rows={4} placeholder="Contexte, symptômes particuliers…" {...field} /></Field>} /></Card>
    {mutation.isError && <p role="alert" className="text-destructive">L’enregistrement a échoué. Vos données sont toujours dans le formulaire.</p>}
    {mutation.isSuccess && <p role="status" className="flex items-center gap-2 text-primary"><CheckCircle2 size={18} /> Journée enregistrée.</p>}
    <Button className="w-full sm:w-auto" disabled={mutation.isPending}>{mutation.isPending ? "Enregistrement…" : "Enregistrer"}</Button>
  </form>;
}
