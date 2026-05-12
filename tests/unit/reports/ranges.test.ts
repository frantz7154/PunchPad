import { describe, it, expect } from "vitest";
import { resolveRange } from "@/features/reports/ranges";

const NOW = new Date("2026-05-22T15:00:00Z");
const TZ = "America/Chicago";

describe("resolveRange", () => {
  it("thisWeek returns Mon..Sun local", () => {
    const r = resolveRange("thisWeek", NOW, TZ);
    expect(r.from.toISOString()).toBe("2026-05-18T05:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-05-25T04:59:59.999Z");
  });
  it("lastWeek returns previous Mon..Sun", () => {
    const r = resolveRange("lastWeek", NOW, TZ);
    expect(r.from.toISOString()).toBe("2026-05-11T05:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-05-18T04:59:59.999Z");
  });
  it("payPeriod returns semi-monthly window for 22nd → 16..end", () => {
    const r = resolveRange("payPeriod", NOW, TZ);
    expect(r.from.toISOString()).toBe("2026-05-16T05:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-06-01T04:59:59.999Z");
  });
  it("payPeriod returns 1..15 when ref day <= 15", () => {
    const r = resolveRange("payPeriod", new Date("2026-05-08T15:00:00Z"), TZ);
    expect(r.from.toISOString()).toBe("2026-05-01T05:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-05-16T04:59:59.999Z");
  });
});
