import { formatHm } from "@/features/attendance/queries";
import type { KpiSet } from "../types";

export function KpiRow({ k }: { k: KpiSet }) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <Card label="Today" value={formatHm(k.today)} testId="kpi-today" />
      <Card label="This week" value={formatHm(k.thisWeek)} testId="kpi-this-week" />
      <Card label="Last week" value={formatHm(k.lastWeek)} testId="kpi-last-week" />
      <Card label="7-day avg" value={formatHm(k.sevenDayAvg)} testId="kpi-7d-avg" />
    </div>
  );
}

function Card({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-4">
      <p className="text-xs uppercase tracking-wider text-[var(--text-dim)]">{label}</p>
      <p className="mt-1 font-mono text-2xl tabular-nums" data-testid={testId}>
        {value}
      </p>
    </div>
  );
}
