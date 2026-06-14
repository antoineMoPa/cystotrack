import { Plus, Search, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { DayEntryForm, MealPeriod, MeasureUnit, PreviousPlate } from "../lib/journal";
import { fetchFoods, fetchPreviousPlates, measureUnits } from "../lib/journal";
import { copyPreviousPlate } from "../lib/plate-mapping";
import { displayDate } from "../lib/date";
import { Input, Select } from "./ui";

type Plate = DayEntryForm["plates"][number];
type Ingredient = Plate["ingredients"][number];
export type PlateError = {
  name?: { message?: string };
  ingredients?: Array<{
    foodName?: { message?: string };
    quantity?: { message?: string };
  }>;
};
type IngredientError = NonNullable<PlateError["ingredients"]>[number];

const mealLabels: Record<MealPeriod, string> = {
  morning: "Matin / petit-déjeuner",
  lunch: "Midi / déjeuner",
  evening: "Soir / dîner"
};

const unitLabels: Record<MeasureUnit, string> = {
  ml: "ml",
  cup: "tasse",
  teaspoon: "cuillère à thé",
  tablespoon: "cuillère à soupe"
};

export function FoodEditor({ date, value, onChange, errors }: { date: string; value: Plate[]; onChange: (value: Plate[]) => void; errors?: PlateError[] }) {
  return <div className="grid gap-5 lg:grid-cols-3">
    {Object.entries(mealLabels).map(([mealPeriod, label]) => <MealEditor key={mealPeriod} date={date} label={label} mealPeriod={mealPeriod as MealPeriod} value={value} onChange={onChange} errors={errors} />)}
  </div>;
}

function MealEditor({ date, label, mealPeriod, value, onChange, errors }: {
  date: string;
  label: string;
  mealPeriod: MealPeriod;
  value: Plate[];
  onChange: (value: Plate[]) => void;
  errors?: PlateError[];
}) {
  const periodPlates = value.map((plate, index) => ({ plate, index })).filter((item) => item.plate.mealPeriod === mealPeriod);

  function updatePlate(updatedPlate: Plate) {
    onChange(value.map((plate) => plate.id === updatedPlate.id ? updatedPlate : plate));
  }

  return <section className="rounded-xl border border-border bg-muted/40">
    <h3 className="border-b border-border px-4 py-3 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</h3>
    <PreviousPlateSearch date={date} mealPeriod={mealPeriod} onSelect={(previousPlate) => onChange([...value, copyPreviousPlate(previousPlate, mealPeriod)])} />
    <div className="divide-y divide-border">
      {periodPlates.map(({ plate, index }) => <PlateEditor
        key={plate.id}
        plate={plate}
        error={errors?.[index]}
        onChange={updatePlate}
        onRemove={() => onChange(value.filter((entry) => entry.id !== plate.id))}
      />)}
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-primary transition hover:bg-card"
        onClick={() => onChange([...value, { id: crypto.randomUUID(), name: "", mealPeriod, ingredients: [] }])}
      >
        <Plus size={16} /> Ajouter un plat
      </button>
    </div>
    {periodPlates.length === 0 && <p className="px-4 pb-3 text-[13px] text-muted-foreground">Aucun plat pour ce moment.</p>}
  </section>;
}

function PreviousPlateSearch({ date, mealPeriod, onSelect }: { date: string; mealPeriod: MealPeriod; onSelect: (plate: PreviousPlate) => void }) {
  const [search, setSearch] = useState("");
  const searchedName = search.trim();
  const { data: plates = [], isFetching, isError } = useQuery({
    queryKey: ["previous-plates", date, searchedName],
    queryFn: () => fetchPreviousPlates(date, searchedName),
    enabled: searchedName.length > 0
  });

  return <div className="border-b border-border bg-card/60 p-3">
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
      <Input
        className="pl-9"
        aria-label={`Rechercher parmi tous les plats enregistrés pour ${mealLabels[mealPeriod]}`}
        placeholder="Reprendre un plat enregistré…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
    </div>
    {searchedName && <div className="mt-2 overflow-hidden rounded-md border border-border bg-card">
      {isFetching && <p className="px-3 py-2 text-[13px] text-muted-foreground">Recherche…</p>}
      {isError && <p role="alert" className="px-3 py-2 text-[13px] text-destructive">Recherche impossible.</p>}
      {!isFetching && !isError && plates.length === 0 && <p className="px-3 py-2 text-[13px] text-muted-foreground">Aucun plat enregistré trouvé.</p>}
      {!isFetching && plates.map((plate) => <button
        key={plate.id}
        type="button"
        className="block w-full border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-muted"
        onClick={() => {
          onSelect(plate);
          setSearch("");
        }}
      >
        <span className="block text-sm font-medium">{plate.name}</span>
        <span className="block text-[12px] text-muted-foreground">{displayDate(plate.date)} · {plate.ingredients.map((ingredient) => ingredient.foodName).join(", ") || "Sans ingrédient"}</span>
      </button>)}
    </div>}
  </div>;
}

function PlateEditor({ plate, error, onChange, onRemove }: { plate: Plate; error?: PlateError; onChange: (plate: Plate) => void; onRemove: () => void }) {
  function updateIngredient(updatedIngredient: Ingredient) {
    onChange({ ...plate, ingredients: plate.ingredients.map((item) => item.id === updatedIngredient.id ? updatedIngredient : item) });
  }

  return <div className="space-y-3 bg-card p-4">
    <div className="flex gap-2">
      <div className="min-w-0 flex-1">
        <Input aria-label="Nom du plat" placeholder="Nom du plat" value={plate.name} aria-invalid={Boolean(error?.name)} onChange={(event) => onChange({ ...plate, name: event.target.value })} />
        {error?.name?.message && <p role="alert" className="mt-1 text-[13px] text-destructive">{error.name.message}</p>}
      </div>
      <button type="button" aria-label={`Retirer ${plate.name}`} className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-destructive" onClick={onRemove}><Trash2 size={18} /></button>
    </div>
    <div className="space-y-2">
      {plate.ingredients.map((ingredient, index) => <IngredientEditor
        key={ingredient.id}
        ingredient={ingredient}
        error={error?.ingredients?.[index]}
        onChange={updateIngredient}
        onRemove={() => onChange({ ...plate, ingredients: plate.ingredients.filter((item) => item.id !== ingredient.id) })}
      />)}
    </div>
    <button type="button" className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-primary transition hover:-translate-y-px hover:bg-muted" onClick={() => onChange({
      ...plate,
      ingredients: [...plate.ingredients, { id: crypto.randomUUID(), foodId: null, foodName: "", quantity: null, measureUnit: null }]
    })}>
      <Plus size={16} /> Ajouter un ingrédient
    </button>
  </div>;
}

function IngredientEditor({ ingredient, error, onChange, onRemove }: { ingredient: Ingredient; error?: IngredientError; onChange: (ingredient: Ingredient) => void; onRemove: () => void }) {
  const [search, setSearch] = useState(ingredient.foodName);
  const { data: foods = [] } = useQuery({ queryKey: ["foods", search], queryFn: () => fetchFoods(search) });
  const suggestionsId = `food-suggestions-${ingredient.id}`;

  function changeFoodName(foodName: string) {
    const existing = foods.find((food) => food.name.localeCompare(foodName.trim(), undefined, { sensitivity: "base" }) === 0);
    setSearch(foodName);
    onChange({ ...ingredient, foodId: existing?.id ?? null, foodName: existing?.name ?? foodName });
  }

  return <div className="grid gap-2 rounded-lg border border-border p-2 sm:grid-cols-[minmax(0,1fr)_6rem_minmax(0,9rem)_auto]">
    <div>
      <Input aria-label="Nom de l’ingrédient" list={suggestionsId} placeholder="Ex. Banane" value={ingredient.foodName} aria-invalid={Boolean(error?.foodName)} onChange={(event) => changeFoodName(event.target.value)} />
      <datalist id={suggestionsId}>{foods.map((food) => <option key={food.id} value={food.name} />)}</datalist>
      {error?.foodName?.message && <p role="alert" className="mt-1 text-[13px] text-destructive">{error.foodName.message}</p>}
    </div>
    <div>
      <Input
        aria-label="Quantité"
        inputMode="decimal"
        placeholder="Qté"
        value={ingredient.quantity ?? ""}
        aria-invalid={Boolean(error?.quantity)}
        onChange={(event) => onChange({ ...ingredient, quantity: event.target.value === "" ? null : Number(event.target.value) })}
      />
      {error?.quantity?.message && <p role="alert" className="mt-1 text-[13px] text-destructive">{error.quantity.message}</p>}
    </div>
    <Select aria-label="Unité" value={ingredient.measureUnit ?? ""} onChange={(event) => onChange({ ...ingredient, measureUnit: event.target.value === "" ? null : event.target.value as MeasureUnit })}>
      <option value="">Unité</option>
      {measureUnits.map((unit) => <option key={unit} value={unit}>{unitLabels[unit]}</option>)}
    </Select>
    <button type="button" aria-label={`Retirer ${ingredient.foodName || "cet ingrédient"}`} className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-destructive" onClick={onRemove}><Trash2 size={18} /></button>
  </div>;
}
