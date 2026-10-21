// @ts-nocheck
import { describe, expect, it } from "vitest";
import { buildHref, firstParam, parseSort } from "../src/lib/query";

describe("query utilities", () => {
  it("builds query string from params", () => {
    expect(buildHref("/places", { page: "1", sort: "name" })).toBe("/places?page=1&sort=name");
  });

  it("applies overrides and removes empty parameters", () => {
    expect(buildHref("/places", { page: "1", sort: "name" }, { page: 2, sort: "" })).toBe("/places?page=2");
  });

  it("normalizes array-valued search parameters", () => {
    expect(firstParam([" Dhaka ", "Khulna"])).toBe(" Dhaka ");
    expect(parseSort("invalid")).toBe("relevance");
  });
});