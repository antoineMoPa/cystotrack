import { describe, expect, it, vi } from "vitest";
import { copyPreviousPlate, createPlate } from "../lib/plate-mapping";

describe("createPlate", () => {
  it("uses the searched name in the selected meal", () => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn().mockReturnValue("new-plate") });

    expect(createPlate("Soupe maison", "evening")).toEqual({
      id: "new-plate",
      name: "Soupe maison",
      mealPeriod: "evening",
      ingredients: []
    });
  });
});

describe("copyPreviousPlate", () => {
  it("creates an independently editable plate for the selected meal", () => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn().mockReturnValueOnce("new-plate").mockReturnValueOnce("new-ingredient") });

    const copy = copyPreviousPlate({
      id: "old-plate",
      date: "2026-06-13",
      name: "Bol de gruau",
      mealPeriod: "morning",
      ingredients: [{
        id: "old-ingredient",
        foodId: "food-1",
        foodName: "Avoine",
        quantity: 1,
        measureUnit: "cup"
      }]
    }, "lunch");

    expect(copy).toEqual({
      id: "new-plate",
      name: "Bol de gruau",
      mealPeriod: "lunch",
      ingredients: [{
        id: "new-ingredient",
        foodId: "food-1",
        foodName: "Avoine",
        quantity: 1,
        measureUnit: "cup"
      }]
    });
  });
});
