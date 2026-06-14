import { useEffect } from "react";
import { Controller, useForm, useFormState, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { dayEntrySchema, emptyDayEntry, fetchDay, saveDay, type DayEntryForm } from "../lib/journal";
import { displayDate, localDate } from "../lib/date";
import { Button, Card, Field, Select, Textarea } from "../components/ui";
import { FoodEditor, type PlateError } from "../components/food-editor";

const todayDraftKey = "cystotrack:today-draft";

type StoredDraft = { date: string; value: DayEntryForm };

function readTodayDraft(date: string): DayEntryForm | null {
  const today = localDate();
  const raw = window.localStorage.getItem(todayDraftKey);
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as StoredDraft;
    if (draft.date !== today) {
      window.localStorage.removeItem(todayDraftKey);
      return null;
    }
    return date === today ? draft.value : null;
  } catch {
    window.localStorage.removeItem(todayDraftKey);
    return null;
  }
}

function saveTodayDraft(date: string, value: DayEntryForm) {
  if (date !== localDate()) return;
  window.localStorage.setItem(todayDraftKey, JSON.stringify({ date, value }));
}

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
  const watchedValue = useWatch({ control: form.control });
  const { errors, isDirty } = useFormState({ control: form.control });
  useEffect(() => {
    if (!query.data || !validDate) return;
    form.reset(readTodayDraft(date!) ?? query.data);
  }, [date, query.data, validDate, form]);
  useEffect(() => {
    if (!validDate || date !== localDate() || !query.data || !isDirty) return;
    saveTodayDraft(date, form.getValues());
  }, [date, form, isDirty, query.data, validDate, watchedValue]);
  const mutation = useMutation({
    mutationFn: (value: DayEntryForm) => saveDay(date!, value),
    onSuccess: () => {
      window.localStorage.removeItem(todayDraftKey);
      queryClient.invalidateQueries({ queryKey: ["day", date] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    }
  });
  if (!validDate) return <Navigate to={`/journal/${localDate()}`} replace />;
  if (query.isLoading) return <p className="text-muted-foreground">Chargement du journal…</p>;
  if (query.isError) return <p role="alert" className="text-destructive">Impossible de charger cette journée.</p>;

  return <form className="space-y-6" onSubmit={form.handleSubmit((value) => mutation.mutate(value))}>
    <div className="max-w-3xl space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Journal quotidien</p>
      <h1 className="font-display text-4xl font-bold capitalize tracking-[-0.04em] sm:text-6xl">{displayDate(date!)}</h1>
      <p className="text-muted-foreground">Ajoutez progressivement les symptômes, facteurs et plats consommés pendant la journée.</p>
    </div>
    <Card><h2 className="mb-5 font-display text-2xl font-bold sm:text-[32px]">Symptômes et facteurs</h2>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{numericFields.map(([name, label, hint, options]) =>
        <Controller key={name} control={form.control} name={name} render={({ field, fieldState }) => <Field label={label} hint={fieldState.error?.message ?? hint}>
          <Select value={field.value ?? ""} onChange={(event) => field.onChange(event.target.value === "" ? null : Number(event.target.value))} aria-invalid={Boolean(fieldState.error)}>
            <option value="">Non renseigné</option>
            {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </Field>} />)}
      </div>
    </Card>
    <Card><h2 className="mb-5 font-display text-2xl font-bold sm:text-[32px]">Aliments consommés</h2>
      <Controller control={form.control} name="plates" render={({ field }) => <FoodEditor value={field.value} onChange={field.onChange} errors={errors.plates as PlateError[] | undefined} />} />
    </Card>
    <Card><Controller control={form.control} name="notes" render={({ field }) => <Field label="Notes (facultatif)"><Textarea rows={4} placeholder="Contexte, symptômes particuliers…" {...field} /></Field>} /></Card>
    {Object.keys(errors).length > 0 && <p role="alert" className="rounded-lg border border-destructive/30 bg-card px-4 py-3 text-sm text-destructive">Certains champs doivent être corrigés avant l’enregistrement.</p>}
    {mutation.isError && <p role="alert" className="text-destructive">L’enregistrement a échoué. Vos données sont toujours dans le formulaire.</p>}
    {mutation.isSuccess && <p role="status" className="flex items-center gap-2 text-primary"><CheckCircle2 size={18} /> Journée enregistrée.</p>}
    <Button className="w-full sm:w-auto" disabled={mutation.isPending}>{mutation.isPending ? "Enregistrement…" : "Enregistrer"}</Button>
  </form>;
}
