import type { PrismaClient } from "@/generated/prisma/client";
import type { Clock } from "@/lib/time";
import { snapshot } from "@/features/attendance/types";
import { logger } from "@/lib/logger";

export type WatchdogDeps = {
  prisma: PrismaClient;
  clock: Clock;
  warnHours: number;
  closeHours: number;
  systemUserId: string;
  notify: (
    kind: "warn" | "auto_close" | "admin_auto_close",
    payload: Record<string, unknown>,
  ) => void | Promise<void>;
};

export async function runWatchdog(d: WatchdogDeps): Promise<{ warned: number; closed: number }> {
  const now = d.clock.now();
  const warnCutoff = new Date(now.getTime() - d.warnHours * 3_600_000);
  const closeCutoff = new Date(now.getTime() - d.closeHours * 3_600_000);

  // Warn pass: open, not yet warned, clockInAt <= warnCutoff
  const toWarn = await d.prisma.timeSession.findMany({
    where: {
      clockOutAt: null,
      deletedAt: null,
      warnedAt: null,
      clockInAt: { lte: warnCutoff },
    },
    include: { user: { select: { email: true, name: true } } },
  });
  for (const s of toWarn) {
    await d.prisma.timeSession.update({ where: { id: s.id }, data: { warnedAt: now } });
    await d.notify("warn", {
      userId: s.userId,
      email: s.user.email,
      sessionId: s.id,
      clockInAt: s.clockInAt.toISOString(),
    });
    logger.info({ component: "watchdog", sessionId: s.id }, "watchdog_warned");
  }

  // Close pass: open, clockInAt <= closeCutoff
  const toClose = await d.prisma.timeSession.findMany({
    where: { clockOutAt: null, deletedAt: null, clockInAt: { lte: closeCutoff } },
    include: { user: { select: { email: true, name: true } } },
  });
  for (const s of toClose) {
    const closeAt = new Date(s.clockInAt.getTime() + d.closeHours * 3_600_000);
    const before = snapshot(s);
    const updated = await d.prisma.timeSession.update({
      where: { id: s.id },
      data: { clockOutAt: closeAt, autoClosed: true },
    });
    const after = snapshot(updated);
    await d.prisma.auditLog.create({
      data: {
        actorUserId: d.systemUserId,
        targetSessionId: s.id,
        action: "AUTO_CLOSE",
        before,
        after,
        reason: "Exceeded watchdog threshold",
      },
    });
    await d.notify("auto_close", {
      userId: s.userId,
      email: s.user.email,
      sessionId: s.id,
      closeAt: closeAt.toISOString(),
    });

    const admins = await d.prisma.user.findMany({
      where: { role: "ADMIN", deactivatedAt: null, id: { not: "system" } },
      select: { id: true, email: true },
    });
    for (const a of admins) {
      await d.notify("admin_auto_close", {
        adminId: a.id,
        adminEmail: a.email,
        subjectUserId: s.userId,
        subjectEmail: s.user.email,
        sessionId: s.id,
      });
    }
    logger.info({ component: "watchdog", sessionId: s.id }, "watchdog_auto_closed");
  }

  return { warned: toWarn.length, closed: toClose.length };
}
