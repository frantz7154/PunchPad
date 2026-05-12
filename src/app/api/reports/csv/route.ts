import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resolveRange, type RangeKey } from "@/features/reports/ranges";
import { systemClock, formatLocal, durationMinutes } from "@/lib/time";
import { csvHeader, csvRow } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser();
  const url = new URL(req.url);
  const key = (url.searchParams.get("range") as RangeKey) ?? "thisWeek";
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const custom =
    fromParam && toParam
      ? { from: new Date(`${fromParam}T00:00:00`), to: new Date(`${toParam}T23:59:59`) }
      : undefined;
  const range = resolveRange(key, systemClock.now(), user.timezone, custom);

  const userIdParam = url.searchParams.get("userId");
  const filterUserId = user.role === "ADMIN" ? (userIdParam ?? undefined) : user.id;

  const sessions = await prisma.timeSession.findMany({
    where: {
      deletedAt: null,
      ...(filterUserId ? { userId: filterUserId } : {}),
      clockInAt: { gte: range.from, lte: range.to },
    },
    include: {
      user: true,
      auditLogs: { where: { action: "EDIT_SESSION" }, select: { id: true } },
    },
    orderBy: [{ user: { email: "asc" } }, { clockInAt: "asc" }],
  });

  const tz = user.timezone;
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(
        enc.encode(
          csvHeader([
            "user_email",
            "user_name",
            "date_local",
            "session_id",
            "clock_in_local",
            "clock_out_local",
            "duration_minutes",
            "auto_closed",
            "edited",
            "notes",
            "clock_in_utc",
            "clock_out_utc",
          ]),
        ),
      );
      for (const s of sessions) {
        const date = formatLocal(s.clockInAt, tz, "yyyy-MM-dd");
        const inLocal = formatLocal(s.clockInAt, tz, "yyyy-MM-dd HH:mm");
        const outLocal = s.clockOutAt ? formatLocal(s.clockOutAt, tz, "yyyy-MM-dd HH:mm") : "";
        const minutes = durationMinutes(s.clockInAt, s.clockOutAt ?? systemClock.now());
        controller.enqueue(
          enc.encode(
            csvRow([
              s.user.email,
              s.user.name,
              date,
              s.id,
              inLocal,
              outLocal,
              minutes,
              s.autoClosed,
              s.auditLogs.length > 0,
              s.notes,
              s.clockInAt,
              s.clockOutAt,
            ]),
          ),
        );
      }
      controller.close();
    },
  });

  const fname = `punchpad-${range.from.toISOString().slice(0, 10)}_to_${range.to.toISOString().slice(0, 10)}.csv`;
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
