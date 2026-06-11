import { Plus, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { DayEntryForm } from "../lib/journal";
import { fetchFoods } from "../lib/journal";
import { Button, Input } from "./ui";
import { useState } from "react";

type Consumption = DayEntryForm["consumptions"][number];
type MealPeriod = Consumption["mealPeriod"];

export function FoodEditor({ value, onChange }: { value: Consumption[]; onChange: (value: Consumption[]) => void }) {
  return <div className="grid gap-5 lg:grid-cols-3">
    <MealEditor label="Matin / petit-déjeuner" mealPeriod="morning" value={value} onChange={onChange} />
    <MealEditor label="Midi / déjeuner" mealPeriod="lunch" value={value} onChange={onChange} />
    <MealEditor label="Soir / dîner" mealPeriod="evening" value={value} onChange={onChange} />
  </div>;
}

function MealEditor({ label, mealPeriod, value, onChange }: {
  label: string;
  mealPeriod: MealPeriod;
  value: Consumption[];
  onChange: (value: Consumption[]) => void;
}) {
  const [name, setName] = useState("");
  const { data: foods = [] } = useQuery({ queryKey: ["foods", name], queryFn: () => fetchFoods(name) });
  const periodConsumptions = value.filter((item) => item.mealPeriod === mealPeriod);

  function addFood() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = foods.find((food) => food.name.localeCompare(trimmed, undefined, { sensitivity: "base" }) === 0);
    onChange([...value, { id: crypto.randomUUID(), foodId: existing?.id ?? null, foodName: existing?.name ?? trimmed, mealPeriod }]);
    setName("");
  }

  const suggestionsId = `food-suggestions-${mealPeriod}`;
  return <section className="space-y-3 rounded-xl bg-muted/60 p-3">
    <h3 className="font-semibold">{label}</h3>
    <div className="flex gap-2">
      <div className="min-w-0 flex-1">
        <Input
          aria-label={`Aliment, ${label}`}
          list={suggestionsId}
          placeholder="Ex. Banane"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={addFood}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addFood(); } }}
        />
        <datalist id={suggestionsId}>{foods.map((food) => <option key={food.id} value={food.name} />)}</datalist>
      </div>
      <Button
        type="button"
        className="px-3"
        aria-label={`Ajouter au repas: ${label}`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={addFood}
        disabled={!name.trim()}
      >
        <Plus size={18} />
      </Button>
    </div>
    {periodConsumptions.length === 0 ? <p className="text-sm text-muted-foreground">Aucun aliment.</p> :
      <ul className="space-y-2">{periodConsumptions.map((item) => <li key={item.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
        <strong>{item.foodName}</strong>
        <button type="button" aria-label={`Retirer ${item.foodName}`} className="rounded-lg p-1 hover:bg-white" onClick={() => onChange(value.filter((entry) => entry.id !== item.id))}><X size={18} /></button>
      </li>)}</ul>}
  </section>;
}
