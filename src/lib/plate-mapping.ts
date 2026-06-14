import type { DayEntryForm, MealPeriod, PreviousPlate } from "./journal";

export function createPlate(name: string, mealPeriod: MealPeriod): DayEntryForm["plates"][number] {
  return {
    id: crypto.randomUUID(),
    name,
    mealPeriod,
    ingredients: []
  };
}

export function copyPreviousPlate(previousPlate: PreviousPlate, mealPeriod: MealPeriod): DayEntryForm["plates"][number] {
  return {
    id: crypto.randomUUID(),
    name: previousPlate.name,
    mealPeriod,
    ingredients: previousPlate.ingredients.map((ingredient) => ({
      id: crypto.randomUUID(),
      foodId: ingredient.foodId,
      foodName: ingredient.foodName,
      quantity: ingredient.quantity,
      measureUnit: ingredient.measureUnit
    }))
  };
}
