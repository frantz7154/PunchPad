"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { editOwnSessionAction } from "../actions";

type Session = {
  id: string;
  clockInAt: string;
  clockOutAt: string | null;
  notes: string | null;
};

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function EditSessionForm({ session, onSaved }: { session: Session; onSaved: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      data-testid={`edit-form-${session.id}`}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const cin = fd.get("clockInAt") as string;
        const cout = fd.get("clockOutAt") as string;
        const reason = fd.get("reason") as string;
        startTransition(async () => {
          setError(null);
          const res = await editOwnSessionAction({
            sessionId: session.id,
            clockInAt: new Date(cin).toISOString(),
            clockOutAt: cout ? new Date(cout).toISOString() : null,
            reason,
          });
          if (!("ok" in res) || !res.ok) {
            setError("message" in res ? res.message : "Unknown error");
            return;
          }
          onSaved();
          router.refresh();
        });
      }}
      className="flex flex-col gap-3"
    >
      <div>
        <Label htmlFor={`in-${session.id}`}>Clock in</Label>
        <Input
          id={`in-${session.id}`}
          name="clockInAt"
          type="datetime-local"
          defaultValue={isoToLocalInput(session.clockInAt)}
          required
          data-testid={`edit-in-${session.id}`}
        />
      </div>
      <div>
        <Label htmlFor={`out-${session.id}`}>Clock out</Label>
        <Input
          id={`out-${session.id}`}
          name="clockOutAt"
          type="datetime-local"
          defaultValue={session.clockOutAt ? isoToLocalInput(session.clockOutAt) : ""}
          required
          data-testid={`edit-out-${session.id}`}
        />
      </div>
      <div>
        <Label htmlFor={`r-${session.id}`}>Reason</Label>
        <Input
          id={`r-${session.id}`}
          name="reason"
          type="text"
          required
          data-testid={`edit-reason-${session.id}`}
        />
      </div>
      {error && (
        <p
          data-testid={`edit-error-${session.id}`}
          className="text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} data-testid={`edit-save-${session.id}`}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
