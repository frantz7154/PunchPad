import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AuditTable } from "@/features/audit/components/audit-table";
import type { AuditAction } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const VALID_ACTIONS: ReadonlySet<string> = new Set([
  "CLOCK_IN",
  "CLOCK_OUT",
  "EDIT_SESSION",
  "DELETE_SESSION",
  "AUTO_CLOSE",
  "CREATE_USER",
  "DEACTIVATE_USER",
  "ROLE_CHANGE",
]);

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const actor = sp.actor;
  const actionStr = sp.action;
  const action: AuditAction | undefined =
    actionStr && VALID_ACTIONS.has(actionStr) ? (actionStr as AuditAction) : undefined;
  const from = sp.from ? new Date(`${sp.from}T00:00:00`) : undefined;
  const to = sp.to ? new Date(`${sp.to}T23:59:59`) : undefined;

  const rows = await prisma.auditLog.findMany({
    where: {
      ...(actor ? { actorUserId: actor } : {}),
      ...(action ? { action } : {}),
      ...(from || to
        ? { at: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    },
    include: { actor: { select: { email: true, name: true } } },
    orderBy: { at: "desc" },
    take: 200,
  });

  const data = rows.map((r) => ({
    id: r.id,
    at: r.at.toISOString(),
    actor: { email: r.actor.email, name: r.actor.name },
    action: r.action,
    targetSessionId: r.targetSessionId,
    reason: r.reason,
    before: r.before,
    after: r.after,
  }));
  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Audit log</h1>
      <AuditTable rows={data} />
    </div>
  );
}
