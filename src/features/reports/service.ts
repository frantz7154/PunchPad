import type { PrismaClient } from "@/generated/prisma/client";
import {
  formatLocal,
  durationMinutes,
  startOfDayInTz,
  endOfDayInTz,
  startOfWeekInTz,
  endOfWeekInTz,
} from "@/lib/time";
import type { UserRow, KpiSet } from "./types";

export type ReportInput = {
  from: Date;
  to: Date;
  timezone: string;
  userId?: string;
};

export async function reportForRange(
  prisma: PrismaClient,
  input: ReportInput,
): Promise<UserRow[]> {
  const users = await prisma.user.findMany({
    where: input.userId
      ? { id: input.userId }
      : { deactivatedAt: null, id: { not: "system" } },
    orderBy: { name: "asc" },
  });

  const sessions = await prisma.timeSession.findMany({
    where: {
      deletedAt: null,
      userId: input.userId ?? { in: users.map((u) => u.id) },
      OR: [
        { clockInAt: { gte: input.from, lte: input.to } },
        { AND: [{ clockInAt: { lt: input.from } }, { clockOutAt: { gt: input.from } }] },
      ],
    },
    orderBy: { clockInAt: "asc" },
  });

  const byUser = new Map<string, UserRow>();
  for (const u of users) {
    byUser.set(u.id, {
      userId: u.id,
      email: u.email,
      name: u.name,
      totalMinutes: 0,
      days: [],
    });
  }

  const dailyMap = new Map<string, Map<string, { minutes: number; count: number }>>();
  for (const s of sessions) {
    const day = formatLocal(s.clockInAt, input.timezone, "yyyy-MM-dd");
    const end = s.clockOutAt ?? input.to;
    const mins = durationMinutes(s.clockInAt, end);
    const user = byUser.get(s.userId);
    if (!user) continue;
    user.totalMinutes += mins;
    const dm = dailyMap.get(s.userId) ?? new Map();
    const cell = dm.get(day) ?? { minutes: 0, count: 0 };
    cell.minutes += mins;
    cell.count += 1;
    dm.set(day, cell);
    dailyMap.set(s.userId, dm);
  }

  for (const [uid, user] of byUser) {
    const dm = dailyMap.get(uid) ?? new Map();
    user.days = Array.from(dm.entries())
      .map(([dateLocal, v]) => ({ dateLocal, minutes: v.minutes, sessionCount: v.count }))
      .sort((a, b) => a.dateLocal.localeCompare(b.dateLocal));
  }

  return Array.from(byUser.values());
}

export async function kpiSet(
  prisma: PrismaClient,
  userId: string,
  tz: string,
  now: Date,
): Promise<KpiSet> {
  const todayFrom = startOfDayInTz(now, tz);
  const todayTo = endOfDayInTz(now, tz);
  const thisWeekFrom = startOfWeekInTz(now, tz);
  const thisWeekTo = endOfWeekInTz(now, tz);
  const lastWeekRef = new Date(now.getTime() - 7 * 24 * 3_600_000);
  const lastWeekFrom = startOfWeekInTz(lastWeekRef, tz);
  const lastWeekTo = endOfWeekInTz(lastWeekRef, tz);
  const sevenFrom = new Date(now.getTime() - 7 * 24 * 3_600_000);

  async function minutesIn(from: Date, to: Date) {
    const sessions = await prisma.timeSession.findMany({
      where: { userId, deletedAt: null, clockInAt: { gte: from, lte: to } },
    });
    return sessions.reduce(
      (acc, s) => acc + durationMinutes(s.clockInAt, s.clockOutAt ?? now),
      0,
    );
  }

  const [today, thisWeek, lastWeek, sevenDay] = await Promise.all([
    minutesIn(todayFrom, todayTo),
    minutesIn(thisWeekFrom, thisWeekTo),
    minutesIn(lastWeekFrom, lastWeekTo),
    minutesIn(sevenFrom, now),
  ]);

  return { today, thisWeek, lastWeek, sevenDayAvg: Math.round(sevenDay / 7) };
}
