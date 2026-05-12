"use client";

type DayBucket = { dateLocal: string; minutes: number; count: number };

export function MonthGrid({
  year,
  month,
  days,
  today,
  onSelect,
}: {
  year: number;
  month: number; // 0-indexed
  days: DayBucket[];
  today: string; // yyyy-MM-dd
  onSelect: (date: string) => void;
}) {
  const map = new Map(days.map((d) => [d.dateLocal, d]));
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekdayMon0 = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<DayBucket | null> = Array(firstWeekdayMon0).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(map.get(key) ?? { dateLocal: key, minutes: 0, count: 0 });
  }
  while (cells.length % 7) cells.push(null);

  const max = Math.max(60, ...days.map((d) => d.minutes));

  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-4"
      data-testid="month-grid"
    >
      <div className="mb-2 grid grid-cols-7 text-xs uppercase tracking-wider text-[var(--text-dim)]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-2 py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell)
            return <div key={`empty-${idx}`} className="aspect-square rounded bg-transparent" />;
          const isToday = cell.dateLocal === today;
          const pct = Math.min(100, Math.round((cell.minutes / max) * 100));
          return (
            <button
              key={cell.dateLocal}
              type="button"
              data-testid={`day-${cell.dateLocal}`}
              onClick={() => onSelect(cell.dateLocal)}
              className={`flex aspect-square flex-col rounded p-2 text-left transition-colors hover:bg-[var(--bg-elev-2)] ${
                isToday ? "ring-1 ring-[var(--accent)]" : ""
              }`}
            >
              <span className="text-xs text-[var(--text-dim)]">
                {Number(cell.dateLocal.slice(-2))}
              </span>
              <div className="mt-auto h-1 w-full rounded bg-[var(--bg-elev-2)]">
                <div className="h-full rounded bg-[var(--accent)]" style={{ width: `${pct}%` }} />
              </div>
              {cell.count > 0 && (
                <span className="text-[10px] text-[var(--text-ghost)]">
                  {cell.count} session{cell.count === 1 ? "" : "s"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
