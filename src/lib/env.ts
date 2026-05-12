import { z } from "zod";

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_INITIAL_PASSWORD: z.string().min(12),
  CRON_SECRET: z.string().min(32),
  WATCHDOG_WARN_HOURS: z.coerce.number().int().positive().default(12),
  WATCHDOG_CLOSE_HOURS: z.coerce.number().int().positive().default(18),
  EMAIL_TRANSPORT: z.enum(["resend", "smtp"]).default("resend"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().min(1),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  TZ_DEFAULT: z.string().default("America/Chicago"),
  DIGEST_SEND_HOUR_LOCAL: z.coerce.number().int().min(0).max(23).default(7),
});

const refined = baseSchema.superRefine((v, ctx) => {
  if (v.WATCHDOG_CLOSE_HOURS <= v.WATCHDOG_WARN_HOURS) {
    ctx.addIssue({
      code: "custom",
      path: ["WATCHDOG_CLOSE_HOURS"],
      message: "WATCHDOG_CLOSE_HOURS must be > WATCHDOG_WARN_HOURS",
    });
  }
  if (v.EMAIL_TRANSPORT === "resend" && !v.RESEND_API_KEY) {
    ctx.addIssue({
      code: "custom",
      path: ["RESEND_API_KEY"],
      message: "RESEND_API_KEY required for resend transport",
    });
  }
  if (v.EMAIL_TRANSPORT === "smtp") {
    const smtpFields = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"] as const;
    for (const k of smtpFields) {
      if (!v[k]) {
        ctx.addIssue({
          code: "custom",
          path: [k],
          message: `${k} required for smtp transport`,
        });
      }
    }
  }
});

export type Env = z.infer<typeof baseSchema>;

export function buildEnv(source: Record<string, string | undefined>): Env {
  const result = refined.safeParse(source);
  if (!result.success) {
    const flat = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${flat}`);
  }
  return result.data;
}

export const env: Env =
  process.env["SKIP_ENV_VALIDATION"] === "1"
    ? (process.env as unknown as Env)
    : buildEnv(process.env);
