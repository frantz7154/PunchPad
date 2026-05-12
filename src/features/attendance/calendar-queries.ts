import type { PrismaClient, TimeSession } from "@/generated/prisma/client";
import { formatLocal } from "@/lib/time";

export async function sessionsInRange(
  prisma: PrismaClient,
  userId: string,
  from: Date,
  to: Date,
): Promise<TimeSession[]> {
  return prisma.timeSession.findMany({
    where: {
      userId,
      deletedAt: null,
      OR: [
        { clockInAt: { gte: from, lt: to } },
        { AND: [{ clockInAt: { lt: from } }, { clockOutAt: { gt: from } }] },
      ],
    },
    orderBy: { clockInAt: "asc" },
  });
}

export function bucketByLocalDay<T extends Pick<TimeSession, "id" | "clockInAt" | "clockOutAt">>(
  sessions: ReadonlyArray<T>,
  tz: string,
): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const s of sessions) {
    const day = formatLocal(s.clockInAt, tz, "yyyy-MM-dd");
    (out[day] ??= []).push(s);
  }
  return out;
}
