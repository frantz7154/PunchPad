import type { NextAuthConfig } from "next-auth";

// Edge-safe auth config: no DB-backed providers, no Prisma.
// Used by middleware (Edge Runtime). The full config with Credentials provider
// lives in src/lib/auth.ts and is only imported by Node-runtime API routes.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [],
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
