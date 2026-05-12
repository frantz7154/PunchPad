"use client";
import { Fragment, useState } from "react";

type Row = {
  id: string;
  at: string;
  actor: { email: string; name: string };
  action: string;
  targetSessionId: string | null;
  reason: string | null;
  before: unknown;
  after: unknown;
};

export function AuditTable({ rows }: { rows: Row[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (rows.length === 0)
    return (
      <p className="text-sm text-[var(--text-dim)]" data-testid="audit-empty">
        No audit entries match.
      </p>
    );
  return (
    <div
      className="overflow-x-auto rounded-xl border border-[var(--border)]"
      data-testid="audit-table"
    >
      <table className="min-w-full divide-y divide-[var(--border)] text-sm">
        <thead className="bg-[var(--bg-elev)] text-left text-xs uppercase tracking-wider text-[var(--text-dim)]">
          <tr>
            <th className="px-4 py-2">When</th>
            <th className="px-4 py-2">Actor</th>
            <th className="px-4 py-2">Action</th>
            <th className="px-4 py-2">Target</th>
            <th className="px-4 py-2">Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((r) => (
            <Fragment key={r.id}>
              <tr
                className="cursor-pointer hover:bg-[var(--bg-elev-2)]"
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                data-testid={`audit-row-${r.id}`}
              >
                <td className="px-4 py-3 font-mono text-xs">
                  {r.at.replace("T", " ").slice(0, 19)}Z
                </td>
                <td className="px-4 py-3">
                  {r.actor.name}{" "}
                  <span className="text-[var(--text-dim)]">({r.actor.email})</span>
                </td>
                <td className="px-4 py-3 font-mono">{r.action}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.targetSessionId ?? "—"}</td>
                <td className="px-4 py-3">{r.reason ?? ""}</td>
              </tr>
              {expanded === r.id && (
                <tr>
                  <td colSpan={5} className="bg-[var(--bg-elev-2)] px-4 py-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <h3 className="text-xs uppercase text-[var(--text-dim)]">Before</h3>
                        <pre className="overflow-x-auto rounded bg-[var(--bg)] p-3 text-xs">
                          {JSON.stringify(r.before, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h3 className="text-xs uppercase text-[var(--text-dim)]">After</h3>
                        <pre className="overflow-x-auto rounded bg-[var(--bg)] p-3 text-xs">
                          {JSON.stringify(r.after, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
