import type { Role } from "@/generated/prisma/client";
import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    role: Role;
    timezone: string;
    mustChangePassword: boolean;
  }
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      timezone: string;
      mustChangePassword: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: Role;
    timezone: string;
    mustChangePassword: boolean;
  }
}
