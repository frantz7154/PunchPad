import type { PrismaClient } from "@/generated/prisma/client";
import { durationMinutes, startOfDayInTz, startOfWeekInTz } from "@/lib/time";

export async function getOpenSession(prisma: PrismaClient, userId: string) {
  return prisma.timeSession.findFirst({
    where: { userId, clockOutAt: null, deletedAt: null },
  });
}

export async function getTodayStats(
  prisma: PrismaClient,
  userId: string,
  tz: string,
  now: Date,
) {
  const start = startOfDayInTz(now, tz);
  const sessions = await prisma.timeSession.findMany({
    where: { userId, deletedAt: null, clockInAt: { gte: start } },
  });
  let minutes = 0;
  for (const s of sessions) {
    const end = s.clockOutAt ?? now;
    minutes += durationMinutes(s.clockInAt, end);
  }
  return { minutes, sessionCount: sessions.length };
}

export async function getWeekStats(prisma: PrismaClient, userId: string, tz: string, now: Date) {
  const start = startOfWeekInTz(now, tz);
  const sessions = await prisma.timeSession.findMany({
    where: { userId, deletedAt: null, clockInAt: { gte: start } },
  });
  let minutes = 0;
  for (const s of sessions) {
    const end = s.clockOutAt ?? now;
    minutes += durationMinutes(s.clockInAt, end);
  }
  return { minutes, sessionCount: sessions.length };
}

export async function getRecentSessions(prisma: PrismaClient, userId: string, limit = 5) {
  return prisma.timeSession.findMany({
    where: { userId, deletedAt: null, clockOutAt: { not: null } },
    orderBy: { clockInAt: "desc" },
    take: limit,
  });
}

export function formatHm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}
