"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { systemClock } from "@/lib/time";
import { requireUser, requireAdmin } from "@/lib/auth";
import { toErrorEnvelope, ValidationError } from "@/lib/errors";
import {
  clockIn,
  clockOut,
  editOwnSession,
  adminEditSession,
  adminDeleteSession,
} from "./service";

const editPatchSchema = z.object({
  sessionId: z.string().min(1),
  clockInAt: z.string().datetime().optional(),
  clockOutAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  reason: z.string().max(500).optional(),
});

function patchFromInput(input: z.infer<typeof editPatchSchema>) {
  return {
    clockInAt: input.clockInAt ? new Date(input.clockInAt) : undefined,
    clockOutAt:
      input.clockOutAt === undefined
        ? undefined
        : input.clockOutAt === null
          ? null
          : new Date(input.clockOutAt),
    notes: input.notes,
    reason: input.reason,
  };
}

export async function clockInAction() {
  try {
    const user = await requireUser();
    const s = await clockIn({ prisma, clock: systemClock }, user.id);
    revalidatePath("/clock");
    revalidatePath("/calendar");
    return { ok: true as const, sessionId: s.id };
  } catch (err) {
    return toErrorEnvelope(err);
  }
}

export async function clockOutAction() {
  try {
    const user = await requireUser();
    const s = await clockOut({ prisma, clock: systemClock }, user.id);
    revalidatePath("/clock");
    revalidatePath("/calendar");
    revalidatePath("/reports");
    return { ok: true as const, sessionId: s.id };
  } catch (err) {
    return toErrorEnvelope(err);
  }
}

export async function editOwnSessionAction(input: unknown) {
  try {
    const user = await requireUser();
    const parsed = editPatchSchema.parse(input);
    const patch = patchFromInput(parsed);
    const definedKeys = Object.entries(patch).filter(([, v]) => v !== undefined);
    if (definedKeys.length === 0) throw new ValidationError("Patch is empty.");
    const s = await editOwnSession(
      { prisma, clock: systemClock },
      user.id,
      parsed.sessionId,
      patch,
    );
    revalidatePath("/calendar");
    revalidatePath("/reports");
    return { ok: true as const, sessionId: s.id };
  } catch (err) {
    return toErrorEnvelope(err);
  }
}

export async function adminEditSessionAction(input: unknown) {
  try {
    const admin = await requireAdmin();
    const parsed = editPatchSchema.parse(input);
    const patch = patchFromInput(parsed);
    const s = await adminEditSession(
      { prisma, clock: systemClock },
      admin.id,
      parsed.sessionId,
      patch,
    );
    revalidatePath("/admin/audit");
    revalidatePath("/reports");
    return { ok: true as const, sessionId: s.id };
  } catch (err) {
    return toErrorEnvelope(err);
  }
}

const deleteSchema = z.object({
  sessionId: z.string().min(1),
  reason: z.string().min(1).max(500),
});

export async function adminDeleteSessionAction(input: unknown) {
  try {
    const admin = await requireAdmin();
    const parsed = deleteSchema.parse(input);
    await adminDeleteSession(
      { prisma, clock: systemClock },
      admin.id,
      parsed.sessionId,
      parsed.reason,
    );
    revalidatePath("/admin/audit");
    revalidatePath("/reports");
    return { ok: true as const };
  } catch (err) {
    return toErrorEnvelope(err);
  }
}
