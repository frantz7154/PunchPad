import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { systemClock, formatLocal, durationMinutes } from "@/lib/time";
import {
  getOpenSession,
  getTodayStats,
  getWeekStats,
  getRecentSessions,
  formatHm,
} from "@/features/attendance/queries";
import { ClockHero } from "@/features/attendance/components/clock-hero";

export const dynamic = "force-dynamic";

export default async function ClockPage() {
  const user = await requireUser();
  const now = systemClock.now();
  const [open, today, week, recent] = await Promise.all([
    getOpenSession(prisma, user.id),
    getTodayStats(prisma, user.id, user.timezone, now),
    getWeekStats(prisma, user.id, user.timezone, now),
    getRecentSessions(prisma, user.id, 5),
  ]);

  return (
    <div className="space-y-6">
      <ClockHero
        open={
          open
            ? {
                clockInAt: open.clockInAt.toISOString(),
                startedAtLocal: formatLocal(open.clockInAt, user.timezone, "h:mm a · EEEE"),
              }
            : null
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Today" value={formatHm(today.minutes)} testId="stat-today" />
        <Stat label="This week" value={formatHm(week.minutes)} testId="stat-week" />
        <Stat
          label="Sessions today"
          value={String(today.sessionCount)}
          testId="stat-sessions"
        />
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-5">
        <h2 className="mb-3 font-display text-sm uppercase tracking-wider text-[var(--text-dim)]">
          Recent
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-[var(--text-ghost)]" data-testid="recent-empty">
            No completed sessions yet.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]" data-testid="recent-list">
            {recent.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between py-3 text-sm"
              >
                <span className="font-mono text-[var(--text-dim)]">
                  {formatLocal(s.clockInAt, user.timezone, "EEE  h:mma")} →{" "}
                  {s.clockOutAt ? formatLocal(s.clockOutAt, user.timezone, "h:mma") : "—"}
                </span>
                <span className="font-mono">
                  {formatHm(
                    durationMinutes(s.clockInAt, s.clockOutAt ?? now),
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-5">
      <p className="text-xs uppercase tracking-wider text-[var(--text-dim)]">{label}</p>
      <p className="mt-1 font-mono text-2xl tabular-nums" data-testid={testId}>
        {value}
      </p>
    </div>
  );
}
