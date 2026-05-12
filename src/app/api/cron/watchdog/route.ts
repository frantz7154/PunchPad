import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { systemClock } from "@/lib/time";
import { env } from "@/lib/env";
import { verifyCronSecret } from "@/lib/cron";
import { runWatchdog } from "@/features/cron/watchdog-service";
import { dispatchNotification } from "@/features/cron/notify";
import { toErrorEnvelope } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    verifyCronSecret(req);
    const result = await runWatchdog({
      prisma,
      clock: systemClock,
      warnHours: env.WATCHDOG_WARN_HOURS,
      closeHours: env.WATCHDOG_CLOSE_HOURS,
      systemUserId: "system",
      notify: dispatchNotification,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const envelope = toErrorEnvelope(err);
    const status = "code" in envelope && envelope.code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json(envelope, { status });
  }
}
