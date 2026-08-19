import { describe, it, expect } from "bun:test";
import { formatEventTime } from "../format";

describe("formatEventTime", () => {
  it("formats a valid ISO timestamp", () => {
    const result = formatEventTime("2025-01-10T13:30:00Z");
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("returns raw string on invalid input", () => {
    expect(formatEventTime("not-a-date")).toBe("not-a-date");
  });

  it("returns raw string on empty input", () => {
    expect(formatEventTime("")).toBe("");
  });
});
