// @ts-nocheck
import { describe, expect, it } from "vitest";
import { formatZodError } from "../src/lib/validation/schemas";

describe("formatZodError", () => {
  it("returns formatted error messages", () => {
    const result = formatZodError({ issues: [{ message: "Required" }] });
    expect(result).toContain("Required");
  });

  it("returns empty string for empty errors", () => {
    const result = formatZodError({ issues: [] });
    expect(result).toBe("");
  });
});