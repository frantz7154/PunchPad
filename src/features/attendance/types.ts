import type { TimeSession } from "@/generated/prisma/client";

export type SessionSnapshot = {
  id: string;
  userId: string;
  clockInAt: string;
  clockOutAt: string | null;
  autoClosed: boolean;
  notes: string | null;
  deletedAt: string | null;
};

export type SessionPatch = {
  clockInAt?: Date;
  clockOutAt?: Date | null;
  notes?: string | null;
  reason?: string;
};

export function snapshot(s: TimeSession): SessionSnapshot {
  return {
    id: s.id,
    userId: s.userId,
    clockInAt: s.clockInAt.toISOString(),
    clockOutAt: s.clockOutAt?.toISOString() ?? null,
    autoClosed: s.autoClosed,
    notes: s.notes,
    deletedAt: s.deletedAt?.toISOString() ?? null,
  };
}
