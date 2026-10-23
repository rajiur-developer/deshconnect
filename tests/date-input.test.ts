import { describe, expect, it } from "vitest";
import { getDayFirstDateError, parseDayFirstDate } from "../src/lib/date-input";

describe("day-first date input", () => {
  it("parses a valid DD/MM/YYYY date into ISO format", () => {
    expect(parseDayFirstDate("16/10/2026")).toBe("2026-10-16");
  });

  it("reports past dates separately from malformed dates", () => {
    expect(getDayFirstDateError("16/10/2026", "2026-10-23")).toBe(
      "Date cannot be in the past. Choose today or a future date.",
    );
    expect(getDayFirstDateError("31/02/2026", "2026-10-23")).toBe(
      "Enter a valid date in DD/MM/YYYY format.",
    );
  });

  it("accepts today and future dates and rejects values beyond max", () => {
    expect(getDayFirstDateError("23/10/2026", "2026-10-23")).toBeNull();
    expect(getDayFirstDateError("24/10/2026", "2026-10-23")).toBeNull();
    expect(getDayFirstDateError("24/10/2026", undefined, "2026-10-23")).toBe(
      "Date cannot be in the future.",
    );
  });
});
