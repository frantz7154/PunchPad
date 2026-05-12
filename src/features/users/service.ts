import type { PrismaClient } from "@/generated/prisma/client";
import { hashPassword, verifyPassword } from "@/lib/password";
import { ValidationError, NotFoundError } from "@/lib/errors";

export async function changeOwnPassword(
  prisma: PrismaClient,
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (newPassword.length < 12)
    throw new ValidationError("New password must be at least 12 characters.");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError();
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new ValidationError("Current password is incorrect.");
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });
}
