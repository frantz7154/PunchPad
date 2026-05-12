import { Resend } from "resend";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export type EmailMessage = { to: string; subject: string; html: string };
export type EmailTransport =
  | {
      kind: "resend";
      send: (msg: EmailMessage & { from: string }) => Promise<unknown>;
    }
  | {
      kind: "smtp";
      send: (msg: EmailMessage & { from: string }) => Promise<unknown>;
    };

let cached: EmailTransport | null = null;

export function getDefaultTransport(): EmailTransport {
  if (cached) return cached;
  if (env.EMAIL_TRANSPORT === "resend") {
    const resend = new Resend(env.RESEND_API_KEY!);
    cached = {
      kind: "resend",
      send: async (msg) =>
        resend.emails.send({
          from: msg.from,
          to: [msg.to],
          subject: msg.subject,
          html: msg.html,
        }),
    };
  } else {
    const tx: Transporter = nodemailer.createTransport({
      host: env.SMTP_HOST!,
      port: env.SMTP_PORT!,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER!, pass: env.SMTP_PASS! },
    });
    cached = {
      kind: "smtp",
      send: async (msg) =>
        tx.sendMail({ from: msg.from, to: msg.to, subject: msg.subject, html: msg.html }),
    };
  }
  return cached;
}

export async function sendEmail(transport: EmailTransport, msg: EmailMessage): Promise<void> {
  try {
    await transport.send({ ...msg, from: env.EMAIL_FROM });
  } catch (err) {
    logger.error(
      { component: "email", to: msg.to, err: (err as Error).message },
      "email_send_failed",
    );
    throw err;
  }
}
