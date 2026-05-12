import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sessionsInRange, bucketByLocalDay } from "@/features/attendance/calendar-queries";
import { CalendarShell } from "@/features/attendance/components/calendar-shell";
import {
  startOfDayInTz,
  endOfDayInTz,
  formatLocal,
  durationMinutes,
  systemClock,
} from "@/lib/time";

export const dynamic = "force-dynamic";

type Search = { year?: string; month?: string };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const now = systemClock.now();
  const year = sp.year ? Number(sp.year) : Number(formatLocal(now, user.timezone, "yyyy"));
  const month = sp.month
    ? Number(sp.month) - 1
    : Number(formatLocal(now, user.timezone, "M")) - 1;

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const from = startOfDayInTz(first, user.timezone);
  const to = endOfDayInTz(last, user.timezone);

  const sessions = await sessionsInRange(prisma, user.id, from, to);
  const buckets = bucketByLocalDay(sessions, user.timezone);

  const dayBuckets = Object.entries(buckets).map(([dateLocal, list]) => {
    const minutes = list.reduce(
      (m, s) => m + durationMinutes(s.clockInAt, s.clockOutAt ?? now),
      0,
    );
    return { dateLocal, minutes, count: list.length };
  });

  const today = formatLocal(now, user.timezone, "yyyy-MM-dd");

  return (
    <CalendarShell
      year={year}
      month={month}
      today={today}
      days={dayBuckets}
      timezone={user.timezone}
    />
  );
}
