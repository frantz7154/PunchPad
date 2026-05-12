import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { systemClock } from "@/lib/time";
import { env } from "@/lib/env";
import { verifyCronSecret } from "@/lib/cron";
import { runWeeklyDigest } from "@/features/cron/digest-service";
import { getDefaultTransport, sendEmail } from "@/lib/email";
import { toErrorEnvelope } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    verifyCronSecret(req);
    const transport = getDefaultTransport();
    const result = await runWeeklyDigest({
      prisma,
      clock: systemClock,
      sendHourLocal: env.DIGEST_SEND_HOUR_LOCAL,
      send: async (msg) => sendEmail(transport, msg),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const envelope = toErrorEnvelope(err);
    const status = "code" in envelope && envelope.code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json(envelope, { status });
  }
}
