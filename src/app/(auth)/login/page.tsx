import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-6">
      <h1 className="mb-4 font-display text-2xl font-semibold">PunchPad</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </section>
  );
}
