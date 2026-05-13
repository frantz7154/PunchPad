"use client";
import { useEffect, useState } from "react";

export function LiveIndicator({ userId }: { userId: string }) {
  const [open, setOpen] = useState<{ clockInAt: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancel = false;
    async function load() {
      const r = await fetch("/api/me/open-session", { cache: "no-store" });
      if (cancel) return;
      if (r.ok) setOpen(await r.json());
      else setOpen(null);
    }
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [open]);

  if (!open) {
    return (
      <span className="text-xs text-[var(--text-ghost)]" data-testid="live-indicator-off">
        Off the clock
      </span>
    );
  }
  const inAt = new Date(open.clockInAt).getTime();
  const elapsed = Math.max(0, now - inAt);
  const h = Math.floor(elapsed / 3_600_000);
  const m = Math.floor((elapsed % 3_600_000) / 60_000);
  return (
    <span
      className="flex items-center gap-2 font-mono text-xs text-[var(--accent)]"
      data-testid="live-indicator-on"
      title={`Started ${new Date(inAt).toLocaleTimeString()}`}
    >
      <span className="size-2 animate-pulse rounded-full bg-[var(--accent)]" />
      On the clock {h}h {m.toString().padStart(2, "0")}m
    </span>
  );
}
