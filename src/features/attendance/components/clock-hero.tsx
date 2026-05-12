"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ClockCounter } from "./clock-counter";
import { clockInAction, clockOutAction } from "../actions";

type Action = () => Promise<
  { ok: true; sessionId: string } | { ok: false; code: string; message: string }
>;

type Props = {
  open: { clockInAt: string; startedAtLocal: string } | null;
};

export function ClockHero({ open }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handle = (fn: Action) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!("ok" in res) || !res.ok) {
        setError("message" in res ? res.message : "Unknown error");
        return;
      }
      router.refresh();
    });

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-10 text-center">
      {open ? (
        <>
          <p className="font-display text-sm uppercase tracking-[0.2em] text-[var(--accent)]">
            On the clock
          </p>
          <div className="my-6">
            <ClockCounter clockInAt={open.clockInAt} />
          </div>
          <p className="text-sm text-[var(--text-dim)]" data-testid="clock-started-at">
            Started at {open.startedAtLocal}
          </p>
          <Button
            size="lg"
            className="mt-8 h-14 min-w-64 bg-[var(--accent)] text-base font-semibold text-white hover:bg-[var(--accent-hover)]"
            disabled={pending}
            data-testid="clock-out-button"
            onClick={() => handle(clockOutAction)}
          >
            {pending ? "Clocking out…" : "Clock out"}
          </Button>
        </>
      ) : (
        <>
          <p className="font-display text-sm uppercase tracking-[0.2em] text-[var(--text-dim)]">
            Off the clock
          </p>
          <p
            className="mt-6 font-mono text-5xl text-[var(--text-ghost)]"
            data-testid="clock-counter-idle"
          >
            00 : 00 : 00
          </p>
          <Button
            size="lg"
            className="mt-8 h-14 min-w-64 bg-[var(--accent)] text-base font-semibold text-white hover:bg-[var(--accent-hover)]"
            disabled={pending}
            data-testid="clock-in-button"
            onClick={() => handle(clockInAction)}
          >
            {pending ? "Clocking in…" : "Clock in"}
          </Button>
        </>
      )}
      {error && (
        <p className="mt-4 text-sm text-[var(--danger)]" data-testid="clock-error">
          {error}
        </p>
      )}
    </section>
  );
}
