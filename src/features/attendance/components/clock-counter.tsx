"use client";
import { useEffect, useState } from "react";

export function ClockCounter({ clockInAt }: { clockInAt: string }) {
  const inAt = new Date(clockInAt).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);
  const elapsed = Math.max(0, now - inAt);
  const h = Math.floor(elapsed / 3_600_000);
  const m = Math.floor((elapsed % 3_600_000) / 60_000);
  const s = Math.floor((elapsed % 60_000) / 1_000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    <p
      className="font-mono text-6xl tracking-tight tabular-nums text-[var(--text)] md:text-7xl"
      data-testid="clock-counter"
    >
      {pad(h)} : {pad(m)} : {pad(s)}
    </p>
  );
}
