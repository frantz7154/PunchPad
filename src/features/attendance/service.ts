import type { PrismaClient, TimeSession } from "@/generated/prisma/client";
import type { Clock } from "@/lib/time";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { snapshot, type SessionPatch } from "./types";

export type ServiceDeps = { prisma: PrismaClient; clock: Clock };

const SEVEN_DAYS_MS = 7 * 24 * 3_600_000;

export function rangesOverlap(
  aIn: Date,
  aOut: Date | null,
  bIn: Date,
  bOut: Date | null,
): boolean {
  const FAR = new Date(8.64e15);
  const aEnd = aOut ?? FAR;
  const bEnd = bOut ?? FAR;
  return aIn < bEnd && bIn < aEnd;
}

export async function clockIn(
  { prisma, clock }: ServiceDeps,
  userId: string,
): Promise<TimeSession> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.deactivatedAt) throw new ForbiddenError("Account is deactivated.");
    try {
      const session = await tx.timeSession.create({
        data: { userId, clockInAt: clock.now() },
      });
      await tx.auditLog.create({
        data: { actorUserId: userId, targetSessionId: session.id, action: "CLOCK_IN" },
      });
      return session;
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") {
        throw new ConflictError("ALREADY_CLOCKED_IN", "You are already clocked in.");
      }
      throw e;
    }
  });
}

export async function clockOut(
  { prisma, clock }: ServiceDeps,
  userId: string,
): Promise<TimeSession> {
  return prisma.$transaction(async (tx) => {
    const open = await tx.timeSession.findFirst({
      where: { userId, clockOutAt: null, deletedAt: null },
    });
    if (!open) throw new NotFoundError("You are not clocked in.");
    const updated = await tx.timeSession.update({
      where: { id: open.id },
      data: { clockOutAt: clock.now() },
    });
    await tx.auditLog.create({
      data: { actorUserId: userId, targetSessionId: open.id, action: "CLOCK_OUT" },
    });
    return updated;
  });
}

function validatePatch(
  now: Date,
  s: TimeSession,
  patch: SessionPatch,
): { nextIn: Date; nextOut: Date | null } {
  const nextIn = patch.clockInAt ?? s.clockInAt;
  const nextOut = patch.clockOutAt === undefined ? s.clockOutAt : patch.clockOutAt;
  if (nextOut !== null && nextIn >= nextOut)
    throw new ValidationError("clockInAt must be before clockOutAt.");
  if (nextIn > now) throw new ValidationError("clockInAt cannot be in the future.");
  if (nextOut !== null && nextOut > now)
    throw new ValidationError("clockOutAt cannot be in the future.");
  return { nextIn, nextOut };
}

export async function editOwnSession(
  { prisma, clock }: ServiceDeps,
  userId: string,
  sessionId: string,
  patch: SessionPatch,
): Promise<TimeSession> {
  return prisma.$transaction(async (tx) => {
    const s = await tx.timeSession.findUnique({ where: { id: sessionId } });
    if (!s || s.deletedAt) throw new NotFoundError();
    if (s.userId !== userId) throw new ForbiddenError();
    const now = clock.now();
    if (now.getTime() - s.clockInAt.getTime() > SEVEN_DAYS_MS) {
      throw new ForbiddenError("OUTSIDE_EDIT_WINDOW: session is older than 7 days.");
    }

    const { nextIn, nextOut } = validatePatch(now, s, patch);

    const others = await tx.timeSession.findMany({
      where: { userId, id: { not: sessionId }, deletedAt: null },
    });
    for (const o of others) {
      if (rangesOverlap(nextIn, nextOut, o.clockInAt, o.clockOutAt)) {
        throw new ConflictError("OVERLAP", "Edit would overlap an existing session.");
      }
    }

    const before = snapshot(s);
    const updated = await tx.timeSession.update({
      where: { id: sessionId },
      data: {
        clockInAt: nextIn,
        clockOutAt: nextOut,
        notes: patch.notes ?? s.notes,
      },
    });
    const after = snapshot(updated);
    await tx.auditLog.create({
      data: {
        actorUserId: userId,
        targetSessionId: sessionId,
        action: "EDIT_SESSION",
        before,
        after,
        reason: patch.reason ?? null,
      },
    });
    return updated;
  });
}

export async function adminEditSession(
  { prisma, clock }: ServiceDeps,
  adminId: string,
  sessionId: string,
  patch: SessionPatch,
): Promise<TimeSession> {
  return prisma.$transaction(async (tx) => {
    const s = await tx.timeSession.findUnique({ where: { id: sessionId } });
    if (!s || s.deletedAt) throw new NotFoundError();
    const now = clock.now();
    const { nextIn, nextOut } = validatePatch(now, s, patch);

    const others = await tx.timeSession.findMany({
      where: { userId: s.userId, id: { not: sessionId }, deletedAt: null },
    });
    for (const o of others) {
      if (rangesOverlap(nextIn, nextOut, o.clockInAt, o.clockOutAt)) {
        throw new ConflictError("OVERLAP", "Edit would overlap an existing session.");
      }
    }

    const before = snapshot(s);
    const updated = await tx.timeSession.update({
      where: { id: sessionId },
      data: { clockInAt: nextIn, clockOutAt: nextOut, notes: patch.notes ?? s.notes },
    });
    const after = snapshot(updated);
    await tx.auditLog.create({
      data: {
        actorUserId: adminId,
        targetSessionId: sessionId,
        action: "EDIT_SESSION",
        before,
        after,
        reason: patch.reason ?? null,
      },
    });
    return updated;
  });
}

export async function adminDeleteSession(
  { prisma, clock }: ServiceDeps,
  adminId: string,
  sessionId: string,
  reason: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const s = await tx.timeSession.findUnique({ where: { id: sessionId } });
    if (!s || s.deletedAt) throw new NotFoundError();
    const before = snapshot(s);
    const updated = await tx.timeSession.update({
      where: { id: sessionId },
      data: { deletedAt: clock.now() },
    });
    const after = snapshot(updated);
    await tx.auditLog.create({
      data: {
        actorUserId: adminId,
        targetSessionId: sessionId,
        action: "DELETE_SESSION",
        before,
        after,
        reason,
      },
    });
  });
}
