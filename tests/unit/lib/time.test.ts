import { describe, it, expect } from "vitest";
import {
  FakeClock,
  startOfDayInTz,
  endOfDayInTz,
  startOfWeekInTz,
  endOfWeekInTz,
  startOfSemiMonthlyInTz,
  endOfSemiMonthlyInTz,
  durationMinutes,
  formatLocal,
  isoWeekKey,
} from "@/lib/time";

describe("FakeClock", () => {
  it("advances by ms and seconds", () => {
    const c = new FakeClock(new Date("2026-05-12T12:00:00Z"));
    c.advanceMs(60_000);
    expect(c.now().toISOString()).toBe("2026-05-12T12:01:00.000Z");
    c.advanceSeconds(60);
    expect(c.now().toISOString()).toBe("2026-05-12T12:02:00.000Z");
  });
  it("setNow replaces the time", () => {
    const c = new FakeClock(new Date("2026-01-01T00:00:00Z"));
    c.setNow(new Date("2030-06-15T08:00:00Z"));
    expect(c.now().getUTCFullYear()).toBe(2030);
  });
});

describe("TZ boundaries (America/Chicago)", () => {
  const tz = "America/Chicago";
  it("startOfDayInTz returns local 00:00 in UTC", () => {
    const start = startOfDayInTz(new Date("2026-05-12T15:30:00Z"), tz);
    expect(start.toISOString()).toBe("2026-05-12T05:00:00.000Z");
  });
  it("endOfDayInTz is the next-day start minus 1 ms", () => {
    const end = endOfDayInTz(new Date("2026-05-12T15:30:00Z"), tz);
    expect(end.toISOString()).toBe("2026-05-13T04:59:59.999Z");
  });
  it("startOfWeekInTz is Monday 00:00 local", () => {
    const start = startOfWeekInTz(new Date("2026-05-12T15:30:00Z"), tz);
    expect(start.toISOString()).toBe("2026-05-11T05:00:00.000Z");
  });
  it("endOfWeekInTz is Sunday 23:59:59.999 local", () => {
    const end = endOfWeekInTz(new Date("2026-05-12T15:30:00Z"), tz);
    expect(end.toISOString()).toBe("2026-05-18T04:59:59.999Z");
  });
  it("semi-monthly first half: 1st through 15th", () => {
    const d = new Date("2026-05-08T12:00:00Z");
    expect(startOfSemiMonthlyInTz(d, tz).toISOString()).toBe("2026-05-01T05:00:00.000Z");
    expect(endOfSemiMonthlyInTz(d, tz).toISOString()).toBe("2026-05-16T04:59:59.999Z");
  });
  it("semi-monthly second half: 16th through end-of-month", () => {
    const d = new Date("2026-05-22T12:00:00Z");
    expect(startOfSemiMonthlyInTz(d, tz).toISOString()).toBe("2026-05-16T05:00:00.000Z");
    expect(endOfSemiMonthlyInTz(d, tz).toISOString()).toBe("2026-06-01T04:59:59.999Z");
  });
});

describe("durationMinutes", () => {
  it("returns positive minutes for normal range", () => {
    expect(
      durationMinutes(new Date("2026-05-12T08:00:00Z"), new Date("2026-05-12T09:30:00Z")),
    ).toBe(90);
  });
  it("returns 0 when out <= in", () => {
    expect(
      durationMinutes(new Date("2026-05-12T09:00:00Z"), new Date("2026-05-12T08:00:00Z")),
    ).toBe(0);
  });
});

describe("formatLocal", () => {
  it("formats a UTC instant in a given TZ", () => {
    expect(
      formatLocal(new Date("2026-05-12T13:00:00Z"), "America/Chicago", "yyyy-MM-dd HH:mm"),
    ).toBe("2026-05-12 08:00");
  });
});

describe("isoWeekKey", () => {
  it("returns YYYY-Www form", () => {
    expect(isoWeekKey(new Date("2026-05-12T13:00:00Z"), "America/Chicago")).toMatch(
      /^2026-W\d{2}$/,
    );
  });
});
