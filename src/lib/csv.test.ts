import { describe, expect, it } from "vitest";
import { buildCsv } from "./csv";
import type { HistoryEntry } from "./journal";

function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: "day-1", user_id: "user-1", date: "2026-06-09",
    bladder_pain_morning: 2, bladder_pain_evening: 4, perceived_stress: 3,
    external_stress: 5, sleep_hours: 7.5, hydration_ml: 2200,
    notes: 'Une note, avec "guillemets"', created_at: "", updated_at: "",
    plates: [
      { id: "p-1", name: "Déjeuner", meal_period: "morning", plate_ingredients: [{ id: "i-1", quantity: 1, measure_unit: "cup", foods: { id: "f-1", name: "Pomme" } }] },
      { id: "p-2", name: "Bol", meal_period: "lunch", plate_ingredients: [{ id: "i-2", quantity: null, measure_unit: null, foods: { id: "f-2", name: "Riz" } }] },
      { id: "p-3", name: "Souper", meal_period: "evening", plate_ingredients: [{ id: "i-3", quantity: 250, measure_unit: "ml", foods: { id: "f-3", name: "Soupe" } }] }
    ],
    ...overrides
  };
}

describe("buildCsv", () => {
  it("exports plates in separate meal-period columns and escapes cells", () => {
    const csv = buildCsv([entry()]);
    expect(csv).toContain('"PlatesMorning","PlatesLunch","PlatesEvening","Notes"');
    expect(csv).toContain('"Déjeuner: 1 cup Pomme","Bol: Riz","Souper: 250 ml Soupe","Une note, avec ""guillemets"""');
    expect(csv).toContain('"Une note, avec ""guillemets"""');
  });

  it("sorts days chronologically", () => {
    const csv = buildCsv([entry({ id: "2", date: "2026-06-10" }), entry({ id: "1", date: "2026-06-08" })]);
    expect(csv.indexOf("2026-06-08")).toBeLessThan(csv.indexOf("2026-06-10"));
  });
});
