"use client";
import { useEffect, useState, useCallback, useTransition } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditSessionForm } from "./edit-session-form";

type SessionRow = {
  id: string;
  clockInAt: string;
  clockOutAt: string | null;
  autoClosed: boolean;
  notes: string | null;
};

const SEVEN_DAYS_MS = 7 * 24 * 3_600_000;

export function DaySheet({
  open,
  date,
  timezone,
  onOpenChange,
}: {
  open: boolean;
  date: string | null;
  timezone: string;
  onOpenChange: (o: boolean) => void;
}) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();

  const reload = useCallback(() => {
    if (!date) return;
    startTransition(async () => {
      const r = await fetch(`/api/me/sessions?date=${date}`, { cache: "no-store" });
      const j = await r.json();
      setSessions(j.sessions ?? []);
      setNow(Date.now());
    });
  }, [date]);

  useEffect(() => {
    if (!open || !date) return;
    reload();
  }, [open, date, reload]);

  const fmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent data-testid="day-sheet">
        <SheetHeader>
          <SheetTitle>{date}</SheetTitle>
        </SheetHeader>
        {isPending ? (
          <p className="text-sm text-[var(--text-dim)]">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-[var(--text-dim)]" data-testid="day-sheet-empty">
            No sessions on this day.
          </p>
        ) : (
          <ul className="mt-4 space-y-3" data-testid="day-sheet-list">
            {sessions.map((s) => {
              const inWindow = now - new Date(s.clockInAt).getTime() <= SEVEN_DAYS_MS;
              const isEditing = editing === s.id;
              return (
                <li
                  key={s.id}
                  className="rounded-lg border border-[var(--border)] p-3 text-sm"
                  data-testid={`session-row-${s.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono">
                      {fmt.format(new Date(s.clockInAt))} →{" "}
                      {s.clockOutAt ? fmt.format(new Date(s.clockOutAt)) : "—"}
                    </span>
                    <div className="flex items-center gap-2">
                      {s.autoClosed && <Badge variant="secondary">auto-closed</Badge>}
                      {inWindow && !isEditing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(s.id)}
                          data-testid={`edit-button-${s.id}`}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <div className="mt-3">
                      <EditSessionForm
                        session={s}
                        onSaved={() => {
                          setEditing(null);
                          void reload();
                        }}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
