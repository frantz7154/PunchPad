"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction } from "../admin-actions";

export function ResetPasswordDialog({
  row,
  onClose,
}: {
  row: { id: string; name: string } | null;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (!row) return null;
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password — {row.name}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              setError(null);
              const res = await resetPasswordAction({
                userId: row.id,
                newPassword: fd.get("newPassword"),
              });
              if (!("ok" in res) || !res.ok) {
                setError(res.message);
                return;
              }
              onClose();
              router.refresh();
            });
          }}
          className="flex flex-col gap-3"
        >
          <div>
            <Label>New password</Label>
            <Input
              name="newPassword"
              type="text"
              required
              minLength={12}
              data-testid="reset-input"
            />
          </div>
          {error && (
            <p data-testid="reset-error" className="text-sm text-[var(--danger)]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            data-testid="reset-submit"
          >
            {pending ? "Saving…" : "Reset"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
