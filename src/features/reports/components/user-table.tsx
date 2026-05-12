import { formatHm } from "@/features/attendance/queries";
import type { UserRow } from "../types";

export function UserTable({ rows }: { rows: UserRow[] }) {
  if (rows.length === 0)
    return (
      <p className="text-sm text-[var(--text-dim)]" data-testid="report-empty">
        No sessions in this range.
      </p>
    );
  return (
    <div
      className="overflow-x-auto rounded-xl border border-[var(--border)]"
      data-testid="report-table"
    >
      <table className="min-w-full divide-y divide-[var(--border)]">
        <thead className="bg-[var(--bg-elev)] text-left text-xs uppercase tracking-wider text-[var(--text-dim)]">
          <tr>
            <th className="px-4 py-2">User</th>
            <th className="px-4 py-2">Total</th>
            <th className="px-4 py-2">Daily breakdown</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((r) => (
            <tr key={r.userId} data-testid={`row-${r.userId}`}>
              <td className="px-4 py-3">
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-[var(--text-dim)]">{r.email}</div>
              </td>
              <td className="px-4 py-3 font-mono">{formatHm(r.totalMinutes)}</td>
              <td className="px-4 py-3 text-sm">
                <ul className="flex flex-wrap gap-2">
                  {r.days.map((d) => (
                    <li
                      key={d.dateLocal}
                      className="rounded bg-[var(--bg-elev-2)] px-2 py-1 font-mono"
                    >
                      <span className="text-[var(--text-dim)]">{d.dateLocal.slice(5)}</span>{" "}
                      {formatHm(d.minutes)}
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
