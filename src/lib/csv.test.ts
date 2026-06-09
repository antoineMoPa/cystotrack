import { describe, expect, it } from "vitest";
import { buildCsv } from "./csv";
import type { HistoryEntry } from "./journal";

function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: "day-1", user_id: "user-1", date: "2026-06-09",
    bladder_pain_morning: 2, bladder_pain_evening: 4, perceived_stress: 3,
    external_stress: 5, sleep_hours: 7.5, hydration_ml: 2200,
    notes: 'Une note, avec "guillemets"', created_at: "", updated_at: "",
    food_consumptions: [
      { id: "c-1", meal_period: "morning", foods: { id: "f-1", name: "Pomme" } },
      { id: "c-2", meal_period: "lunch", foods: { id: "f-2", name: "Riz" } },
      { id: "c-3", meal_period: "evening", foods: { id: "f-3", name: "Soupe" } }
    ],
    ...overrides
  };
}

describe("buildCsv", () => {
  it("exports foods in separate meal-period columns and escapes cells", () => {
    const csv = buildCsv([entry()]);
    expect(csv).toContain('"FoodMorning","FoodLunch","FoodEvening","Notes"');
    expect(csv).toContain('"Pomme","Riz","Soupe","Une note, avec ""guillemets"""');
    expect(csv).toContain('"Une note, avec ""guillemets"""');
  });

  it("sorts days chronologically", () => {
    const csv = buildCsv([entry({ id: "2", date: "2026-06-10" }), entry({ id: "1", date: "2026-06-08" })]);
    expect(csv.indexOf("2026-06-08")).toBeLessThan(csv.indexOf("2026-06-10"));
  });
});
