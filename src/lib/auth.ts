import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { isLockedOut, recordAttempt } from "@/features/auth/lockout";
import { systemClock } from "@/lib/time";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const credSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = credSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();

        if (await isLockedOut(prisma, email, systemClock)) {
          logger.warn({ email }, "login_locked_out");
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.deactivatedAt) {
          await recordAttempt(prisma, email, false, systemClock);
          return null;
        }
        const ok = await verifyPassword(user.passwordHash, parsed.data.password);
        await recordAttempt(prisma, email, ok, systemClock);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          timezone: user.timezone,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
});

export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  return session.user;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "ADMIN") throw new ForbiddenError();
  return u;
}
