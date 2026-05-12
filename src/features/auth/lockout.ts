import type { PrismaClient } from "@/generated/prisma/client";
import type { Clock } from "@/lib/time";

const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;

export async function recordAttempt(
  prisma: PrismaClient,
  email: string,
  succeeded: boolean,
  clock: Clock,
): Promise<void> {
  await prisma.loginAttempt.create({
    data: { email: email.toLowerCase(), succeeded, at: clock.now() },
  });
}

export async function isLockedOut(
  prisma: PrismaClient,
  email: string,
  clock: Clock,
): Promise<boolean> {
  const now = clock.now();
  const since = new Date(now.getTime() - WINDOW_MS);
  const recent = await prisma.loginAttempt.findMany({
    where: { email: email.toLowerCase(), at: { gte: since } },
    orderBy: { at: "desc" },
    take: MAX_FAILURES + 1,
  });
  const sinceLastSuccess: typeof recent = [];
  for (const a of recent) {
    if (a.succeeded) break;
    sinceLastSuccess.push(a);
  }
  return sinceLastSuccess.length >= MAX_FAILURES;
}

export async function pruneOldAttempts(prisma: PrismaClient, clock: Clock): Promise<number> {
  const cutoff = new Date(clock.now().getTime() - 24 * 3_600_000);
  const r = await prisma.loginAttempt.deleteMany({ where: { at: { lt: cutoff } } });
  return r.count;
}
