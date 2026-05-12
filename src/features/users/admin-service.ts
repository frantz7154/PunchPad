import type { PrismaClient, User } from "@/generated/prisma/client";
import type { Clock } from "@/lib/time";
import { hashPassword } from "@/lib/password";
import { ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors";

export type Deps = { prisma: PrismaClient; clock: Clock };

export type CreateUserInput = {
  email: string;
  name: string;
  initialPassword: string;
  role: "EMPLOYEE" | "ADMIN";
  timezone: string;
};

export async function createUser(
  d: Deps,
  actorId: string,
  input: CreateUserInput,
): Promise<User> {
  if (input.initialPassword.length < 12)
    throw new ValidationError("Initial password must be at least 12 characters.");
  const email = input.email.toLowerCase();
  const exists = await d.prisma.user.findUnique({ where: { email } });
  if (exists) throw new ValidationError("A user with that email already exists.");
  const passwordHash = await hashPassword(input.initialPassword);
  const user = await d.prisma.user.create({
    data: {
      email,
      name: input.name,
      role: input.role,
      timezone: input.timezone,
      passwordHash,
      mustChangePassword: true,
    },
  });
  await d.prisma.auditLog.create({
    data: {
      actorUserId: actorId,
      action: "CREATE_USER",
      after: { id: user.id, email: user.email, role: user.role },
    },
  });
  return user;
}

export async function resetPassword(
  d: Deps,
  actorId: string,
  userId: string,
  newPassword: string,
): Promise<void> {
  if (newPassword.length < 12)
    throw new ValidationError("New password must be at least 12 characters.");
  const user = await d.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError();
  await d.prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword), mustChangePassword: true },
  });
  await d.prisma.auditLog.create({
    data: {
      actorUserId: actorId,
      action: "EDIT_SESSION",
      reason: "password reset",
      after: { userId },
    },
  });
}

async function isLastActiveAdmin(prisma: PrismaClient, userId: string): Promise<boolean> {
  const others = await prisma.user.count({
    where: {
      id: { not: userId, notIn: ["system"] },
      role: "ADMIN",
      deactivatedAt: null,
    },
  });
  return others === 0;
}

export async function deactivateUser(
  d: Deps,
  actorId: string,
  userId: string,
): Promise<void> {
  if (userId === "system") throw new ForbiddenError("Cannot deactivate the system user.");
  const user = await d.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError();
  if (user.role === "ADMIN" && (await isLastActiveAdmin(d.prisma, userId))) {
    throw new ForbiddenError("Cannot deactivate the last active admin.");
  }
  const before = { id: user.id, deactivatedAt: user.deactivatedAt?.toISOString() ?? null };
  const updated = await d.prisma.user.update({
    where: { id: userId },
    data: { deactivatedAt: d.clock.now() },
  });
  await d.prisma.auditLog.create({
    data: {
      actorUserId: actorId,
      action: "DEACTIVATE_USER",
      before,
      after: { id: updated.id, deactivatedAt: updated.deactivatedAt?.toISOString() ?? null },
    },
  });
}

export async function changeRole(
  d: Deps,
  actorId: string,
  userId: string,
  role: "EMPLOYEE" | "ADMIN",
): Promise<void> {
  if (userId === "system")
    throw new ForbiddenError("Cannot change the system user's role.");
  const user = await d.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError();
  if (user.role === role) return;
  if (
    user.role === "ADMIN" &&
    role === "EMPLOYEE" &&
    (await isLastActiveAdmin(d.prisma, userId))
  ) {
    throw new ForbiddenError("Cannot demote the last active admin.");
  }
  const before = { role: user.role };
  const updated = await d.prisma.user.update({
    where: { id: userId },
    data: { role },
  });
  await d.prisma.auditLog.create({
    data: {
      actorUserId: actorId,
      action: "ROLE_CHANGE",
      before,
      after: { role: updated.role },
    },
  });
}
