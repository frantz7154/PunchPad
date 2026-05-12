import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  const open = await prisma.timeSession.findFirst({
    where: { userId: user.id, clockOutAt: null, deletedAt: null },
    select: { clockInAt: true },
  });
  if (!open) return NextResponse.json({ open: false }, { status: 404 });
  return NextResponse.json({ clockInAt: open.clockInAt.toISOString() });
}
