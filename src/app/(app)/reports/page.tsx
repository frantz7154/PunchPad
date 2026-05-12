import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { systemClock } from "@/lib/time";
import { resolveRange, type RangeKey } from "@/features/reports/ranges";
import { reportForRange, kpiSet } from "@/features/reports/service";
import { KpiRow } from "@/features/reports/components/kpi-row";
import { RangePicker } from "@/features/reports/components/range-picker";
import { UserTable } from "@/features/reports/components/user-table";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const now = systemClock.now();
  const key = (sp.range as RangeKey) ?? "thisWeek";
  const custom =
    sp.from && sp.to
      ? { from: new Date(`${sp.from}T00:00:00`), to: new Date(`${sp.to}T23:59:59`) }
      : undefined;
  const range = resolveRange(key, now, user.timezone, custom);

  const filterUserId = user.role === "ADMIN" ? sp.userId : user.id;

  const [rows, kpi, users] = await Promise.all([
    reportForRange(prisma, {
      from: range.from,
      to: range.to,
      timezone: user.timezone,
      userId: filterUserId,
    }),
    kpiSet(prisma, user.id, user.timezone, now),
    user.role === "ADMIN"
      ? prisma.user.findMany({
          where: { deactivatedAt: null, id: { not: "system" } },
          select: { id: true, name: true },
        })
      : Promise.resolve(undefined),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-semibold">Reports</h1>
      <KpiRow k={kpi} />
      <Suspense>
        <RangePicker users={users} />
      </Suspense>
      <UserTable rows={rows} />
    </div>
  );
}
