"use client";
import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { changeOwnPasswordAction } from "@/features/users/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ChangePasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-4 font-display text-2xl font-semibold">Set a new password</h1>
      <p className="mb-6 text-sm text-[var(--text-dim)]">
        Your admin asked you to choose a new password before continuing.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const newPassword = fd.get("newPassword") as string;
          startTransition(async () => {
            setError(null);
            const res = await changeOwnPasswordAction({
              currentPassword: fd.get("currentPassword"),
              newPassword,
            });
            if (!("ok" in res) || !res.ok) {
              setError("message" in res ? res.message : "Unknown error");
              return;
            }
            // Force a fresh JWT with mustChangePassword=false by re-authenticating in place.
            await signIn("credentials", {
              email: res.email,
              password: newPassword,
              redirect: true,
              callbackUrl: "/clock",
            });
          });
        }}
        className="flex flex-col gap-4"
      >
        <div>
          <Label htmlFor="cur">Current password</Label>
          <Input id="cur" name="currentPassword" type="password" required data-testid="cp-current" />
        </div>
        <div>
          <Label htmlFor="new">New password (min 12 chars)</Label>
          <Input id="new" name="newPassword" type="password" required data-testid="cp-new" />
        </div>
        {error && (
          <p data-testid="cp-error" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} data-testid="cp-submit">
          {pending ? "Saving…" : "Save"}
        </Button>
      </form>
    </main>
  );
}
