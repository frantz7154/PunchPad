import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    /* ignore */
  }
  return NextResponse.json(
    { ok: dbOk, db: dbOk ? "up" : "down", commit: process.env.GIT_COMMIT ?? "unknown" },
    { status: dbOk ? 200 : 503 },
  );
}
