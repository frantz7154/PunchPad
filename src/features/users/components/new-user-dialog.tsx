"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserAction } from "../admin-actions";

export function NewUserDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex items-center rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        data-testid="new-user-button"
      >
        New user
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create user</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              setError(null);
              const res = await createUserAction({
                email: fd.get("email"),
                name: fd.get("name"),
                initialPassword: fd.get("initialPassword"),
                role: fd.get("role"),
                timezone: fd.get("timezone"),
              });
              if (!("ok" in res) || !res.ok) {
                setError(res.message);
                return;
              }
              setOpen(false);
              router.refresh();
            });
          }}
          className="flex flex-col gap-3"
        >
          <div>
            <Label>Name</Label>
            <Input name="name" required data-testid="new-user-name" />
          </div>
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" required data-testid="new-user-email" />
          </div>
          <div>
            <Label>Initial password (min 12)</Label>
            <Input
              name="initialPassword"
              type="text"
              required
              minLength={12}
              data-testid="new-user-password"
            />
          </div>
          <div>
            <Label>Role</Label>
            <select
              name="role"
              defaultValue="EMPLOYEE"
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-elev)] px-2 py-1 text-sm"
              data-testid="new-user-role"
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <Label>Timezone</Label>
            <Input
              name="timezone"
              defaultValue="America/Chicago"
              required
              data-testid="new-user-tz"
            />
          </div>
          {error && (
            <p data-testid="new-user-error" className="text-sm text-[var(--danger)]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            data-testid="new-user-submit"
          >
            {pending ? "Creating…" : "Create"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
