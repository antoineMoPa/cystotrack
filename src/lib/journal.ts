import { z } from "zod";
import type { Database, Json } from "./database.types";
import { supabase } from "./supabase";

const optionalScore = z.union([z.number().min(0).max(10), z.null()]);
export const mealPeriods = ["morning", "lunch", "evening"] as const;
export type MealPeriod = typeof mealPeriods[number];
export const measureUnits = ["ml", "cup", "teaspoon", "tablespoon"] as const;
export type MeasureUnit = typeof measureUnits[number];
export const dayEntrySchema = z.object({
  bladderPainMorning: optionalScore,
  bladderPainEvening: optionalScore,
  perceivedStress: optionalScore,
  externalStress: optionalScore,
  sleepHours: z.union([z.number().min(0).max(24), z.null()]),
  hydrationMl: z.union([z.number().int().min(0), z.null()]),
  notes: z.string().max(5000),
  plates: z.array(z.object({
    id: z.string(),
    name: z.string().trim().min(1, "Nom du plat requis").max(120),
    mealPeriod: z.enum(mealPeriods),
    ingredients: z.array(z.object({
      id: z.string(),
      foodId: z.string().nullable(),
      foodName: z.string().trim().min(1, "Nom de l’ingrédient requis").max(120),
      quantity: z.union([z.number().positive("La quantité doit être supérieure à 0"), z.null()]),
      measureUnit: z.union([z.enum(measureUnits), z.null()])
    }))
  }))
});

export type DayEntryForm = z.infer<typeof dayEntrySchema>;
type DayRow = Database["public"]["Tables"]["day_entries"]["Row"];

export interface HistoryEntry extends DayRow {
  plates: Array<{
    id: string;
    name: string;
    meal_period: MealPeriod;
    plate_ingredients: Array<{
      id: string;
      quantity: number | null;
      measure_unit: MeasureUnit | null;
      foods: { id: string; name: string } | null;
    }>;
  }>;
}

export interface PreviousPlate {
  id: string;
  date: string;
  name: string;
  mealPeriod: MealPeriod;
  ingredients: Array<{
    id: string;
    foodId: string;
    foodName: string;
    quantity: number | null;
    measureUnit: MeasureUnit | null;
  }>;
}

export const emptyDayEntry: DayEntryForm = {
  bladderPainMorning: null, bladderPainEvening: null, perceivedStress: null,
  externalStress: null, sleepHours: null, hydrationMl: null, notes: "", plates: []
};

export async function fetchDay(date: string, signal: AbortSignal): Promise<DayEntryForm> {
  const { data: day, error: dayError } = await supabase.from("day_entries")
    .select("*").eq("date", date).abortSignal(signal).maybeSingle();
  if (dayError) throw dayError;
  if (!day) return emptyDayEntry;
  const { data: plates, error: plateError } = await supabase
    .from("plates").select("id, name, meal_period, position")
    .eq("day_entry_id", day.id).abortSignal(signal);
  if (plateError) throw plateError;
  const { data: ingredients, error: ingredientError } = plates.length
    ? await supabase.from("plate_ingredients").select("id, plate_id, food_id, quantity, measure_unit, position").in("plate_id", plates.map((plate) => plate.id)).abortSignal(signal)
    : { data: [], error: null };
  if (ingredientError) throw ingredientError;
  const foodIds = ingredients.map((item) => item.food_id);
  const { data: foods, error: foodError } = foodIds.length
    ? await supabase.from("foods").select("id, name").in("id", foodIds).abortSignal(signal)
    : { data: [], error: null };
  if (foodError) throw foodError;
  return {
    bladderPainMorning: day.bladder_pain_morning,
    bladderPainEvening: day.bladder_pain_evening,
    perceivedStress: day.perceived_stress,
    externalStress: day.external_stress,
    sleepHours: day.sleep_hours,
    hydrationMl: day.hydration_ml,
    notes: day.notes ?? "",
    plates: [...plates].sort((a, b) => a.position - b.position).map((plate) => ({
      id: plate.id,
      name: plate.name,
      mealPeriod: plate.meal_period,
      ingredients: ingredients
        .filter((item) => item.plate_id === plate.id)
        .sort((a, b) => a.position - b.position)
        .map((item) => {
          const food = foods.find((candidate) => candidate.id === item.food_id);
          return {
            id: item.id,
            foodId: food?.id ?? null,
            foodName: food?.name ?? "",
            quantity: item.quantity,
            measureUnit: item.measure_unit
          };
        })
    }))
  };
}

function platesToJson(plates: DayEntryForm["plates"]): Json {
  return plates.map((plate) => ({
    name: plate.name,
    meal_period: plate.mealPeriod,
    ingredients: plate.ingredients.map((item) => ({
      food_id: item.foodId,
      food_name: item.foodName,
      quantity: item.quantity,
      measure_unit: item.measureUnit
    }))
  }));
}

export async function saveDay(date: string, value: DayEntryForm) {
  const parsed = dayEntrySchema.parse(value);
  const { error } = await supabase.rpc("save_day_entry", {
    p_date: date,
    p_bladder_pain_morning: parsed.bladderPainMorning,
    p_bladder_pain_evening: parsed.bladderPainEvening,
    p_perceived_stress: parsed.perceivedStress,
    p_external_stress: parsed.externalStress,
    p_sleep_hours: parsed.sleepHours,
    p_hydration_ml: parsed.hydrationMl,
    p_notes: parsed.notes || null,
    p_plates: platesToJson(parsed.plates)
  });
  if (error) throw error;
}

export async function fetchFoods(search = "") {
  let query = supabase.from("foods").select("id, name").order("name").limit(20);
  if (search.trim()) query = query.ilike("name", `%${search.trim()}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchPreviousPlates(date: string, search: string): Promise<PreviousPlate[]> {
  const searchedName = search.trim();
  if (!searchedName) return [];

  const { data: days, error: dayError } = await supabase.from("day_entries")
    .select("id, date")
    .lte("date", date)
    .order("date", { ascending: false })
    .limit(100);
  if (dayError) throw dayError;
  if (!days.length) return [];

  const { data: plates, error: plateError } = await supabase.from("plates")
    .select("id, day_entry_id, name, meal_period, position")
    .in("day_entry_id", days.map((day) => day.id))
    .ilike("name", `%${searchedName}%`)
    .limit(20);
  if (plateError) throw plateError;
  if (!plates.length) return [];

  const { data: ingredients, error: ingredientError } = await supabase.from("plate_ingredients")
    .select("id, plate_id, food_id, quantity, measure_unit, position")
    .in("plate_id", plates.map((plate) => plate.id));
  if (ingredientError) throw ingredientError;

  const foodIds = [...new Set(ingredients.map((item) => item.food_id))];
  const { data: foods, error: foodError } = foodIds.length
    ? await supabase.from("foods").select("id, name").in("id", foodIds)
    : { data: [], error: null };
  if (foodError) throw foodError;

  return plates
    .map((plate) => ({
      id: plate.id,
      date: days.find((day) => day.id === plate.day_entry_id)!.date,
      name: plate.name,
      mealPeriod: plate.meal_period,
      ingredients: ingredients
        .filter((item) => item.plate_id === plate.id)
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          id: item.id,
          foodId: item.food_id,
          foodName: foods.find((food) => food.id === item.food_id)?.name ?? "",
          quantity: item.quantity,
          measureUnit: item.measure_unit
        }))
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  const { data: days, error: dayError } = await supabase.from("day_entries")
    .select("*").order("date", { ascending: false });
  if (dayError) throw dayError;
  if (!days.length) return [];
  const { data: plates, error: plateError } = await supabase
    .from("plates").select("id, day_entry_id, name, meal_period, position")
    .in("day_entry_id", days.map((day) => day.id));
  if (plateError) throw plateError;
  const { data: ingredients, error: ingredientError } = plates.length
    ? await supabase.from("plate_ingredients").select("id, plate_id, food_id, quantity, measure_unit, position").in("plate_id", plates.map((plate) => plate.id))
    : { data: [], error: null };
  if (ingredientError) throw ingredientError;
  const foodIds = [...new Set(ingredients.map((item) => item.food_id))];
  const { data: foods, error: foodError } = foodIds.length
    ? await supabase.from("foods").select("id, name").in("id", foodIds)
    : { data: [], error: null };
  if (foodError) throw foodError;
  return days.map((day) => ({
    ...day,
    plates: plates
      .filter((plate) => plate.day_entry_id === day.id)
      .sort((a, b) => a.position - b.position)
      .map(({ id, name, meal_period }) => ({
        id,
        name,
        meal_period,
        plate_ingredients: ingredients
          .filter((item) => item.plate_id === id)
          .sort((a, b) => a.position - b.position)
          .map(({ id, food_id, quantity, measure_unit }) => ({
            id,
            quantity,
            measure_unit,
            foods: foods.find((food) => food.id === food_id) ?? null
          }))
      }))
  }));
}
