import { describe, it, expect } from "bun:test";
import { getEventStatus, isPastEvent, isSpeech } from "../event";
import type { MarketNewsEvent } from "../types";

function makeEvent(overrides: Partial<MarketNewsEvent> = {}): MarketNewsEvent {
  return {
    id: "test",
    title: "NFP",
    lookupKey: "nfp",
    country: "United States",
    currency: "USD",
    date: "2025-01-10",
    time: "13:30",
    timestamp: new Date().toISOString(),
    impact: "high",
    forecast: "175K",
    previous: "200K",
    actual: "",
    released: false,
    ...overrides,
  };
}

describe("getEventStatus", () => {
  it("returns 'upcoming' for future events", () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    expect(getEventStatus(makeEvent({ timestamp: future }))).toBe("upcoming");
  });

  it("returns 'released' for past events", () => {
    const past = new Date(Date.now() - 3600000).toISOString();
    expect(getEventStatus(makeEvent({ timestamp: past }))).toBe("released");
  });

  it("returns 'live' for events within 10 minutes", () => {
    const recent = new Date(Date.now() - 60000).toISOString(); // 1 min ago
    expect(getEventStatus(makeEvent({ timestamp: recent }))).toBe("live");
  });

  it("returns 'released' for events older than 10 minutes", () => {
    const old = new Date(Date.now() - 600001).toISOString(); // ~10 min ago
    expect(getEventStatus(makeEvent({ timestamp: old }))).toBe("released");
  });

  it("falls back to date when timestamp is empty", () => {
    // Use a far-future date to avoid timezone ambiguity
    expect(
      getEventStatus(makeEvent({ timestamp: "", date: "2099-01-01" })),
    ).toBe("upcoming");
  });

  it("returns 'released' on invalid input", () => {
    expect(
      getEventStatus(makeEvent({ timestamp: "invalid", date: "invalid" })),
    ).toBe("released");
  });
});

describe("isPastEvent", () => {
  it("returns true for past events", () => {
    const past = new Date(Date.now() - 3600000).toISOString();
    expect(isPastEvent(makeEvent({ timestamp: past }))).toBe(true);
  });

  it("returns false for future events", () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    expect(isPastEvent(makeEvent({ timestamp: future }))).toBe(false);
  });

  it("returns false on invalid input", () => {
    expect(isPastEvent(makeEvent({ timestamp: "bad", date: "bad" }))).toBe(
      false,
    );
  });
});

describe("isSpeech", () => {
  it("returns true for 'speaks'", () => {
    expect(isSpeech("Fed Chair Powell Speaks")).toBe(true);
  });

  it("returns true for 'speech'", () => {
    expect(isSpeech("ECB President Speech")).toBe(true);
  });

  it("returns false for non-speech events", () => {
    expect(isSpeech("Non-Farm Payrolls")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isSpeech("POWELL SPEAKS")).toBe(true);
  });
});
