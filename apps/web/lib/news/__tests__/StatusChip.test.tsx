import { describe, it, expect } from "bun:test";

describe("StatusChip", () => {
  it("renders upcoming status", async () => {
    const { default: StatusChip } = await import("../StatusChip");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(StatusChip({ status: "upcoming" }));
    expect(html).toContain("Upcoming");
    expect(html).toContain("#60a5fa");
  });

  it("renders live status with pulse indicator", async () => {
    const { default: StatusChip } = await import("../StatusChip");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(StatusChip({ status: "live" }));
    expect(html).toContain("Live");
    expect(html).toContain("animate-pulse");
  });

  it("renders released status", async () => {
    const { default: StatusChip } = await import("../StatusChip");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(StatusChip({ status: "released" }));
    expect(html).toContain("Released");
    expect(html).toContain("#6b7280");
  });
});
