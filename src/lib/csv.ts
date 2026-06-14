import type { HistoryEntry, MealPeriod } from "./journal";

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildCsv(entries: HistoryEntry[]): string {
  const headers = ["Date", "MorningPain", "EveningPain", "PerceivedStress", "ExternalStress", "SleepHours", "HydrationMl", "PlatesMorning", "PlatesLunch", "PlatesEvening", "Notes"];
  const rows = [...entries].sort((a, b) => a.date.localeCompare(b.date)).map((entry) => {
    const platesForPeriod = (mealPeriod: MealPeriod) => entry.plates
      .filter((plate) => plate.meal_period === mealPeriod)
      .map((plate) => {
        const ingredients = plate.plate_ingredients.map((item) => {
          const quantity = item.quantity == null ? "" : `${item.quantity}${item.measure_unit ? ` ${item.measure_unit}` : ""} `;
          return `${quantity}${item.foods?.name ?? ""}`.trim();
        }).filter(Boolean).join(" + ");
        return ingredients ? `${plate.name}: ${ingredients}` : plate.name;
      })
      .filter(Boolean)
      .join("; ");
    return [
      entry.date, entry.bladder_pain_morning, entry.bladder_pain_evening,
      entry.perceived_stress, entry.external_stress, entry.sleep_hours,
      entry.hydration_ml, platesForPeriod("morning"), platesForPeriod("lunch"),
      platesForPeriod("evening"), entry.notes
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
