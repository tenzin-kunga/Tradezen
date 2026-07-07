import { describe, it, expect } from "bun:test";
import { lookupEventMetadata } from "../economic-event-metadata";

describe("lookupEventMetadata", () => {
  it("looks up by primary key", async () => {
    const meta = await lookupEventMetadata("core cpi m/m");
    expect(meta).toBeDefined();
    expect(meta?.acroExpand).toContain("Consumer Price Index");
  });

  it("looks up by alias", async () => {
    const meta = await lookupEventMetadata("nfp");
    expect(meta).toBeDefined();
    expect(meta?.acroExpand).toContain("Non-Farm Payrolls");
  });

  it("is case-insensitive", async () => {
    const meta = await lookupEventMetadata("NON-FARM PAYROLLS");
    expect(meta).toBeDefined();
  });

  it("ignores punctuation", async () => {
    const meta = await lookupEventMetadata("fomc rate decision");
    expect(meta).toBeDefined();
    expect(meta?.acroExpand).toContain("Federal Open Market Committee");
  });

  it("returns undefined for unknown events", async () => {
    const meta = await lookupEventMetadata("totally unknown event xyz");
    expect(meta).toBeUndefined();
  });

  it("caches the lookup map on subsequent calls", async () => {
    await lookupEventMetadata("cpi m/m");
    const meta = await lookupEventMetadata("nfp");
    expect(meta).toBeDefined();
  });
});
