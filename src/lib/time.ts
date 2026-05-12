import { format as fnsFormat } from "date-fns";
import { toZonedTime, fromZonedTime, format as fnsFormatTz } from "date-fns-tz";

export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now() {
    return new Date();
  }
}

export class FakeClock implements Clock {
  private current: Date;
  constructor(initial: Date) {
    this.current = new Date(initial);
  }
  now() {
    return new Date(this.current);
  }
  setNow(d: Date) {
    this.current = new Date(d);
  }
  advanceMs(ms: number) {
    this.current = new Date(this.current.getTime() + ms);
  }
  advanceSeconds(s: number) {
    this.advanceMs(s * 1000);
  }
  advanceMinutes(m: number) {
    this.advanceMs(m * 60_000);
  }
  advanceHours(h: number) {
    this.advanceMs(h * 3_600_000);
  }
}

export const systemClock: Clock = new SystemClock();

function parts(d: Date, tz: string) {
  const z = toZonedTime(d, tz);
  return {
    year: z.getFullYear(),
    month: z.getMonth(),
    day: z.getDate(),
    weekday: z.getDay(),
  };
}

function buildLocal(
  year: number,
  month: number,
  day: number,
  tz: string,
  h = 0,
  m = 0,
  s = 0,
  ms = 0,
): Date {
  return fromZonedTime(new Date(year, month, day, h, m, s, ms), tz);
}

export function startOfDayInTz(d: Date, tz: string): Date {
  const { year, month, day } = parts(d, tz);
  return buildLocal(year, month, day, tz);
}

export function endOfDayInTz(d: Date, tz: string): Date {
  const { year, month, day } = parts(d, tz);
  return new Date(buildLocal(year, month, day + 1, tz).getTime() - 1);
}

export function startOfWeekInTz(d: Date, tz: string): Date {
  const { year, month, day, weekday } = parts(d, tz);
  const daysBack = (weekday + 6) % 7;
  return buildLocal(year, month, day - daysBack, tz);
}

export function endOfWeekInTz(d: Date, tz: string): Date {
  const { year, month, day } = parts(startOfWeekInTz(d, tz), tz);
  return new Date(buildLocal(year, month, day + 7, tz).getTime() - 1);
}

export function startOfSemiMonthlyInTz(d: Date, tz: string): Date {
  const { year, month, day } = parts(d, tz);
  return day <= 15 ? buildLocal(year, month, 1, tz) : buildLocal(year, month, 16, tz);
}

export function endOfSemiMonthlyInTz(d: Date, tz: string): Date {
  const { year, month, day } = parts(d, tz);
  if (day <= 15) return new Date(buildLocal(year, month, 16, tz).getTime() - 1);
  return new Date(buildLocal(year, month + 1, 1, tz).getTime() - 1);
}

export function durationMinutes(inAt: Date, outAt: Date): number {
  const ms = outAt.getTime() - inAt.getTime();
  return ms <= 0 ? 0 : Math.floor(ms / 60_000);
}

export function formatLocal(d: Date, tz: string, fmt: string): string {
  return fnsFormatTz(toZonedTime(d, tz), fmt, { timeZone: tz });
}

export function formatUtc(d: Date, fmt: string): string {
  return fnsFormat(d, fmt);
}

export function isoWeekKey(d: Date, tz: string): string {
  const z = toZonedTime(d, tz);
  const target = new Date(Date.UTC(z.getFullYear(), z.getMonth(), z.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((target.getTime() - firstThursday.getTime()) / 86_400_000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
