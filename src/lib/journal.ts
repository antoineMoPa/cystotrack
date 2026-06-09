import { z } from "zod";
import type { Database, Json } from "./database.types";
import { supabase } from "./supabase";

const optionalScore = z.union([z.number().min(0).max(10), z.null()]);
export const mealPeriods = ["morning", "lunch", "evening"] as const;
export type MealPeriod = typeof mealPeriods[number];
export const dayEntrySchema = z.object({
  bladderPainMorning: optionalScore,
  bladderPainEvening: optionalScore,
  perceivedStress: optionalScore,
  externalStress: optionalScore,
  sleepHours: z.union([z.number().min(0).max(24), z.null()]),
  hydrationMl: z.union([z.number().int().min(0), z.null()]),
  notes: z.string().max(5000),
  consumptions: z.array(z.object({
    id: z.string(),
    foodId: z.string().nullable(),
    foodName: z.string().trim().min(1).max(120),
    mealPeriod: z.enum(mealPeriods)
  }))
});

export type DayEntryForm = z.infer<typeof dayEntrySchema>;
type DayRow = Database["public"]["Tables"]["day_entries"]["Row"];

export interface HistoryEntry extends DayRow {
  food_consumptions: Array<{
    id: string; meal_period: MealPeriod;
    foods: { id: string; name: string } | null;
  }>;
}

export const emptyDayEntry: DayEntryForm = {
  bladderPainMorning: null, bladderPainEvening: null, perceivedStress: null,
  externalStress: null, sleepHours: null, hydrationMl: null, notes: "", consumptions: []
};

export async function fetchDay(date: string, signal: AbortSignal): Promise<DayEntryForm> {
  const { data: day, error: dayError } = await supabase.from("day_entries")
    .select("*").eq("date", date).abortSignal(signal).maybeSingle();
  if (dayError) throw dayError;
  if (!day) return emptyDayEntry;
  const { data: consumptions, error: consumptionError } = await supabase
    .from("food_consumptions").select("id, food_id, meal_period")
    .eq("day_entry_id", day.id).abortSignal(signal);
  if (consumptionError) throw consumptionError;
  const foodIds = consumptions.map((item) => item.food_id);
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
    consumptions: consumptions.map((item) => {
      const food = foods.find((candidate) => candidate.id === item.food_id);
      return {
      id: item.id,
      foodId: food?.id ?? null,
      foodName: food?.name ?? "",
      mealPeriod: item.meal_period
    };})
  };
}

export async function saveDay(date: string, value: DayEntryForm) {
  const parsed = dayEntrySchema.parse(value);
  const consumptions: Json = parsed.consumptions.map((item) => ({
    food_id: item.foodId,
    food_name: item.foodName,
    meal_period: item.mealPeriod
  }));
  const { error } = await supabase.rpc("save_day_entry", {
    p_date: date,
    p_bladder_pain_morning: parsed.bladderPainMorning,
    p_bladder_pain_evening: parsed.bladderPainEvening,
    p_perceived_stress: parsed.perceivedStress,
    p_external_stress: parsed.externalStress,
    p_sleep_hours: parsed.sleepHours,
    p_hydration_ml: parsed.hydrationMl,
    p_notes: parsed.notes || null,
    p_consumptions: consumptions
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

export async function fetchHistory(): Promise<HistoryEntry[]> {
  const { data: days, error: dayError } = await supabase.from("day_entries")
    .select("*").order("date", { ascending: false });
  if (dayError) throw dayError;
  if (!days.length) return [];
  const { data: consumptions, error: consumptionError } = await supabase
    .from("food_consumptions").select("id, day_entry_id, food_id, meal_period")
    .in("day_entry_id", days.map((day) => day.id));
  if (consumptionError) throw consumptionError;
  const foodIds = [...new Set(consumptions.map((item) => item.food_id))];
  const { data: foods, error: foodError } = foodIds.length
    ? await supabase.from("foods").select("id, name").in("id", foodIds)
    : { data: [], error: null };
  if (foodError) throw foodError;
  return days.map((day) => ({
    ...day,
    food_consumptions: consumptions
      .filter((item) => item.day_entry_id === day.id)
      .map(({ id, meal_period, food_id }) => ({
        id,
        meal_period,
        foods: foods.find((food) => food.id === food_id) ?? null
      }))
  }));
}
