import { describe, expect, it } from "vitest";
import { localDate } from "./date";

describe("localDate", () => {
  it("uses local calendar components", () => {
    expect(localDate(new Date(2026, 5, 9, 23, 30))).toBe("2026-06-09");
  });
});

