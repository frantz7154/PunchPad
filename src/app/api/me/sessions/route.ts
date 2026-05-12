import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { startOfDayInTz, endOfDayInTz } from "@/lib/time";

export async function GET(req: Request) {
  const user = await requireUser();
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  if (!date)
    return NextResponse.json(
      { ok: false, code: "VALIDATION", message: "date is required" },
      { status: 400 },
    );
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d)
    return NextResponse.json(
      { ok: false, code: "VALIDATION", message: "date must be YYYY-MM-DD" },
      { status: 400 },
    );
  const noon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const from = startOfDayInTz(noon, user.timezone);
  const to = endOfDayInTz(noon, user.timezone);
  const sessions = await prisma.timeSession.findMany({
    where: { userId: user.id, deletedAt: null, clockInAt: { gte: from, lte: to } },
    orderBy: { clockInAt: "asc" },
  });
  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      clockInAt: s.clockInAt.toISOString(),
      clockOutAt: s.clockOutAt?.toISOString() ?? null,
      autoClosed: s.autoClosed,
      notes: s.notes,
    })),
  });
}
