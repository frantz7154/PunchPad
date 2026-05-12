import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UsersTable } from "@/features/users/components/users-table";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({
    where: { id: { not: "system" } },
    orderBy: [{ deactivatedAt: "asc" }, { name: "asc" }],
    include: {
      sessions: { orderBy: { clockInAt: "desc" }, take: 1, select: { clockInAt: true } },
    },
  });
  const rows = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    deactivatedAt: u.deactivatedAt?.toISOString() ?? null,
    lastClockIn: u.sessions[0]?.clockInAt.toISOString() ?? null,
  }));
  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Users</h1>
      <UsersTable rows={rows} />
    </div>
  );
}
