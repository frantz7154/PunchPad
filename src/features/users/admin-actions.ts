"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { systemClock } from "@/lib/time";
import { requireAdmin } from "@/lib/auth";
import { toErrorEnvelope } from "@/lib/errors";
import { createUser, resetPassword, deactivateUser, changeRole } from "./admin-service";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  initialPassword: z.string().min(12),
  role: z.enum(["EMPLOYEE", "ADMIN"]),
  timezone: z.string().min(1),
});

export async function createUserAction(input: unknown) {
  try {
    const admin = await requireAdmin();
    const p = createSchema.parse(input);
    const u = await createUser({ prisma, clock: systemClock }, admin.id, p);
    revalidatePath("/admin/users");
    return { ok: true as const, userId: u.id };
  } catch (e) {
    return toErrorEnvelope(e);
  }
}

const resetSchema = z.object({ userId: z.string().min(1), newPassword: z.string().min(12) });
export async function resetPasswordAction(input: unknown) {
  try {
    const admin = await requireAdmin();
    const p = resetSchema.parse(input);
    await resetPassword({ prisma, clock: systemClock }, admin.id, p.userId, p.newPassword);
    revalidatePath("/admin/users");
    return { ok: true as const };
  } catch (e) {
    return toErrorEnvelope(e);
  }
}

const idSchema = z.object({ userId: z.string().min(1) });
export async function deactivateUserAction(input: unknown) {
  try {
    const admin = await requireAdmin();
    const p = idSchema.parse(input);
    await deactivateUser({ prisma, clock: systemClock }, admin.id, p.userId);
    revalidatePath("/admin/users");
    return { ok: true as const };
  } catch (e) {
    return toErrorEnvelope(e);
  }
}

const roleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["EMPLOYEE", "ADMIN"]),
});
export async function changeRoleAction(input: unknown) {
  try {
    const admin = await requireAdmin();
    const p = roleSchema.parse(input);
    await changeRole({ prisma, clock: systemClock }, admin.id, p.userId, p.role);
    revalidatePath("/admin/users");
    return { ok: true as const };
  } catch (e) {
    return toErrorEnvelope(e);
  }
}
