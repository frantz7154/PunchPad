"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { changeOwnPassword } from "./service";
import { toErrorEnvelope } from "@/lib/errors";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
});

export async function changeOwnPasswordAction(input: unknown) {
  try {
    const user = await requireUser();
    const data = schema.parse(input);
    await changeOwnPassword(prisma, user.id, data.currentPassword, data.newPassword);
    revalidatePath("/clock");
    return { ok: true as const, email: user.email };
  } catch (err) {
    return toErrorEnvelope(err);
  }
}
