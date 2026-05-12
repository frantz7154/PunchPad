import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LiveIndicator } from "./live-indicator";
import { UserMenu } from "./user-menu";

type Props = {
  user: { id: string; name: string; role: "EMPLOYEE" | "ADMIN" };
};

export function Header({ user }: Props) {
  const isAdmin = user.role === "ADMIN";
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg-elev)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/clock" className="font-display text-lg font-semibold tracking-tight">
          PunchPad
        </Link>
        <nav className="ml-4 flex gap-1 text-sm">
          <Link
            href="/clock"
            className="rounded px-3 py-1 hover:bg-[var(--bg-elev-2)]"
            data-testid="nav-clock"
          >
            Clock
          </Link>
          <Link
            href="/calendar"
            className="rounded px-3 py-1 hover:bg-[var(--bg-elev-2)]"
            data-testid="nav-calendar"
          >
            Calendar
          </Link>
          <Link
            href="/reports"
            className="rounded px-3 py-1 hover:bg-[var(--bg-elev-2)]"
            data-testid="nav-reports"
          >
            Reports
          </Link>
          {isAdmin && (
            <>
              <Link
                href="/admin/users"
                className="rounded px-3 py-1 hover:bg-[var(--bg-elev-2)]"
                data-testid="nav-admin-users"
              >
                Users
              </Link>
              <Link
                href="/admin/audit"
                className="rounded px-3 py-1 hover:bg-[var(--bg-elev-2)]"
                data-testid="nav-admin-audit"
              >
                Audit
              </Link>
            </>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LiveIndicator userId={user.id} />
          <ThemeToggle />
          <UserMenu name={user.name} />
        </div>
      </div>
    </header>
  );
}
