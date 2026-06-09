import type { HistoryEntry, MealPeriod } from "./journal";

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildCsv(entries: HistoryEntry[]): string {
  const headers = ["Date", "MorningPain", "EveningPain", "PerceivedStress", "ExternalStress", "SleepHours", "HydrationMl", "FoodMorning", "FoodLunch", "FoodEvening", "Notes"];
  const rows = [...entries].sort((a, b) => a.date.localeCompare(b.date)).map((entry) => {
    const foodsForPeriod = (mealPeriod: MealPeriod) => entry.food_consumptions
      .filter((item) => item.meal_period === mealPeriod)
      .map((item) => item.foods?.name ?? "")
      .filter(Boolean)
      .join("; ");
    return [
      entry.date, entry.bladder_pain_morning, entry.bladder_pain_evening,
      entry.perceived_stress, entry.external_stress, entry.sleep_hours,
      entry.hydration_ml, foodsForPeriod("morning"), foodsForPeriod("lunch"),
      foodsForPeriod("evening"), entry.notes
    ].map(csvCell).join(",");
  });
  return `\uFEFF${headers.map(csvCell).join(",")}\r\n${rows.join("\r\n")}\r\n`;
}

export function downloadCsv(entries: HistoryEntry[]) {
  const blob = new Blob([buildCsv(entries)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `cystotrack-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
