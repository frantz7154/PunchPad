import { getDefaultTransport, sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export async function dispatchNotification(
  kind: "warn" | "auto_close" | "admin_auto_close",
  payload: Record<string, unknown>,
): Promise<void> {
  const t = getDefaultTransport();
  if (kind === "warn") {
    await sendEmail(t, {
      to: String(payload.email),
      subject: "PunchPad: still working?",
      html: `<p>You've been clocked in for over ${env.WATCHDOG_WARN_HOURS} hours. If that's expected, ignore this. Otherwise, please clock out.</p>`,
    });
  } else if (kind === "auto_close") {
    await sendEmail(t, {
      to: String(payload.email),
      subject: "PunchPad: session auto-closed",
      html: `<p>Your session was automatically closed after ${env.WATCHDOG_CLOSE_HOURS} hours. Edit it in PunchPad if needed.</p>`,
    });
  } else if (kind === "admin_auto_close") {
    await sendEmail(t, {
      to: String(payload.adminEmail),
      subject: `PunchPad: user ${payload.subjectEmail} auto-closed`,
      html: `<p>User <strong>${payload.subjectEmail}</strong> had a session auto-closed.</p>`,
    });
  }
  logger.info({ component: "notify", kind, payload }, "notification_sent");
}
