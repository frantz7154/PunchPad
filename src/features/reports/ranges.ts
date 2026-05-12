import {
  startOfDayInTz,
  endOfDayInTz,
  startOfWeekInTz,
  endOfWeekInTz,
  startOfSemiMonthlyInTz,
  endOfSemiMonthlyInTz,
} from "@/lib/time";

export type RangeKey = "today" | "thisWeek" | "lastWeek" | "payPeriod" | "custom";

export type Range = { from: Date; to: Date };

export function resolveRange(key: RangeKey, now: Date, tz: string, custom?: Range): Range {
  switch (key) {
    case "today":
      return { from: startOfDayInTz(now, tz), to: endOfDayInTz(now, tz) };
    case "thisWeek":
      return { from: startOfWeekInTz(now, tz), to: endOfWeekInTz(now, tz) };
    case "lastWeek": {
      const ref = new Date(now.getTime() - 7 * 24 * 3_600_000);
      return { from: startOfWeekInTz(ref, tz), to: endOfWeekInTz(ref, tz) };
    }
    case "payPeriod":
      return { from: startOfSemiMonthlyInTz(now, tz), to: endOfSemiMonthlyInTz(now, tz) };
    case "custom":
      if (!custom) throw new Error("custom range requires explicit from/to");
      return custom;
  }
}
