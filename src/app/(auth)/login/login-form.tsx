"use client";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          setError(null);
          const result = await signIn("credentials", {
            email: data.get("email"),
            password: data.get("password"),
            redirect: false,
          });
          if (result?.error) {
            setError("Invalid email or password, or your account is locked.");
            return;
          }
          router.push(params.get("next") ?? "/clock");
          router.refresh();
        });
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          data-testid="login-email"
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          data-testid="login-password"
        />
      </div>
      {error && (
        <p data-testid="login-error" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} data-testid="login-submit">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-xs text-[var(--text-dim)]">Forgot your password? Ask your admin.</p>
    </form>
  );
}
