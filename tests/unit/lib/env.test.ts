import { describe, it, expect } from "vitest";
import { buildEnv } from "@/lib/env";

describe("buildEnv", () => {
  const base = {
    NODE_ENV: "test",
    NEXTAUTH_URL: "http://localhost:3000",
    NEXTAUTH_SECRET: "x".repeat(32),
    DATABASE_URL: "postgresql://u:p@localhost:5432/db",
    ADMIN_EMAIL: "admin@example.com",
    ADMIN_INITIAL_PASSWORD: "y".repeat(12),
    CRON_SECRET: "z".repeat(32),
    WATCHDOG_WARN_HOURS: "12",
    WATCHDOG_CLOSE_HOURS: "18",
    EMAIL_TRANSPORT: "resend",
    RESEND_API_KEY: "re_test",
    EMAIL_FROM: "PunchPad <punchpad@example.com>",
    TZ_DEFAULT: "America/Chicago",
    DIGEST_SEND_HOUR_LOCAL: "7",
  };

  it("parses a full valid environment", () => {
    const env = buildEnv(base);
    expect(env.NEXTAUTH_SECRET).toHaveLength(32);
    expect(env.WATCHDOG_WARN_HOURS).toBe(12);
    expect(env.EMAIL_TRANSPORT).toBe("resend");
  });

  it("rejects a short NEXTAUTH_SECRET", () => {
    expect(() => buildEnv({ ...base, NEXTAUTH_SECRET: "short" })).toThrow();
  });

  it("rejects bad pair: smtp transport with no SMTP_HOST", () => {
    expect(() => buildEnv({ ...base, EMAIL_TRANSPORT: "smtp" })).toThrow(/SMTP_HOST/);
  });

  it("rejects ADMIN_INITIAL_PASSWORD shorter than 12", () => {
    expect(() => buildEnv({ ...base, ADMIN_INITIAL_PASSWORD: "short" })).toThrow();
  });
});
