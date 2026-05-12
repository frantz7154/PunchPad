import { describe, it, expect } from "vitest";
import { rangesOverlap } from "@/features/attendance/service";

describe("rangesOverlap", () => {
  const A_IN = new Date("2026-05-12T08:00:00Z");
  const A_OUT = new Date("2026-05-12T12:00:00Z");

  it("non-overlapping sequential ranges do not overlap", () => {
    expect(
      rangesOverlap(
        A_IN,
        A_OUT,
        new Date("2026-05-12T12:00:00Z"),
        new Date("2026-05-12T14:00:00Z"),
      ),
    ).toBe(false);
  });

  it("interior overlap returns true", () => {
    expect(
      rangesOverlap(
        A_IN,
        A_OUT,
        new Date("2026-05-12T10:00:00Z"),
        new Date("2026-05-12T11:00:00Z"),
      ),
    ).toBe(true);
  });

  it("partial overlap returns true", () => {
    expect(
      rangesOverlap(
        A_IN,
        A_OUT,
        new Date("2026-05-12T11:00:00Z"),
        new Date("2026-05-12T13:00:00Z"),
      ),
    ).toBe(true);
  });

  it("open-ended sessions (no out) treated as ongoing to far future", () => {
    expect(
      rangesOverlap(
        A_IN,
        null,
        new Date("2026-05-12T20:00:00Z"),
        new Date("2026-05-12T21:00:00Z"),
      ),
    ).toBe(true);
  });
});
