import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
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

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
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
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        const u = user as {
          id: string;
          email: string;
          name: string;
          role: "EMPLOYEE" | "ADMIN";
          timezone: string;
          mustChangePassword: boolean;
        };
        token.id = u.id;
        token.email = u.email;
        token.name = u.name;
        token.role = u.role;
        token.timezone = u.timezone;
        token.mustChangePassword = u.mustChangePassword;
      }
      return token;
    },
    session: ({ session, token }) => {
      // Custom session shape per src/types/next-auth.d.ts
      (session as unknown as { user: Record<string, unknown> }).user = {
        id: token.id,
        email: token.email,
        name: token.name,
        role: token.role,
        timezone: token.timezone,
        mustChangePassword: token.mustChangePassword,
      };
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

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
