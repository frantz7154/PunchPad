import type { PrismaClient, User } from "@/generated/prisma/client";
import type { Clock } from "@/lib/time";
import {
  formatLocal,
  isoWeekKey,
  durationMinutes,
  startOfWeekInTz,
  endOfWeekInTz,
} from "@/lib/time";

export type DigestDeps = {
  prisma: PrismaClient;
  clock: Clock;
  sendHourLocal: number;
  send: (msg: { to: string; subject: string; html: string }) => Promise<void>;
};

export async function runWeeklyDigest(d: DigestDeps): Promise<{ sent: number }> {
  const now = d.clock.now();
  const users = await d.prisma.user.findMany({
    where: { deactivatedAt: null, id: { not: "system" } },
  });
  let sent = 0;

  for (const user of users) {
    const localHour = Number(formatLocal(now, user.timezone, "H"));
    const localWeekday = formatLocal(now, user.timezone, "EEEE");
    if (localWeekday !== "Monday") continue;
    if (localHour !== d.sendHourLocal) continue;
    const wk = isoWeekKey(now, user.timezone);
    const already = await d.prisma.digestSend.findUnique({
      where: { userId_isoWeek: { userId: user.id, isoWeek: wk } },
    });
    if (already) continue;

    const lastMonday = new Date(startOfWeekInTz(now, user.timezone).getTime() - 7 * 24 * 3_600_000);
    const lastSunday = endOfWeekInTz(lastMonday, user.timezone);
    const sessions = await d.prisma.timeSession.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        clockInAt: { gte: lastMonday, lte: lastSunday },
      },
      orderBy: { clockInAt: "asc" },
    });
    const total = sessions.reduce(
      (m, s) => m + durationMinutes(s.clockInAt, s.clockOutAt ?? now),
      0,
    );
    const html = renderDigestEmail(user, sessions, total, lastSunday);

    await d.send({
      to: user.email,
      subject: `PunchPad — last week (${formatLocal(lastMonday, user.timezone, "MMM d")}–${formatLocal(lastSunday, user.timezone, "MMM d")})`,
      html,
    });
    await d.prisma.digestSend.create({ data: { userId: user.id, isoWeek: wk } });
    sent += 1;
  }

  return { sent };
}

function renderDigestEmail(
  user: User,
  sessions: Array<{ clockInAt: Date; clockOutAt: Date | null; autoClosed: boolean }>,
  totalMinutes: number,
  to: Date,
): string {
  const totalH = Math.floor(totalMinutes / 60);
  const totalM = totalMinutes % 60;
  const rows = sessions
    .map((s) => {
      const dur = durationMinutes(s.clockInAt, s.clockOutAt ?? to);
      const d = formatLocal(s.clockInAt, user.timezone, "EEE MMM d");
      const i = formatLocal(s.clockInAt, user.timezone, "h:mma");
      const o = s.clockOutAt ? formatLocal(s.clockOutAt, user.timezone, "h:mma") : "—";
      const flag = s.autoClosed ? " (auto-closed)" : "";
      return `<tr><td style="padding:6px 12px">${d}</td><td style="padding:6px 12px;font-family:monospace">${i} → ${o}${flag}</td><td style="padding:6px 12px;font-family:monospace">${Math.floor(dur / 60)}h ${dur % 60}m</td></tr>`;
    })
    .join("");
  return `
    <div style="font-family:Inter,system-ui,sans-serif;color:#0f172a;max-width:560px">
      <h1 style="font-size:18px">Hi ${user.name},</h1>
      <p>Last week you were on the clock for <strong>${totalH}h ${totalM}m</strong>.</p>
      <table style="border-collapse:collapse;border:1px solid #e2e8f0">${rows || `<tr><td style="padding:8px">No sessions logged.</td></tr>`}</table>
      <p style="color:#64748b;font-size:12px">— PunchPad</p>
    </div>
  `;
}
