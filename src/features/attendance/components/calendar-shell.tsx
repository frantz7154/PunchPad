"use client";
import { useState } from "react";
import Link from "next/link";
import { MonthGrid } from "./month-grid";
import { DaySheet } from "./day-sheet";

const linkBtnClass =
  "inline-flex items-center rounded px-3 py-1.5 text-sm hover:bg-[var(--bg-elev-2)]";

type DayBucket = { dateLocal: string; minutes: number; count: number };

export function CalendarShell({
  year,
  month,
  today,
  days,
  timezone,
}: {
  year: number;
  month: number; // 0-indexed
  today: string;
  days: DayBucket[];
  timezone: string;
}) {
  const [openDate, setOpenDate] = useState<string | null>(null);
  const heading = new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const prev = month === 0 ? { y: year - 1, m: 12 } : { y: year, m: month };
  const next = month === 11 ? { y: year + 1, m: 1 } : { y: year, m: month + 2 };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">{heading}</h1>
        <div className="flex gap-2">
          <Link
            href={`/calendar?year=${prev.y}&month=${prev.m}`}
            className={linkBtnClass}
            data-testid="cal-prev"
          >
            ← Prev
          </Link>
          <Link href="/calendar" className={linkBtnClass} data-testid="cal-today">
            Today
          </Link>
          <Link
            href={`/calendar?year=${next.y}&month=${next.m}`}
            className={linkBtnClass}
            data-testid="cal-next"
          >
            Next →
          </Link>
        </div>
      </div>
      <MonthGrid year={year} month={month} days={days} today={today} onSelect={setOpenDate} />
      <DaySheet
        open={!!openDate}
        date={openDate}
        timezone={timezone}
        onOpenChange={(o) => !o && setOpenDate(null)}
      />
    </div>
  );
}
