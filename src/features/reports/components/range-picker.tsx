"use client";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

const PRESETS: Array<{ key: string; label: string }> = [
  { key: "today", label: "Today" },
  { key: "thisWeek", label: "This week" },
  { key: "lastWeek", label: "Last week" },
  { key: "payPeriod", label: "Pay period" },
];

const btnBase =
  "inline-flex items-center rounded px-3 py-1.5 text-sm font-medium transition-colors";
const btnActive = "bg-[var(--accent)] text-white";
const btnIdle = "hover:bg-[var(--bg-elev-2)]";

export function RangePicker({ users }: { users?: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const active = params.get("range") ?? "thisWeek";

  function setQuery(updates: Record<string, string | null>) {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) sp.delete(k);
      else sp.set(k, v);
    }
    router.push(`${path}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3" data-testid="range-picker">
      <div className="flex gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`${btnBase} ${active === p.key ? btnActive : btnIdle}`}
            onClick={() => setQuery({ range: p.key, from: null, to: null })}
            data-testid={`preset-${p.key}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <div>
          <label className="block text-xs text-[var(--text-dim)]">From</label>
          <Input
            type="date"
            defaultValue={params.get("from") ?? ""}
            onChange={(e) => setQuery({ range: "custom", from: e.target.value })}
            data-testid="range-from"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-dim)]">To</label>
          <Input
            type="date"
            defaultValue={params.get("to") ?? ""}
            onChange={(e) => setQuery({ range: "custom", to: e.target.value })}
            data-testid="range-to"
          />
        </div>
      </div>
      {users && (
        <div>
          <label className="block text-xs text-[var(--text-dim)]">User</label>
          <select
            className="rounded border border-[var(--border)] bg-[var(--bg-elev)] px-2 py-1 text-sm"
            defaultValue={params.get("userId") ?? ""}
            onChange={(e) => setQuery({ userId: e.target.value || null })}
            data-testid="user-filter"
          >
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <Link
        href={`/api/reports/csv?${params.toString()}`}
        className={`${btnBase} bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]`}
        data-testid="csv-download"
      >
        Download CSV
      </Link>
    </div>
  );
}
