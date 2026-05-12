"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { NewUserDialog } from "./new-user-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { deactivateUserAction, changeRoleAction } from "../admin-actions";

type Row = {
  id: string;
  email: string;
  name: string;
  role: "EMPLOYEE" | "ADMIN";
  deactivatedAt: string | null;
  lastClockIn: string | null;
};

const btn = "inline-flex items-center rounded px-2 py-1 text-xs hover:bg-[var(--bg-elev-2)]";

export function UsersTable({ rows }: { rows: Row[] }) {
  const [resetFor, setResetFor] = useState<Row | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <NewUserDialog />
      </div>
      <div
        className="overflow-x-auto rounded-xl border border-[var(--border)]"
        data-testid="users-table"
      >
        <table className="min-w-full divide-y divide-[var(--border)] text-sm">
          <thead className="bg-[var(--bg-elev)] text-left text-xs uppercase tracking-wider text-[var(--text-dim)]">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Last clock-in</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((r) => (
              <tr key={r.id} data-testid={`user-row-${r.id}`}>
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={r.role === "ADMIN" ? "default" : "secondary"}>{r.role}</Badge>
                </td>
                <td className="px-4 py-3">
                  {r.deactivatedAt ? (
                    <Badge variant="secondary">deactivated</Badge>
                  ) : (
                    <Badge>active</Badge>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {r.lastClockIn ? r.lastClockIn.slice(0, 16).replace("T", " ") : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={btn}
                      onClick={() => setResetFor(r)}
                      data-testid={`reset-${r.id}`}
                    >
                      Reset password
                    </button>
                    <button
                      type="button"
                      className={btn}
                      onClick={() =>
                        run(() =>
                          changeRoleAction({
                            userId: r.id,
                            role: r.role === "ADMIN" ? "EMPLOYEE" : "ADMIN",
                          }),
                        )
                      }
                      data-testid={`toggle-role-${r.id}`}
                    >
                      {r.role === "ADMIN" ? "Demote" : "Promote"}
                    </button>
                    {!r.deactivatedAt && (
                      <button
                        type="button"
                        className={btn}
                        onClick={() => run(() => deactivateUserAction({ userId: r.id }))}
                        data-testid={`deactivate-${r.id}`}
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ResetPasswordDialog row={resetFor} onClose={() => setResetFor(null)} />
    </div>
  );
}
