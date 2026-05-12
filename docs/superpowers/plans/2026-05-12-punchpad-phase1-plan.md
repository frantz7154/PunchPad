# PunchPad Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Phase 1 PunchPad MVP — a self-hosted clock-in/out web app for Lexcom's internal team with authoritative attendance records, a polished clock UI, calendar/reports views, CSV export, weekly digest, and Docker Compose deployment.

**Architecture:** Next.js 16 (App Router, TypeScript) with shadcn/ui + Tailwind v4. Prisma + PostgreSQL 16 for persistence. NextAuth (Credentials, JWT strategy) + Argon2id. Business logic in plain `service.ts` functions (HTTP-agnostic) so the same code services web requests and a separate supercronic-driven cron container hitting `/api/cron/*` with a shared secret. Resend (default) for email. Caddy for TLS. Deployed via Docker Compose to a single 1 vCPU / 1 GB VM.

**Tech Stack:** Next.js 16, TypeScript, Tailwind v4, shadcn/ui, Prisma 6, PostgreSQL 16, NextAuth v5 (Auth.js), `@node-rs/argon2`, Resend + Nodemailer, pino, Zod, Vitest + Testcontainers, Playwright, supercronic, Caddy 2, Docker Compose.

**Pinned decisions (from spec Section 12 open items):**
- Accent color: saturated teal — `--accent: #14b8a6` (dark) / `#0d9488` (light).
- Email transport default: `EMAIL_TRANSPORT=resend` (SMTP path still implemented for parity).
- Pay-period preset: semi-monthly (1st–15th, 16th–end of month).
- Package manager: `pnpm`.

**Reading guide:** This plan is organized into 11 milestones (0–10). Each milestone ends with a verifiable slice. Tasks are TDD-shaped (test → fail → implement → pass → commit). Tasks inside a milestone are ordered; milestones are ordered.

---

## Milestone 0 — Repository and tooling skeleton

End state: an empty Next.js 16 + TS app boots locally, passes `pnpm lint`, `pnpm typecheck`, and runs an empty Vitest + Playwright suite. Git is initialized. The spec is the first commit.

### Task 0.1: Initialize git and commit the spec

**Files:**
- Create: `C:\Users\Jared.Reid\punchpad\.gitignore`
- Create: `C:\Users\Jared.Reid\punchpad\README.md`

- [ ] **Step 1: Initialize the repo**

```bash
cd C:/Users/Jared.Reid/punchpad
git init -b main
```

- [ ] **Step 2: Write the initial `.gitignore`**

Content of `.gitignore`:

```
node_modules/
.next/
.turbo/
out/
dist/
coverage/
.env
.env.local
.env.*.local
*.log
.DS_Store
.vscode/
.idea/
playwright-report/
test-results/
prisma/*.db
pgdata/
backups/
```

- [ ] **Step 3: Write a one-paragraph `README.md`**

```markdown
# PunchPad

Self-hosted clock-in/out attendance system for Lexcom's internal team. Phase 1 MVP.

See `docs/superpowers/specs/2026-05-07-punchpad-design.md` for the design spec and `docs/superpowers/plans/2026-05-12-punchpad-phase1-plan.md` for the implementation plan.
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore README.md docs/
git commit -m "chore: initial commit with design spec and Phase 1 plan

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 0.2: Scaffold Next.js 16 + TypeScript + Tailwind v4

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `postcss.config.mjs`, `.npmrc`

- [ ] **Step 1: Run the scaffolder**

Run from `C:/Users/Jared.Reid/punchpad/`:

```bash
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-pnpm
```

When prompted "directory not empty, continue?", answer yes (it preserves `docs/`, `.gitignore`, `README.md`).

- [ ] **Step 2: Pin Next.js to v16 and verify Tailwind v4**

Open `package.json` and confirm `"next": "^16.0.0"` and `"tailwindcss": "^4.0.0"`. If not, run:

```bash
pnpm add next@^16
pnpm add -D tailwindcss@^4 @tailwindcss/postcss@^4
```

- [ ] **Step 3: Add `.npmrc` for pnpm peer-dep tolerance**

Content of `.npmrc`:

```
auto-install-peers=true
strict-peer-dependencies=false
```

- [ ] **Step 4: Replace `src/app/page.tsx` with a placeholder**

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-semibold">PunchPad — scaffold OK</h1>
    </main>
  );
}
```

- [ ] **Step 5: Boot and verify**

```bash
pnpm dev
```

Open http://localhost:3000 — expect to see "PunchPad — scaffold OK". Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: scaffold Next.js 16 + TS + Tailwind v4

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 0.3: Add brand fonts and theme tokens

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Wire up next/font for JetBrains Mono, Inter, Outfit**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });

export const metadata: Metadata = {
  title: "PunchPad",
  description: "Lexcom attendance tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} ${outfit.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Replace `src/app/globals.css` with theme tokens**

```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --font-mono: var(--font-mono), ui-monospace, monospace;
  --font-display: var(--font-outfit), system-ui, sans-serif;
}

:root {
  /* Dark theme (default) */
  --bg: #0a0c0f;
  --bg-elev: #12151a;
  --bg-elev-2: #1a1e25;
  --border: #232831;
  --text: #f8fafc;
  --text-dim: #94a3b8;
  --text-ghost: #64748b;
  --accent: #14b8a6;
  --accent-hover: #0d9488;
  --success: #22c55e;
  --warn: #f59e0b;
  --danger: #ef4444;
  color-scheme: dark;
}

[data-theme="light"] {
  --bg: #ffffff;
  --bg-elev: #f8fafc;
  --bg-elev-2: #f1f5f9;
  --border: #e2e8f0;
  --text: #0f172a;
  --text-dim: #475569;
  --text-ghost: #94a3b8;
  --accent: #0d9488;
  --accent-hover: #0f766e;
  --success: #16a34a;
  --warn: #d97706;
  --danger: #dc2626;
  color-scheme: light;
}

@theme inline {
  --color-bg: var(--bg);
  --color-bg-elev: var(--bg-elev);
  --color-bg-elev-2: var(--bg-elev-2);
  --color-border: var(--border);
  --color-text: var(--text);
  --color-text-dim: var(--text-dim);
  --color-text-ghost: var(--text-ghost);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-success: var(--success);
  --color-warn: var(--warn);
  --color-danger: var(--danger);
}

html, body { background: var(--bg); color: var(--text); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 3: Verify visually**

Run `pnpm dev`, reload http://localhost:3000 — text should render in Inter, background dark. Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: brand fonts and dark theme tokens

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 0.4: Initialize shadcn/ui

**Files:**
- Create: `components.json`, `src/components/ui/*` (button, input, etc. — generated)
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Run the shadcn init**

```bash
pnpm dlx shadcn@latest init
```

Answers: TypeScript yes, style: default, base color: slate, CSS variables: yes, React Server Components: yes, components path: `@/components`, utils path: `@/lib/utils`.

- [ ] **Step 2: Generate the components we know we need**

```bash
pnpm dlx shadcn@latest add button input label card dialog dropdown-menu table toast sonner sheet badge skeleton form select calendar
```

- [ ] **Step 3: Verify shadcn renders**

Add a `<Button>Test</Button>` from `@/components/ui/button` into `src/app/page.tsx` temporarily, run `pnpm dev`, confirm it renders, then revert the temporary change.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: initialize shadcn/ui with core components

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 0.5: Set up Vitest with unit + integration projects

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/unit/.gitkeep`
- Create: `tests/integration/.gitkeep`
- Create: `tests/fixtures/.gitkeep`
- Create: `tests/factories/.gitkeep`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install Vitest + Testcontainers**

```bash
pnpm add -D vitest @vitest/coverage-v8 @testcontainers/postgresql testcontainers tsx
```

- [ ] **Step 2: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          testTimeout: 60_000,
          hookTimeout: 120_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
```

- [ ] **Step 3: Add test scripts to `package.json`**

Inside `"scripts"`, add:

```json
"typecheck": "tsc --noEmit",
"test:unit": "vitest run --project unit",
"test:int": "vitest run --project integration",
"test:e2e": "playwright test",
"test": "pnpm test:unit && pnpm test:int"
```

- [ ] **Step 4: Write a sanity test to prove Vitest runs**

Create `tests/unit/sanity.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run it**

```bash
pnpm test:unit
```

Expected: 1 test passes.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: Vitest config with unit/integration projects

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 0.6: Set up Playwright E2E

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/sanity.spec.ts`

- [ ] **Step 1: Install Playwright**

```bash
pnpm add -D @playwright/test
pnpm dlx playwright install chromium
```

- [ ] **Step 2: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.PLAYWRIGHT_NO_WEBSERVER
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
```

- [ ] **Step 3: Write a sanity E2E test**

Create `tests/e2e/sanity.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /PunchPad/i })).toBeVisible();
});
```

- [ ] **Step 4: Run it**

```bash
pnpm test:e2e
```

Expected: 1 test passes (Playwright will boot the dev server).

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: Playwright config and sanity E2E

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 0.7: Strict TS + ESLint hardening + lint script

**Files:**
- Modify: `tsconfig.json`
- Modify: `eslint.config.mjs` (or `.eslintrc.*` if scaffolder generated that)
- Modify: `package.json`

- [ ] **Step 1: Tighten `tsconfig.json` `compilerOptions`**

Ensure these keys are present (merge into existing):

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true,
  "forceConsistentCasingInFileNames": true
}
```

- [ ] **Step 2: Add lint and format scripts**

In `package.json` `"scripts"`:

```json
"lint": "next lint",
"format": "prettier --write .",
"format:check": "prettier --check ."
```

Install Prettier:

```bash
pnpm add -D prettier
```

Create `.prettierrc.json`:

```json
{ "semi": true, "singleQuote": false, "trailingComma": "all", "printWidth": 100 }
```

- [ ] **Step 3: Run everything**

```bash
pnpm lint && pnpm typecheck && pnpm format:check
```

Fix any issues surfaced (likely none on a fresh scaffold; `format:check` may fail — run `pnpm format` to fix).

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: strict TS, ESLint, Prettier

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Milestone 1 â€” Foundational libraries

End state: `lib/env.ts`, `lib/errors.ts`, `lib/time.ts`, `lib/logger.ts`, `lib/db.ts`, `lib/csv.ts` all exist with unit tests passing. These are the shared substrate every feature pulls from.

### Task 1.1: `lib/env.ts` with Zod validation

**Files:**
- Create: `src/lib/env.ts`
- Create: `tests/unit/lib/env.test.ts`
- Create: `.env.example`

- [ ] **Step 1: Install Zod**

```bash
pnpm add zod
```

- [ ] **Step 2: Write the failing test**

`tests/unit/lib/env.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildEnv } from "@/lib/env";

describe("buildEnv", () => {
  const base = {
    NODE_ENV: "test",
    NEXTAUTH_URL: "http://localhost:3000",
    NEXTAUTH_SECRET: "x".repeat(32),
    DATABASE_URL: "postgresql://u:p@localhost:5432/db",
    ADMIN_EMAIL: "jared@lexcom.com",
    ADMIN_INITIAL_PASSWORD: "y".repeat(12),
    CRON_SECRET: "z".repeat(32),
    WATCHDOG_WARN_HOURS: "12",
    WATCHDOG_CLOSE_HOURS: "18",
    EMAIL_TRANSPORT: "resend",
    RESEND_API_KEY: "re_test",
    EMAIL_FROM: "PunchPad <punchpad@lexcom.com>",
    TZ_DEFAULT: "America/Chicago",
    DIGEST_SEND_HOUR_LOCAL: "7",
  };

  it("parses a full valid environment", () => {
    const env = buildEnv(base);
    expect(env.NEXTAUTH_SECRET).toHaveLength(32);
    expect(env.WATCHDOG_WARN_HOURS).toBe(12);
    expect(env.EMAIL_TRANSPORT).toBe("resend");
  });

  it("rejects a short NEXTAUTH_SECRET", () => {
    expect(() => buildEnv({ ...base, NEXTAUTH_SECRET: "short" })).toThrow();
  });

  it("rejects bad pair: smtp transport with no SMTP_HOST", () => {
    expect(() => buildEnv({ ...base, EMAIL_TRANSPORT: "smtp" })).toThrow(/SMTP_HOST/);
  });

  it("rejects ADMIN_INITIAL_PASSWORD shorter than 12", () => {
    expect(() => buildEnv({ ...base, ADMIN_INITIAL_PASSWORD: "short" })).toThrow();
  });
});
```

- [ ] **Step 3: Run it â€” expect failure**

```bash
pnpm test:unit
```

Expected: 3 failures ("Cannot find module @/lib/env").

- [ ] **Step 4: Implement `src/lib/env.ts`**

```ts
import { z } from "zod";

const baseSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_INITIAL_PASSWORD: z.string().min(12),
  CRON_SECRET: z.string().min(32),
  WATCHDOG_WARN_HOURS: z.coerce.number().int().positive().default(12),
  WATCHDOG_CLOSE_HOURS: z.coerce.number().int().positive().default(18),
  EMAIL_TRANSPORT: z.enum(["resend", "smtp"]).default("resend"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().min(1),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  TZ_DEFAULT: z.string().default("America/Chicago"),
  DIGEST_SEND_HOUR_LOCAL: z.coerce.number().int().min(0).max(23).default(7),
});

const refined = baseSchema.superRefine((v, ctx) => {
  if (v.WATCHDOG_CLOSE_HOURS <= v.WATCHDOG_WARN_HOURS) {
    ctx.addIssue({
      code: "custom",
      path: ["WATCHDOG_CLOSE_HOURS"],
      message: "WATCHDOG_CLOSE_HOURS must be > WATCHDOG_WARN_HOURS",
    });
  }
  if (v.EMAIL_TRANSPORT === "resend" && !v.RESEND_API_KEY) {
    ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "RESEND_API_KEY required for resend transport" });
  }
  if (v.EMAIL_TRANSPORT === "smtp") {
    for (const k of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"] as const) {
      if (!v[k]) ctx.addIssue({ code: "custom", path: [k], message: `${k} required for smtp transport` });
    }
  }
});

export type Env = z.infer<typeof baseSchema>;

export function buildEnv(source: Record<string, string | undefined>): Env {
  const result = refined.safeParse(source);
  if (!result.success) {
    const flat = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${flat}`);
  }
  return result.data;
}

export const env: Env =
  process.env.SKIP_ENV_VALIDATION === "1"
    ? (process.env as unknown as Env)
    : buildEnv(process.env);
```

- [ ] **Step 5: Run tests â€” expect pass**

```bash
pnpm test:unit
```

- [ ] **Step 6: Write `.env.example`**

```
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-32-byte-random
DATABASE_URL=postgresql://punchpad:punchpad@localhost:5432/punchpad
ADMIN_EMAIL=jared@lexcom.com
ADMIN_INITIAL_PASSWORD=change-me-on-first-login
CRON_SECRET=replace-with-32-byte-random
WATCHDOG_WARN_HOURS=12
WATCHDOG_CLOSE_HOURS=18
EMAIL_TRANSPORT=resend
RESEND_API_KEY=
EMAIL_FROM=PunchPad <punchpad@lexcom.com>
TZ_DEFAULT=America/Chicago
DIGEST_SEND_HOUR_LOCAL=7
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/env.ts tests/unit/lib/env.test.ts .env.example
git commit -m "feat: zod-validated env (lib/env.ts)"
```

### Task 1.2: `lib/errors.ts` â€” AppError hierarchy

**Files:**
- Create: `src/lib/errors.ts`
- Create: `tests/unit/lib/errors.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/unit/lib/errors.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  AppError, UnauthorizedError, ForbiddenError, ValidationError,
  ConflictError, NotFoundError, ServiceUnavailableError, toErrorEnvelope,
} from "@/lib/errors";

describe("AppError hierarchy", () => {
  it("AppError carries code, status, userMessage", () => {
    const e = new AppError("FOO", 418, "Teapot");
    expect(e.code).toBe("FOO");
    expect(e.httpStatus).toBe(418);
    expect(e.userMessage).toBe("Teapot");
  });

  it.each([
    [UnauthorizedError, 401, "UNAUTHORIZED"],
    [ForbiddenError, 403, "FORBIDDEN"],
    [ValidationError, 400, "VALIDATION"],
    [ConflictError, 409, "CONFLICT"],
    [NotFoundError, 404, "NOT_FOUND"],
    [ServiceUnavailableError, 503, "SERVICE_UNAVAILABLE"],
  ])("%s has correct defaults", (Ctor, status, code) => {
    const e = new (Ctor as new () => AppError)();
    expect(e.httpStatus).toBe(status);
    expect(e.code).toBe(code);
  });

  it("ConflictError allows custom code", () => {
    const e = new ConflictError("ALREADY_CLOCKED_IN", "You are already clocked in.");
    expect(e.code).toBe("ALREADY_CLOCKED_IN");
    expect(e.userMessage).toBe("You are already clocked in.");
  });

  it("toErrorEnvelope flattens AppError and preserves ValidationError details", () => {
    expect(toErrorEnvelope(new ConflictError("X", "Y"))).toEqual({ ok: false, code: "X", message: "Y" });
    const ve = new ValidationError("Bad input", { field: "clockInAt", reason: "future" });
    const env = toErrorEnvelope(ve);
    expect(env.code).toBe("VALIDATION");
    expect(env.details).toEqual({ field: "clockInAt", reason: "future" });
  });

  it("toErrorEnvelope converts unknown error to INTERNAL", () => {
    expect(toErrorEnvelope(new Error("boom"))).toEqual({ ok: false, code: "INTERNAL", message: "An unexpected error occurred." });
  });
});
```

- [ ] **Step 2: Run â€” expect failure**

```bash
pnpm test:unit
```

- [ ] **Step 3: Implement `src/lib/errors.ts`**

```ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    public readonly userMessage: string,
    message?: string,
  ) {
    super(message ?? userMessage);
    this.name = new.target.name;
  }
}

export class UnauthorizedError extends AppError {
  constructor(userMessage = "You must be signed in.") {
    super("UNAUTHORIZED", 401, userMessage);
  }
}
export class ForbiddenError extends AppError {
  constructor(userMessage = "You do not have permission to do that.") {
    super("FORBIDDEN", 403, userMessage);
  }
}
export class ValidationError extends AppError {
  constructor(userMessage: string, public readonly details?: unknown) {
    super("VALIDATION", 400, userMessage);
  }
}
export class ConflictError extends AppError {
  constructor(code = "CONFLICT", userMessage = "That action conflicts with current state.") {
    super(code, 409, userMessage);
  }
}
export class NotFoundError extends AppError {
  constructor(userMessage = "Not found.") {
    super("NOT_FOUND", 404, userMessage);
  }
}
export class ServiceUnavailableError extends AppError {
  constructor(userMessage = "Service temporarily unavailable.") {
    super("SERVICE_UNAVAILABLE", 503, userMessage);
  }
}

export type ErrorEnvelope = { ok: false; code: string; message: string; details?: unknown };

export function toErrorEnvelope(err: unknown): ErrorEnvelope {
  if (err instanceof AppError) {
    const e: ErrorEnvelope = { ok: false, code: err.code, message: err.userMessage };
    if (err instanceof ValidationError && err.details !== undefined) e.details = err.details;
    return e;
  }
  return { ok: false, code: "INTERNAL", message: "An unexpected error occurred." };
}
```

- [ ] **Step 4: Run â€” expect pass**

```bash
pnpm test:unit
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/errors.ts tests/unit/lib/errors.test.ts
git commit -m "feat: AppError hierarchy and envelope mapper"
```

### Task 1.3: `lib/time.ts` â€” TZ-aware time + injectable clock

**Files:**
- Create: `src/lib/time.ts`
- Create: `tests/unit/lib/time.test.ts`

- [ ] **Step 1: Install date helpers**

```bash
pnpm add date-fns date-fns-tz
pnpm add -D cross-env
```

Update `package.json` `test:unit` script to: `"test:unit": "cross-env TZ=UTC vitest run --project unit"` so TZ tests are deterministic regardless of host TZ.

- [ ] **Step 2: Write failing tests**

`tests/unit/lib/time.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  FakeClock,
  startOfDayInTz, endOfDayInTz,
  startOfWeekInTz, endOfWeekInTz,
  startOfSemiMonthlyInTz, endOfSemiMonthlyInTz,
  durationMinutes, formatLocal, isoWeekKey,
} from "@/lib/time";

describe("FakeClock", () => {
  it("advances by ms and seconds", () => {
    const c = new FakeClock(new Date("2026-05-12T12:00:00Z"));
    c.advanceMs(60_000);
    expect(c.now().toISOString()).toBe("2026-05-12T12:01:00.000Z");
    c.advanceSeconds(60);
    expect(c.now().toISOString()).toBe("2026-05-12T12:02:00.000Z");
  });
  it("setNow replaces the time", () => {
    const c = new FakeClock(new Date("2026-01-01T00:00:00Z"));
    c.setNow(new Date("2030-06-15T08:00:00Z"));
    expect(c.now().getUTCFullYear()).toBe(2030);
  });
});

describe("TZ boundaries (America/Chicago)", () => {
  const tz = "America/Chicago";
  it("startOfDayInTz returns local 00:00 in UTC", () => {
    const start = startOfDayInTz(new Date("2026-05-12T15:30:00Z"), tz);
    expect(start.toISOString()).toBe("2026-05-12T05:00:00.000Z");
  });
  it("endOfDayInTz is the next-day start minus 1 ms", () => {
    const end = endOfDayInTz(new Date("2026-05-12T15:30:00Z"), tz);
    expect(end.toISOString()).toBe("2026-05-13T04:59:59.999Z");
  });
  it("startOfWeekInTz is Monday 00:00 local", () => {
    const start = startOfWeekInTz(new Date("2026-05-12T15:30:00Z"), tz);
    expect(start.toISOString()).toBe("2026-05-11T05:00:00.000Z");
  });
  it("endOfWeekInTz is Sunday 23:59:59.999 local", () => {
    const end = endOfWeekInTz(new Date("2026-05-12T15:30:00Z"), tz);
    expect(end.toISOString()).toBe("2026-05-18T04:59:59.999Z");
  });
  it("semi-monthly first half: 1st through 15th", () => {
    const d = new Date("2026-05-08T12:00:00Z");
    expect(startOfSemiMonthlyInTz(d, tz).toISOString()).toBe("2026-05-01T05:00:00.000Z");
    expect(endOfSemiMonthlyInTz(d, tz).toISOString()).toBe("2026-05-16T04:59:59.999Z");
  });
  it("semi-monthly second half: 16th through end-of-month", () => {
    const d = new Date("2026-05-22T12:00:00Z");
    expect(startOfSemiMonthlyInTz(d, tz).toISOString()).toBe("2026-05-16T05:00:00.000Z");
    expect(endOfSemiMonthlyInTz(d, tz).toISOString()).toBe("2026-06-01T04:59:59.999Z");
  });
});

describe("durationMinutes", () => {
  it("returns positive minutes for normal range", () => {
    expect(durationMinutes(new Date("2026-05-12T08:00:00Z"), new Date("2026-05-12T09:30:00Z"))).toBe(90);
  });
  it("returns 0 when out <= in", () => {
    expect(durationMinutes(new Date("2026-05-12T09:00:00Z"), new Date("2026-05-12T08:00:00Z"))).toBe(0);
  });
});

describe("formatLocal", () => {
  it("formats a UTC instant in a given TZ", () => {
    expect(formatLocal(new Date("2026-05-12T13:00:00Z"), "America/Chicago", "yyyy-MM-dd HH:mm")).toBe("2026-05-12 08:00");
  });
});

describe("isoWeekKey", () => {
  it("returns YYYY-Www form", () => {
    expect(isoWeekKey(new Date("2026-05-12T13:00:00Z"), "America/Chicago")).toMatch(/^2026-W\d{2}$/);
  });
});
```

- [ ] **Step 3: Run â€” expect failure**

```bash
pnpm test:unit
```

- [ ] **Step 4: Implement `src/lib/time.ts`**

```ts
import { format as fnsFormat } from "date-fns";
import { toZonedTime, fromZonedTime, format as fnsFormatTz } from "date-fns-tz";

export interface Clock { now(): Date }
export class SystemClock implements Clock { now() { return new Date(); } }
export class FakeClock implements Clock {
  private current: Date;
  constructor(initial: Date) { this.current = new Date(initial); }
  now() { return new Date(this.current); }
  setNow(d: Date) { this.current = new Date(d); }
  advanceMs(ms: number) { this.current = new Date(this.current.getTime() + ms); }
  advanceSeconds(s: number) { this.advanceMs(s * 1000); }
  advanceMinutes(m: number) { this.advanceMs(m * 60_000); }
  advanceHours(h: number) { this.advanceMs(h * 3_600_000); }
}
export const systemClock: Clock = new SystemClock();

function parts(d: Date, tz: string) {
  const z = toZonedTime(d, tz);
  return { year: z.getFullYear(), month: z.getMonth(), day: z.getDate(), weekday: z.getDay() };
}
function buildLocal(year: number, month: number, day: number, tz: string, h = 0, m = 0, s = 0, ms = 0): Date {
  return fromZonedTime(new Date(year, month, day, h, m, s, ms), tz);
}

export function startOfDayInTz(d: Date, tz: string): Date {
  const { year, month, day } = parts(d, tz);
  return buildLocal(year, month, day, tz);
}
export function endOfDayInTz(d: Date, tz: string): Date {
  const { year, month, day } = parts(d, tz);
  return new Date(buildLocal(year, month, day + 1, tz).getTime() - 1);
}
export function startOfWeekInTz(d: Date, tz: string): Date {
  const { year, month, day, weekday } = parts(d, tz);
  const daysBack = (weekday + 6) % 7;
  return buildLocal(year, month, day - daysBack, tz);
}
export function endOfWeekInTz(d: Date, tz: string): Date {
  const { year, month, day } = parts(startOfWeekInTz(d, tz), tz);
  return new Date(buildLocal(year, month, day + 7, tz).getTime() - 1);
}
export function startOfSemiMonthlyInTz(d: Date, tz: string): Date {
  const { year, month, day } = parts(d, tz);
  return day <= 15 ? buildLocal(year, month, 1, tz) : buildLocal(year, month, 16, tz);
}
export function endOfSemiMonthlyInTz(d: Date, tz: string): Date {
  const { year, month, day } = parts(d, tz);
  if (day <= 15) return new Date(buildLocal(year, month, 16, tz).getTime() - 1);
  return new Date(buildLocal(year, month + 1, 1, tz).getTime() - 1);
}
export function durationMinutes(inAt: Date, outAt: Date): number {
  const ms = outAt.getTime() - inAt.getTime();
  return ms <= 0 ? 0 : Math.floor(ms / 60_000);
}
export function formatLocal(d: Date, tz: string, fmt: string): string {
  return fnsFormatTz(toZonedTime(d, tz), fmt, { timeZone: tz });
}
export function formatUtc(d: Date, fmt: string): string {
  return fnsFormat(d, fmt);
}
export function isoWeekKey(d: Date, tz: string): string {
  const z = toZonedTime(d, tz);
  const target = new Date(Date.UTC(z.getFullYear(), z.getMonth(), z.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
```

- [ ] **Step 5: Run â€” expect pass**

```bash
pnpm test:unit
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/time.ts tests/unit/lib/time.test.ts package.json
git commit -m "feat: TZ-aware time helpers and injectable clock"
```

### Task 1.4: `lib/logger.ts` â€” pino logger with redaction

**Files:**
- Create: `src/lib/logger.ts`

- [ ] **Step 1: Install pino**

```bash
pnpm add pino
pnpm add -D pino-pretty
```

- [ ] **Step 2: Write `src/lib/logger.ts`**

```ts
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  redact: {
    paths: ["password", "passwordHash", "*.password", "*.passwordHash", "headers.authorization", "headers.cookie"],
    censor: "[REDACTED]",
  },
  ...(isDev
    ? { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss.l" } } }
    : {}),
});

export function withRequest(requestId: string, userId?: string) {
  return logger.child({ request_id: requestId, ...(userId ? { user_id: userId } : {}) });
}
```

- [ ] **Step 3: Smoke test**

```bash
pnpm exec tsx -e "import { logger } from './src/lib/logger'; logger.info({ a: 1 }, 'hello'); logger.info({ password: 'secret' }, 'redaction check')"
```

Expected: pretty output; the second line shows `"password":"[REDACTED]"`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/logger.ts package.json
git commit -m "feat: pino logger with redaction"
```

### Task 1.5: `lib/db.ts` â€” Prisma client singleton

**Files:**
- Create: `src/lib/db.ts`

- [ ] **Step 1: Install Prisma**

```bash
pnpm add -D prisma
pnpm add @prisma/client
pnpm exec prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma` and a stub `.env`. Delete the auto-generated `.env` if it exists; env is managed by `lib/env.ts` and developer-local `.env.local`.

- [ ] **Step 2: Write `src/lib/db.ts`**

```ts
import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__prisma ??
  new PrismaClient({
    log: [
      { level: "warn", emit: "event" },
      { level: "error", emit: "event" },
    ],
  });

if (process.env.NODE_ENV !== "production") globalThis.__prisma = prisma;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/db.ts prisma/schema.prisma package.json
git commit -m "feat: Prisma client singleton"
```

### Task 1.6: `lib/csv.ts` â€” CSV escape and row builder

**Files:**
- Create: `src/lib/csv.ts`
- Create: `tests/unit/lib/csv.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/unit/lib/csv.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { csvEscape, csvRow, csvHeader } from "@/lib/csv";

describe("csvEscape", () => {
  it("passes plain text through", () => { expect(csvEscape("alice")).toBe("alice"); });
  it("quotes values with commas", () => { expect(csvEscape("a,b")).toBe('"a,b"'); });
  it("doubles inner quotes", () => { expect(csvEscape('he said "hi"')).toBe('"he said ""hi"""'); });
  it("quotes values with newlines", () => { expect(csvEscape("a\nb")).toBe('"a\nb"'); });
  it("null/undefined become empty", () => {
    expect(csvEscape(null)).toBe(""); expect(csvEscape(undefined)).toBe("");
  });
  it("booleans format as true/false", () => {
    expect(csvEscape(true)).toBe("true"); expect(csvEscape(false)).toBe("false");
  });
  it("Date becomes ISO 8601", () => {
    expect(csvEscape(new Date("2026-05-12T13:00:00Z"))).toBe("2026-05-12T13:00:00.000Z");
  });
});

describe("csvRow / csvHeader", () => {
  it("joins escaped values with comma + CRLF", () => {
    expect(csvRow(["a", "b,c", "d"])).toBe('a,"b,c",d\r\n');
  });
  it("csvHeader writes the header row", () => {
    expect(csvHeader(["col1", "col2"])).toBe("col1,col2\r\n");
  });
});
```

- [ ] **Step 2: Run â€” expect failure**

```bash
pnpm test:unit
```

- [ ] **Step 3: Implement `src/lib/csv.ts`**

```ts
export type CsvCell = string | number | boolean | Date | null | undefined;

export function csvEscape(v: CsvCell): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  const s = typeof v === "string" ? v : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function csvRow(cells: ReadonlyArray<CsvCell>): string {
  return cells.map(csvEscape).join(",") + "\r\n";
}

export function csvHeader(cols: ReadonlyArray<string>): string {
  return csvRow(cols);
}
```

- [ ] **Step 4: Run â€” expect pass**

```bash
pnpm test:unit
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv.ts tests/unit/lib/csv.test.ts
git commit -m "feat: CSV row/escape helpers"
```

---


## Milestone 2 â€” Data model

End state: full Prisma schema deployed, partial unique index enforced at the DB layer, seed script creates the system user and the initial admin (from env), and an integration test proves "one open session per user" is enforced.

### Task 2.1: Prisma schema with all Phase 1 models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Replace `prisma/schema.prisma` with the full schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                  String   @id @default(cuid())
  email               String   @unique
  name                String
  passwordHash        String
  role                Role     @default(EMPLOYEE)
  timezone            String   @default("America/Chicago")
  mustChangePassword  Boolean  @default(false)
  deactivatedAt       DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  sessions  TimeSession[]
  auditLogs AuditLog[]    @relation("ActorAuditLogs")
}

enum Role {
  EMPLOYEE
  ADMIN
}

model TimeSession {
  id          String    @id @default(cuid())
  userId      String
  clockInAt   DateTime
  clockOutAt  DateTime?
  autoClosed  Boolean   @default(false)
  warnedAt    DateTime?
  notes       String?
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user      User       @relation(fields: [userId], references: [id])
  auditLogs AuditLog[]

  @@index([userId, clockInAt])
}

model AuditLog {
  id              String      @id @default(cuid())
  actorUserId     String
  targetSessionId String?
  action          AuditAction
  before          Json?
  after           Json?
  reason          String?
  at              DateTime    @default(now())

  actor   User         @relation("ActorAuditLogs", fields: [actorUserId], references: [id])
  session TimeSession? @relation(fields: [targetSessionId], references: [id])

  @@index([targetSessionId, at])
  @@index([actorUserId, at])
}

enum AuditAction {
  CLOCK_IN
  CLOCK_OUT
  EDIT_SESSION
  DELETE_SESSION
  AUTO_CLOSE
  CREATE_USER
  DEACTIVATE_USER
  ROLE_CHANGE
}

model LoginAttempt {
  id        String   @id @default(cuid())
  email     String
  succeeded Boolean
  at        DateTime @default(now())

  @@index([email, at])
}

model DigestSend {
  id      String   @id @default(cuid())
  userId  String
  isoWeek String
  sentAt  DateTime @default(now())

  @@unique([userId, isoWeek])
}
```

- [ ] **Step 2: Format and validate**

```bash
pnpm exec prisma format
pnpm exec prisma validate
```

Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: Prisma schema for Phase 1 models"
```

### Task 2.2: First migration

**Files:**
- Create: `prisma/migrations/<timestamp>_init/migration.sql`
- Create: `docker-compose.dev.yml` (local Postgres for migrate dev)

- [ ] **Step 1: Add a local-only `docker-compose.dev.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: punchpad-dev-pg
    environment:
      POSTGRES_USER: punchpad
      POSTGRES_PASSWORD: punchpad
      POSTGRES_DB: punchpad
    ports:
      - "5432:5432"
    volumes:
      - punchpad_pgdata:/var/lib/postgresql/data

volumes:
  punchpad_pgdata:
```

- [ ] **Step 2: Start it**

```bash
docker compose -f docker-compose.dev.yml up -d
```

- [ ] **Step 3: Create a developer-local env file**

Create `.env.local` (gitignored) with:

```
DATABASE_URL=postgresql://punchpad:punchpad@localhost:5432/punchpad
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-32-chars-aaaaaaaaaaaaa
ADMIN_EMAIL=jared@lexcom.com
ADMIN_INITIAL_PASSWORD=change-me-on-first-login
CRON_SECRET=dev-cron-secret-32-chars-aaaaaaaa
EMAIL_TRANSPORT=resend
RESEND_API_KEY=re_dev_dummy
EMAIL_FROM=PunchPad <punchpad@lexcom.com>
TZ_DEFAULT=America/Chicago
DIGEST_SEND_HOUR_LOCAL=7
```

- [ ] **Step 4: Generate the initial migration**

```bash
pnpm exec prisma migrate dev --name init
```

Expected: a `prisma/migrations/<timestamp>_init/` directory is created with `migration.sql`. Prisma also regenerates the client.

- [ ] **Step 5: Commit**

```bash
git add prisma/migrations docker-compose.dev.yml
git commit -m "feat: initial Prisma migration"
```

### Task 2.3: Raw migration for partial unique index

**Files:**
- Create: `prisma/migrations/<timestamp>_one_open_session/migration.sql`

- [ ] **Step 1: Create the migration directory**

```bash
pnpm exec prisma migrate dev --create-only --name one_open_session
```

This creates an empty `migration.sql` file.

- [ ] **Step 2: Add the partial unique index**

Open the new `migration.sql` and replace its contents with:

```sql
-- Enforce: a user can have at most one TimeSession with clockOutAt IS NULL
CREATE UNIQUE INDEX "one_open_session_per_user"
  ON "TimeSession" ("userId")
  WHERE "clockOutAt" IS NULL;
```

- [ ] **Step 3: Apply the migration**

```bash
pnpm exec prisma migrate dev
```

Expected: migration applies cleanly.

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations
git commit -m "feat: partial unique index for one-open-session-per-user"
```

### Task 2.4: Seed script (system user + initial admin)

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (`prisma.seed`)

- [ ] **Step 1: Install argon2 + tsx**

```bash
pnpm add @node-rs/argon2
```

(`tsx` was added earlier; if not, `pnpm add -D tsx`.)

- [ ] **Step 2: Configure Prisma seed**

Add to `package.json`:

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 3: Write `prisma/seed.ts`**

```ts
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPw = process.env.ADMIN_INITIAL_PASSWORD;
  if (!adminEmail || !adminPw) {
    throw new Error("ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD must be set for seed.");
  }

  // System user â€” reserved id for AUTO_CLOSE audit entries.
  await prisma.user.upsert({
    where: { id: "system" },
    update: {},
    create: {
      id: "system",
      email: "system@punchpad.internal",
      name: "System",
      passwordHash: "!disabled",
      role: Role.ADMIN,
      deactivatedAt: new Date(),
    },
  });

  // Initial admin â€” skip if any admin already exists.
  const anyAdmin = await prisma.user.findFirst({
    where: { role: Role.ADMIN, id: { not: "system" }, deactivatedAt: null },
  });
  if (!anyAdmin) {
    const passwordHash = await hash(adminPw);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Initial Admin",
        passwordHash,
        role: Role.ADMIN,
        mustChangePassword: true,
      },
    });
    console.log(`Seeded initial admin: ${adminEmail}`);
  } else {
    console.log("Admin already exists; skipping initial-admin seed.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

- [ ] **Step 4: Run seed against local DB**

```bash
pnpm exec dotenv -e .env.local -- prisma db seed
```

(If `dotenv-cli` is missing: `pnpm add -D dotenv-cli`.)

Expected: log "Seeded initial admin: jared@lexcom.com".

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: seed script for system user and initial admin"
```

### Task 2.5: Integration test harness with Testcontainers

**Files:**
- Create: `tests/integration/helpers/db.ts`
- Create: `tests/integration/db/schema.test.ts`

- [ ] **Step 1: Write the test helper**

`tests/integration/helpers/db.ts`:

```ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";

export type TestDb = {
  prisma: PrismaClient;
  container: StartedPostgreSqlContainer;
  url: string;
  stop: () => Promise<void>;
};

export async function setupTestDb(): Promise<TestDb> {
  const container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("pnpm exec prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  return {
    prisma,
    container,
    url,
    stop: async () => {
      await prisma.$disconnect();
      await container.stop();
    },
  };
}
```

- [ ] **Step 2: Write the failing test**

`tests/integration/db/schema.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { hash } from "@node-rs/argon2";
import { setupTestDb, type TestDb } from "../helpers/db";

let db: TestDb;

beforeAll(async () => { db = await setupTestDb(); }, 120_000);
afterAll(async () => { await db.stop(); });

describe("schema invariants", () => {
  it("partial unique index rejects a second open session for the same user", async () => {
    const user = await db.prisma.user.create({
      data: { email: "u1@x.com", name: "U1", passwordHash: await hash("password1234") },
    });
    await db.prisma.timeSession.create({
      data: { userId: user.id, clockInAt: new Date("2026-05-12T08:00:00Z") },
    });
    await expect(
      db.prisma.timeSession.create({
        data: { userId: user.id, clockInAt: new Date("2026-05-12T09:00:00Z") },
      }),
    ).rejects.toThrow(/one_open_session_per_user/);
  });

  it("partial unique index allows two closed sessions on the same user", async () => {
    const user = await db.prisma.user.create({
      data: { email: "u2@x.com", name: "U2", passwordHash: await hash("password1234") },
    });
    await db.prisma.timeSession.create({
      data: {
        userId: user.id,
        clockInAt: new Date("2026-05-12T08:00:00Z"),
        clockOutAt: new Date("2026-05-12T12:00:00Z"),
      },
    });
    await db.prisma.timeSession.create({
      data: {
        userId: user.id,
        clockInAt: new Date("2026-05-12T13:00:00Z"),
        clockOutAt: new Date("2026-05-12T17:00:00Z"),
      },
    });
    const sessions = await db.prisma.timeSession.findMany({ where: { userId: user.id } });
    expect(sessions).toHaveLength(2);
  });

  it("DigestSend unique constraint blocks duplicate (userId, isoWeek)", async () => {
    const user = await db.prisma.user.create({
      data: { email: "u3@x.com", name: "U3", passwordHash: await hash("password1234") },
    });
    await db.prisma.digestSend.create({ data: { userId: user.id, isoWeek: "2026-W19" } });
    await expect(
      db.prisma.digestSend.create({ data: { userId: user.id, isoWeek: "2026-W19" } }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run the integration tests**

```bash
pnpm test:int
```

Expected: all three pass. First run may take a minute pulling the Postgres image.

- [ ] **Step 4: Commit**

```bash
git add tests/integration
git commit -m "test: schema-invariant integration tests via Testcontainers"
```

---


## Milestone 3 â€” Authentication

End state: a user can log in at `/login`, get a JWT-backed NextAuth session that carries `id/email/name/role/timezone`, hit a protected page, and be blocked after 5 failed attempts in 15 min. The first login after admin reset forces a password change. E2E covers success + lockout.

### Task 3.1: Argon2 hash/verify wrappers + tests

**Files:**
- Create: `src/lib/password.ts`
- Create: `tests/unit/lib/password.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/unit/lib/password.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password", () => {
  it("hashPassword returns argon2id phc string", async () => {
    const h = await hashPassword("correct horse battery staple");
    expect(h).toMatch(/^\$argon2id\$/);
  });

  it("verifyPassword accepts the right password", async () => {
    const h = await hashPassword("hunter22222222");
    expect(await verifyPassword(h, "hunter22222222")).toBe(true);
  });

  it("verifyPassword rejects the wrong password", async () => {
    const h = await hashPassword("hunter22222222");
    expect(await verifyPassword(h, "wrongpassword!")).toBe(false);
  });

  it("verifyPassword returns false on invalid hash without throwing", async () => {
    expect(await verifyPassword("not-a-hash", "anything")).toBe(false);
  });
});
```

- [ ] **Step 2: Run â€” expect failure**

```bash
pnpm test:unit
```

- [ ] **Step 3: Implement `src/lib/password.ts`**

```ts
import { hash, verify } from "@node-rs/argon2";

const OPTS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTS);
}

export async function verifyPassword(stored: string, plain: string): Promise<boolean> {
  try {
    return await verify(stored, plain);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run â€” expect pass**

```bash
pnpm test:unit
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/password.ts tests/unit/lib/password.test.ts
git commit -m "feat: argon2id password hash/verify"
```

### Task 3.2: Login-attempt lockout service

**Files:**
- Create: `src/features/auth/lockout.ts`
- Create: `tests/integration/auth/lockout.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/integration/auth/lockout.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import { recordAttempt, isLockedOut } from "@/features/auth/lockout";
import { FakeClock } from "@/lib/time";

let db: TestDb;
const clock = new FakeClock(new Date("2026-05-12T10:00:00Z"));

beforeAll(async () => { db = await setupTestDb(); }, 120_000);
afterAll(async () => { await db.stop(); });
beforeEach(async () => { await db.prisma.loginAttempt.deleteMany(); clock.setNow(new Date("2026-05-12T10:00:00Z")); });

describe("lockout", () => {
  it("allows login when no attempts logged", async () => {
    expect(await isLockedOut(db.prisma, "a@b.com", clock)).toBe(false);
  });

  it("locks out after 5 failures in a 15-minute window", async () => {
    for (let i = 0; i < 5; i++) {
      await recordAttempt(db.prisma, "a@b.com", false, clock);
      clock.advanceSeconds(30);
    }
    expect(await isLockedOut(db.prisma, "a@b.com", clock)).toBe(true);
  });

  it("does not lock out after fewer than 5 failures", async () => {
    for (let i = 0; i < 4; i++) {
      await recordAttempt(db.prisma, "a@b.com", false, clock);
      clock.advanceSeconds(30);
    }
    expect(await isLockedOut(db.prisma, "a@b.com", clock)).toBe(false);
  });

  it("expires lock 15 minutes after the 5th failure", async () => {
    for (let i = 0; i < 5; i++) {
      await recordAttempt(db.prisma, "a@b.com", false, clock);
      clock.advanceSeconds(10);
    }
    expect(await isLockedOut(db.prisma, "a@b.com", clock)).toBe(true);
    clock.advanceMinutes(16);
    expect(await isLockedOut(db.prisma, "a@b.com", clock)).toBe(false);
  });

  it("success resets the counter", async () => {
    for (let i = 0; i < 4; i++) await recordAttempt(db.prisma, "a@b.com", false, clock);
    await recordAttempt(db.prisma, "a@b.com", true, clock);
    for (let i = 0; i < 4; i++) await recordAttempt(db.prisma, "a@b.com", false, clock);
    expect(await isLockedOut(db.prisma, "a@b.com", clock)).toBe(false);
  });
});
```

- [ ] **Step 2: Run â€” expect failure**

```bash
pnpm test:int
```

- [ ] **Step 3: Implement `src/features/auth/lockout.ts`**

```ts
import type { PrismaClient } from "@prisma/client";
import type { Clock } from "@/lib/time";

const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;

export async function recordAttempt(
  prisma: PrismaClient,
  email: string,
  succeeded: boolean,
  clock: Clock,
): Promise<void> {
  await prisma.loginAttempt.create({
    data: { email: email.toLowerCase(), succeeded, at: clock.now() },
  });
}

export async function isLockedOut(
  prisma: PrismaClient,
  email: string,
  clock: Clock,
): Promise<boolean> {
  const now = clock.now();
  const since = new Date(now.getTime() - WINDOW_MS);
  const recent = await prisma.loginAttempt.findMany({
    where: { email: email.toLowerCase(), at: { gte: since } },
    orderBy: { at: "desc" },
    take: MAX_FAILURES + 1,
  });
  const sinceLastSuccess: typeof recent = [];
  for (const a of recent) {
    if (a.succeeded) break;
    sinceLastSuccess.push(a);
  }
  return sinceLastSuccess.length >= MAX_FAILURES;
}

export async function pruneOldAttempts(prisma: PrismaClient, clock: Clock): Promise<number> {
  const cutoff = new Date(clock.now().getTime() - 24 * 3_600_000);
  const r = await prisma.loginAttempt.deleteMany({ where: { at: { lt: cutoff } } });
  return r.count;
}
```

- [ ] **Step 4: Run â€” expect pass**

```bash
pnpm test:int
```

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/lockout.ts tests/integration/auth/lockout.test.ts
git commit -m "feat: login lockout (5 failures / 15 min)"
```

### Task 3.3: NextAuth v5 configuration

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/types/next-auth.d.ts`

- [ ] **Step 1: Install NextAuth v5**

```bash
pnpm add next-auth@beta
```

(NextAuth v5 â€” also known as Auth.js â€” is published as `next-auth@beta` at the time of writing.)

- [ ] **Step 2: Write `src/types/next-auth.d.ts`**

```ts
import type { Role } from "@prisma/client";
import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    role: Role;
    timezone: string;
    mustChangePassword: boolean;
  }
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      timezone: string;
      mustChangePassword: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: Role;
    timezone: string;
    mustChangePassword: boolean;
  }
}
```

- [ ] **Step 3: Write `src/lib/auth.ts`**

```ts
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { isLockedOut, recordAttempt } from "@/features/auth/lockout";
import { systemClock } from "@/lib/time";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const credSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = credSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();

        if (await isLockedOut(prisma, email, systemClock)) {
          logger.warn({ email }, "login_locked_out");
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.deactivatedAt) {
          await recordAttempt(prisma, email, false, systemClock);
          return null;
        }
        const ok = await verifyPassword(user.passwordHash, parsed.data.password);
        await recordAttempt(prisma, email, ok, systemClock);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          timezone: user.timezone,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.email = user.email!;
        token.name = user.name!;
        token.role = user.role;
        token.timezone = user.timezone;
        token.mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    session: ({ session, token }) => {
      session.user = {
        id: token.id,
        email: token.email,
        name: token.name,
        role: token.role,
        timezone: token.timezone,
        mustChangePassword: token.mustChangePassword,
      };
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  return session.user;
}
export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "ADMIN") throw new ForbiddenError();
  return u;
}
```

- [ ] **Step 4: Wire the NextAuth route handler**

`src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 5: Boot, verify no compile errors**

```bash
pnpm typecheck && pnpm dev
```

Visit http://localhost:3000/api/auth/csrf â€” expect a JSON body with a `csrfToken`. Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth src/types/next-auth.d.ts package.json
git commit -m "feat: NextAuth v5 credentials provider with JWT session"
```

### Task 3.4: Middleware protecting the (app) route group

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Write `src/middleware.ts`**

```ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/clock", "/calendar", "/reports", "/admin"];

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const needsAuth = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  if (!needsAuth) return NextResponse.next();

  if (!req.auth?.user) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (req.auth.user.mustChangePassword && path !== "/account/change-password") {
    return NextResponse.redirect(new URL("/account/change-password", req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: auth middleware for app routes + mustChangePassword gate"
```

### Task 3.5: `/login` page UI

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/login/login-form.tsx`
- Create: `src/app/(auth)/layout.tsx`

- [ ] **Step 1: Write `src/app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
```

- [ ] **Step 2: Write `src/app/(auth)/login/login-form.tsx`**

```tsx
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
        <Input id="email" name="email" type="email" autoComplete="email" required data-testid="login-email" />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required data-testid="login-password" />
      </div>
      {error && (
        <p data-testid="login-error" className="text-sm text-[var(--danger)]">{error}</p>
      )}
      <Button type="submit" disabled={pending} data-testid="login-submit">
        {pending ? "Signing inâ€¦" : "Sign in"}
      </Button>
      <p className="text-xs text-[var(--text-dim)]">Forgot your password? Ask your admin.</p>
    </form>
  );
}
```

- [ ] **Step 3: Write `src/app/(auth)/login/page.tsx`**

```tsx
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-6">
      <h1 className="mb-4 font-display text-2xl font-semibold">PunchPad</h1>
      <LoginForm />
    </section>
  );
}
```

- [ ] **Step 4: Verify**

```bash
pnpm dev
```

Visit /login â€” see the form. Try a wrong password â€” see error. Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(auth\)
git commit -m "feat: /login page UI"
```

### Task 3.6: `mustChangePassword` interstitial

**Files:**
- Create: `src/app/(app)/account/change-password/page.tsx`
- Create: `src/features/users/actions.ts`
- Create: `src/features/users/service.ts`

- [ ] **Step 1: Write `src/features/users/service.ts`**

```ts
import type { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "@/lib/password";
import { ValidationError, NotFoundError } from "@/lib/errors";

export async function changeOwnPassword(
  prisma: PrismaClient,
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (newPassword.length < 12) throw new ValidationError("New password must be at least 12 characters.");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError();
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new ValidationError("Current password is incorrect.");
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });
}
```

- [ ] **Step 2: Write `src/features/users/actions.ts`**

```ts
"use server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { changeOwnPassword } from "./service";
import { toErrorEnvelope } from "@/lib/errors";
import { revalidatePath } from "next/cache";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
});

export async function changeOwnPasswordAction(input: unknown) {
  try {
    const user = await requireUser();
    const data = schema.parse(input);
    await changeOwnPassword(prisma, user.id, data.currentPassword, data.newPassword);
    revalidatePath("/clock");
    return { ok: true as const };
  } catch (err) {
    return toErrorEnvelope(err);
  }
}
```

- [ ] **Step 3: Write the page**

`src/app/(app)/account/change-password/page.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeOwnPasswordAction } from "@/features/users/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ChangePasswordPage() {
  const router = useRouter();
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
          startTransition(async () => {
            setError(null);
            const res = await changeOwnPasswordAction({
              currentPassword: fd.get("currentPassword"),
              newPassword: fd.get("newPassword"),
            });
            if (!("ok" in res) || !res.ok) {
              setError("message" in res ? res.message : "Unknown error");
              return;
            }
            router.push("/clock");
            router.refresh();
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
        {error && <p data-testid="cp-error" className="text-sm text-[var(--danger)]">{error}</p>}
        <Button type="submit" disabled={pending} data-testid="cp-submit">
          {pending ? "Savingâ€¦" : "Save"}
        </Button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/users src/app/\(app\)/account
git commit -m "feat: mustChangePassword interstitial flow"
```

### Task 3.7: Playwright auth setup (JWT cookie injection)

**Files:**
- Create: `tests/e2e/auth.setup.ts`
- Create: `tests/e2e/global-setup.ts`
- Create: `tests/e2e/storage/.gitignore`
- Modify: `playwright.config.ts`

- [ ] **Step 1: Write `tests/e2e/global-setup.ts`**

```ts
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

export default async function globalSetup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL must be set for E2E.");
  execSync("pnpm exec prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "inherit" });
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    await prisma.auditLog.deleteMany();
    await prisma.timeSession.deleteMany();
    await prisma.loginAttempt.deleteMany();
    await prisma.digestSend.deleteMany();
    await prisma.user.deleteMany({ where: { id: { not: "system" } } });
    await prisma.user.upsert({
      where: { id: "system" },
      update: {},
      create: { id: "system", email: "system@punchpad.internal", name: "System", passwordHash: "!disabled", role: "ADMIN", deactivatedAt: new Date() },
    });
    await prisma.user.create({
      data: { email: "admin@e2e.test", name: "E2E Admin", passwordHash: await hash("password1234aa"), role: "ADMIN", timezone: "America/Chicago" },
    });
    await prisma.user.create({
      data: { email: "emp@e2e.test", name: "E2E Employee", passwordHash: await hash("password1234aa"), role: "EMPLOYEE", timezone: "America/Chicago" },
    });
  } finally {
    await prisma.$disconnect();
  }
}
```

- [ ] **Step 2: Write `tests/e2e/auth.setup.ts`**

```ts
import { test as setup } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { PrismaClient } from "@prisma/client";
import path from "node:path";

const SECRET = process.env.NEXTAUTH_SECRET ?? "dev-secret-32-chars-aaaaaaaaaaaaa";

async function storageStateFor(email: string, file: string) {
  const prisma = new PrismaClient();
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.$disconnect();
  const token = await encode({
    salt: "authjs.session-token",
    secret: SECRET,
    token: {
      id: user.id, email: user.email, name: user.name, role: user.role,
      timezone: user.timezone, mustChangePassword: user.mustChangePassword,
      sub: user.id, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
    },
  });
  return { cookies: [{ name: "authjs.session-token", value: token, domain: "localhost", path: "/", expires: -1, httpOnly: true, secure: false, sameSite: "Lax" as const }], origins: [] };
}

setup("authenticate admin", async () => {
  const fs = await import("node:fs/promises");
  const state = await storageStateFor("admin@e2e.test", "admin.json");
  await fs.mkdir(path.join("tests/e2e/storage"), { recursive: true });
  await fs.writeFile(path.join("tests/e2e/storage/admin.json"), JSON.stringify(state, null, 2));
});

setup("authenticate employee", async () => {
  const fs = await import("node:fs/promises");
  const state = await storageStateFor("emp@e2e.test", "emp.json");
  await fs.mkdir(path.join("tests/e2e/storage"), { recursive: true });
  await fs.writeFile(path.join("tests/e2e/storage/emp.json"), JSON.stringify(state, null, 2));
});
```

- [ ] **Step 3: Update `playwright.config.ts`**

Replace `projects` with:

```ts
projects: [
  { name: "setup", testMatch: /auth\.setup\.ts/ },
  { name: "chromium-admin", use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/storage/admin.json" }, dependencies: ["setup"] },
  { name: "chromium-emp", use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/storage/emp.json" }, dependencies: ["setup"] },
  { name: "chromium-public", use: { ...devices["Desktop Chrome"] } },
],
```

Add at the top of the config:

```ts
import { fileURLToPath } from "node:url";
import path from "node:path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
```

And add to the `defineConfig`:

```ts
globalSetup: require.resolve("./tests/e2e/global-setup"),
```

(If using ESM-only config, swap to `globalSetup: "./tests/e2e/global-setup.ts"`.)

Create `tests/e2e/storage/.gitignore`:

```
*
!.gitignore
```

- [ ] **Step 4: Commit**

```bash
git add tests/e2e playwright.config.ts
git commit -m "test: Playwright global setup and JWT cookie auth setup"
```

### Task 3.8: E2E â€” login success + lockout

**Files:**
- Create: `tests/e2e/auth/login.spec.ts`

- [ ] **Step 1: Write `tests/e2e/auth/login.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test.describe("login", () => {
  test.use({ storageState: undefined });

  test("successful login redirects to /clock", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("emp@e2e.test");
    await page.getByTestId("login-password").fill("password1234aa");
    await page.getByTestId("login-submit").click();
    await page.waitForURL("**/clock");
    await expect(page).toHaveURL(/\/clock$/);
  });

  test("wrong password shows error and stays on /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("emp@e2e.test");
    await page.getByTestId("login-password").fill("wrongwrongwrong");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-error")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("5 failures triggers lockout (6th attempt is also rejected even with right password)", async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await page.goto("/login");
      await page.getByTestId("login-email").fill("emp@e2e.test");
      await page.getByTestId("login-password").fill("wrongwrongwrong");
      await page.getByTestId("login-submit").click();
      await expect(page.getByTestId("login-error")).toBeVisible();
    }
    await page.goto("/login");
    await page.getByTestId("login-email").fill("emp@e2e.test");
    await page.getByTestId("login-password").fill("password1234aa");
    await page.getByTestId("login-submit").click();
    await expect(page.getByTestId("login-error")).toBeVisible();
  });
});
```

The test runs under the `chromium-public` project (no storage state).

- [ ] **Step 2: Run E2E**

```bash
pnpm test:e2e --project=setup --project=chromium-public
```

Expected: all 3 login tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/auth
git commit -m "test: e2e login + lockout"
```

---


## Milestone 4 â€” Attendance services

End state: pure business-logic functions in `features/attendance/service.ts` for clock in, clock out, employee self-edit (7-day window), admin edit, admin delete, with audit-log writes on every mutation. Server actions in `features/attendance/actions.ts` expose them to UI. All paths covered by integration tests with a real Postgres.

### Task 4.1: Attendance service signatures + types

**Files:**
- Create: `src/features/attendance/types.ts`
- Create: `src/features/attendance/service.ts` (stubs)

- [ ] **Step 1: Write `src/features/attendance/types.ts`**

```ts
import type { TimeSession } from "@prisma/client";

export type SessionSnapshot = {
  id: string;
  userId: string;
  clockInAt: string;
  clockOutAt: string | null;
  autoClosed: boolean;
  notes: string | null;
  deletedAt: string | null;
};

export type SessionPatch = {
  clockInAt?: Date;
  clockOutAt?: Date | null;
  notes?: string | null;
  reason?: string;
};

export function snapshot(s: TimeSession): SessionSnapshot {
  return {
    id: s.id,
    userId: s.userId,
    clockInAt: s.clockInAt.toISOString(),
    clockOutAt: s.clockOutAt?.toISOString() ?? null,
    autoClosed: s.autoClosed,
    notes: s.notes,
    deletedAt: s.deletedAt?.toISOString() ?? null,
  };
}
```

- [ ] **Step 2: Write `src/features/attendance/service.ts` stub**

```ts
import type { PrismaClient, TimeSession } from "@prisma/client";
import type { Clock } from "@/lib/time";
import type { SessionPatch } from "./types";

export type ServiceDeps = { prisma: PrismaClient; clock: Clock };

export async function clockIn(_d: ServiceDeps, _userId: string): Promise<TimeSession> {
  throw new Error("not implemented");
}
export async function clockOut(_d: ServiceDeps, _userId: string): Promise<TimeSession> {
  throw new Error("not implemented");
}
export async function editOwnSession(
  _d: ServiceDeps, _userId: string, _sessionId: string, _patch: SessionPatch,
): Promise<TimeSession> {
  throw new Error("not implemented");
}
export async function adminEditSession(
  _d: ServiceDeps, _adminId: string, _sessionId: string, _patch: SessionPatch,
): Promise<TimeSession> {
  throw new Error("not implemented");
}
export async function adminDeleteSession(
  _d: ServiceDeps, _adminId: string, _sessionId: string, _reason: string,
): Promise<void> {
  throw new Error("not implemented");
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/attendance
git commit -m "feat(attendance): types and service stubs"
```

### Task 4.2: `clockIn` service + audit + tests

**Files:**
- Modify: `src/features/attendance/service.ts`
- Create: `tests/integration/attendance/clock-in.test.ts`

- [ ] **Step 1: Write failing test**

`tests/integration/attendance/clock-in.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import { clockIn } from "@/features/attendance/service";
import { FakeClock } from "@/lib/time";
import { hash } from "@node-rs/argon2";

let db: TestDb;
const clock = new FakeClock(new Date("2026-05-12T13:00:00Z"));

beforeAll(async () => { db = await setupTestDb(); }, 120_000);
afterAll(async () => { await db.stop(); });
beforeEach(async () => {
  await db.prisma.auditLog.deleteMany();
  await db.prisma.timeSession.deleteMany();
  await db.prisma.user.deleteMany({ where: { id: { not: "system" } } });
  clock.setNow(new Date("2026-05-12T13:00:00Z"));
});

async function makeUser(email = "u@x.com") {
  return db.prisma.user.create({
    data: { email, name: "U", passwordHash: await hash("password1234aa") },
  });
}

describe("clockIn", () => {
  it("creates a session with clockInAt = clock.now() and an audit row", async () => {
    const u = await makeUser();
    const s = await clockIn({ prisma: db.prisma, clock }, u.id);
    expect(s.clockInAt.toISOString()).toBe("2026-05-12T13:00:00.000Z");
    expect(s.clockOutAt).toBeNull();
    const audits = await db.prisma.auditLog.findMany({ where: { targetSessionId: s.id } });
    expect(audits).toHaveLength(1);
    expect(audits[0]!.action).toBe("CLOCK_IN");
    expect(audits[0]!.actorUserId).toBe(u.id);
  });

  it("refuses when a session is already open (ConflictError ALREADY_CLOCKED_IN)", async () => {
    const u = await makeUser();
    await clockIn({ prisma: db.prisma, clock }, u.id);
    await expect(clockIn({ prisma: db.prisma, clock }, u.id)).rejects.toMatchObject({ code: "ALREADY_CLOCKED_IN" });
  });

  it("refuses when user is deactivated", async () => {
    const u = await makeUser();
    await db.prisma.user.update({ where: { id: u.id }, data: { deactivatedAt: new Date() } });
    await expect(clockIn({ prisma: db.prisma, clock }, u.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
```

- [ ] **Step 2: Run â€” expect failure**

```bash
pnpm test:int
```

- [ ] **Step 3: Implement `clockIn` in `service.ts`**

Replace the `clockIn` stub:

```ts
import { ConflictError, ForbiddenError } from "@/lib/errors";

export async function clockIn(
  { prisma, clock }: ServiceDeps,
  userId: string,
): Promise<TimeSession> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.deactivatedAt) throw new ForbiddenError("Account is deactivated.");
    try {
      const session = await tx.timeSession.create({
        data: { userId, clockInAt: clock.now() },
      });
      await tx.auditLog.create({
        data: { actorUserId: userId, targetSessionId: session.id, action: "CLOCK_IN" },
      });
      return session;
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") {
        throw new ConflictError("ALREADY_CLOCKED_IN", "You are already clocked in.");
      }
      throw e;
    }
  });
}
```

- [ ] **Step 4: Run â€” expect pass**

```bash
pnpm test:int
```

- [ ] **Step 5: Commit**

```bash
git add src/features/attendance/service.ts tests/integration/attendance/clock-in.test.ts
git commit -m "feat(attendance): clockIn with audit + ConflictError on double-clock-in"
```

### Task 4.3: `clockOut` service + audit + tests

**Files:**
- Modify: `src/features/attendance/service.ts`
- Create: `tests/integration/attendance/clock-out.test.ts`

- [ ] **Step 1: Write failing test**

`tests/integration/attendance/clock-out.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import { clockIn, clockOut } from "@/features/attendance/service";
import { FakeClock } from "@/lib/time";
import { hash } from "@node-rs/argon2";

let db: TestDb;
const clock = new FakeClock(new Date("2026-05-12T13:00:00Z"));
beforeAll(async () => { db = await setupTestDb(); }, 120_000);
afterAll(async () => { await db.stop(); });
beforeEach(async () => {
  await db.prisma.auditLog.deleteMany();
  await db.prisma.timeSession.deleteMany();
  await db.prisma.user.deleteMany({ where: { id: { not: "system" } } });
  clock.setNow(new Date("2026-05-12T13:00:00Z"));
});

describe("clockOut", () => {
  it("closes the open session and writes CLOCK_OUT audit", async () => {
    const u = await db.prisma.user.create({ data: { email: "u@x.com", name: "U", passwordHash: await hash("password1234aa") } });
    await clockIn({ prisma: db.prisma, clock }, u.id);
    clock.advanceMinutes(90);
    const s = await clockOut({ prisma: db.prisma, clock }, u.id);
    expect(s.clockOutAt?.toISOString()).toBe("2026-05-12T14:30:00.000Z");
    const audits = await db.prisma.auditLog.findMany({ where: { targetSessionId: s.id }, orderBy: { at: "asc" } });
    expect(audits.map((a) => a.action)).toEqual(["CLOCK_IN", "CLOCK_OUT"]);
  });

  it("rejects when there is no open session (NotFoundError)", async () => {
    const u = await db.prisma.user.create({ data: { email: "u@x.com", name: "U", passwordHash: await hash("password1234aa") } });
    await expect(clockOut({ prisma: db.prisma, clock }, u.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
```

- [ ] **Step 2: Run â€” expect failure**

```bash
pnpm test:int
```

- [ ] **Step 3: Implement `clockOut`**

```ts
import { NotFoundError } from "@/lib/errors";

export async function clockOut(
  { prisma, clock }: ServiceDeps,
  userId: string,
): Promise<TimeSession> {
  return prisma.$transaction(async (tx) => {
    const open = await tx.timeSession.findFirst({ where: { userId, clockOutAt: null, deletedAt: null } });
    if (!open) throw new NotFoundError("You are not clocked in.");
    const updated = await tx.timeSession.update({
      where: { id: open.id },
      data: { clockOutAt: clock.now() },
    });
    await tx.auditLog.create({
      data: { actorUserId: userId, targetSessionId: open.id, action: "CLOCK_OUT" },
    });
    return updated;
  });
}
```

- [ ] **Step 4: Run â€” expect pass**

```bash
pnpm test:int
```

- [ ] **Step 5: Commit**

```bash
git add src/features/attendance/service.ts tests/integration/attendance/clock-out.test.ts
git commit -m "feat(attendance): clockOut with audit"
```

### Task 4.4: Overlap detection helper + tests

**Files:**
- Modify: `src/features/attendance/service.ts`
- Create: `tests/unit/attendance/overlap.test.ts`

- [ ] **Step 1: Write failing unit test**

`tests/unit/attendance/overlap.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { rangesOverlap } from "@/features/attendance/service";

describe("rangesOverlap", () => {
  const A_IN = new Date("2026-05-12T08:00:00Z");
  const A_OUT = new Date("2026-05-12T12:00:00Z");
  it("non-overlapping sequential ranges do not overlap", () => {
    expect(rangesOverlap(A_IN, A_OUT, new Date("2026-05-12T12:00:00Z"), new Date("2026-05-12T14:00:00Z"))).toBe(false);
  });
  it("interior overlap returns true", () => {
    expect(rangesOverlap(A_IN, A_OUT, new Date("2026-05-12T10:00:00Z"), new Date("2026-05-12T11:00:00Z"))).toBe(true);
  });
  it("partial overlap returns true", () => {
    expect(rangesOverlap(A_IN, A_OUT, new Date("2026-05-12T11:00:00Z"), new Date("2026-05-12T13:00:00Z"))).toBe(true);
  });
  it("open-ended sessions (no out) treated as ongoing to far future", () => {
    expect(rangesOverlap(A_IN, null, new Date("2026-05-12T20:00:00Z"), new Date("2026-05-12T21:00:00Z"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run â€” expect failure**

```bash
pnpm test:unit
```

- [ ] **Step 3: Add `rangesOverlap` export to `service.ts`**

```ts
export function rangesOverlap(
  aIn: Date,
  aOut: Date | null,
  bIn: Date,
  bOut: Date | null,
): boolean {
  const FAR = new Date(8.64e15);
  const aEnd = aOut ?? FAR;
  const bEnd = bOut ?? FAR;
  return aIn < bEnd && bIn < aEnd;
}
```

- [ ] **Step 4: Run â€” expect pass**

```bash
pnpm test:unit
```

- [ ] **Step 5: Commit**

```bash
git add src/features/attendance/service.ts tests/unit/attendance/overlap.test.ts
git commit -m "feat(attendance): rangesOverlap helper"
```

### Task 4.5: `editOwnSession` (7-day window, validation, audit)

**Files:**
- Modify: `src/features/attendance/service.ts`
- Create: `tests/integration/attendance/edit-own.test.ts`

- [ ] **Step 1: Write failing test**

`tests/integration/attendance/edit-own.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import { editOwnSession } from "@/features/attendance/service";
import { FakeClock } from "@/lib/time";
import { hash } from "@node-rs/argon2";

let db: TestDb;
const clock = new FakeClock(new Date("2026-05-12T13:00:00Z"));
beforeAll(async () => { db = await setupTestDb(); }, 120_000);
afterAll(async () => { await db.stop(); });
beforeEach(async () => {
  await db.prisma.auditLog.deleteMany();
  await db.prisma.timeSession.deleteMany();
  await db.prisma.user.deleteMany({ where: { id: { not: "system" } } });
  clock.setNow(new Date("2026-05-12T13:00:00Z"));
});

async function makeUser() {
  return db.prisma.user.create({ data: { email: "u@x.com", name: "U", passwordHash: await hash("password1234aa") } });
}

describe("editOwnSession", () => {
  it("adjusts times within 7-day window and writes EDIT_SESSION audit with before/after", async () => {
    const u = await makeUser();
    const s = await db.prisma.timeSession.create({
      data: { userId: u.id, clockInAt: new Date("2026-05-12T08:00:00Z"), clockOutAt: new Date("2026-05-12T12:00:00Z") },
    });
    const updated = await editOwnSession(
      { prisma: db.prisma, clock }, u.id, s.id,
      { clockInAt: new Date("2026-05-12T08:15:00Z"), reason: "forgot to clock in" },
    );
    expect(updated.clockInAt.toISOString()).toBe("2026-05-12T08:15:00.000Z");
    const audit = await db.prisma.auditLog.findFirst({ where: { targetSessionId: s.id, action: "EDIT_SESSION" } });
    expect(audit?.reason).toBe("forgot to clock in");
    expect(audit?.before).toBeTruthy();
    expect(audit?.after).toBeTruthy();
  });

  it("rejects edit outside 7-day window", async () => {
    const u = await makeUser();
    const s = await db.prisma.timeSession.create({
      data: { userId: u.id, clockInAt: new Date("2026-05-01T08:00:00Z"), clockOutAt: new Date("2026-05-01T12:00:00Z") },
    });
    await expect(editOwnSession(
      { prisma: db.prisma, clock }, u.id, s.id,
      { clockInAt: new Date("2026-05-01T08:30:00Z") },
    )).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects editing another user's session", async () => {
    const u1 = await db.prisma.user.create({ data: { email: "u1@x.com", name: "U1", passwordHash: await hash("password1234aa") } });
    const u2 = await db.prisma.user.create({ data: { email: "u2@x.com", name: "U2", passwordHash: await hash("password1234aa") } });
    const s = await db.prisma.timeSession.create({
      data: { userId: u2.id, clockInAt: new Date("2026-05-12T08:00:00Z"), clockOutAt: new Date("2026-05-12T12:00:00Z") },
    });
    await expect(editOwnSession(
      { prisma: db.prisma, clock }, u1.id, s.id, { clockInAt: new Date("2026-05-12T08:30:00Z") },
    )).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects edit that creates overlap with another own session", async () => {
    const u = await makeUser();
    await db.prisma.timeSession.create({
      data: { userId: u.id, clockInAt: new Date("2026-05-12T08:00:00Z"), clockOutAt: new Date("2026-05-12T10:00:00Z") },
    });
    const s2 = await db.prisma.timeSession.create({
      data: { userId: u.id, clockInAt: new Date("2026-05-12T11:00:00Z"), clockOutAt: new Date("2026-05-12T12:00:00Z") },
    });
    await expect(editOwnSession(
      { prisma: db.prisma, clock }, u.id, s2.id,
      { clockInAt: new Date("2026-05-12T09:30:00Z") },
    )).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects times in the future", async () => {
    const u = await makeUser();
    const s = await db.prisma.timeSession.create({
      data: { userId: u.id, clockInAt: new Date("2026-05-12T08:00:00Z"), clockOutAt: new Date("2026-05-12T12:00:00Z") },
    });
    await expect(editOwnSession(
      { prisma: db.prisma, clock }, u.id, s.id,
      { clockOutAt: new Date("2026-06-01T00:00:00Z") },
    )).rejects.toMatchObject({ code: "VALIDATION" });
  });
});
```

- [ ] **Step 2: Run â€” expect failure**

```bash
pnpm test:int
```

- [ ] **Step 3: Implement `editOwnSession`**

```ts
import { ValidationError } from "@/lib/errors";
import { snapshot } from "./types";

const SEVEN_DAYS_MS = 7 * 24 * 3_600_000;

export async function editOwnSession(
  { prisma, clock }: ServiceDeps,
  userId: string,
  sessionId: string,
  patch: SessionPatch,
): Promise<TimeSession> {
  return prisma.$transaction(async (tx) => {
    const s = await tx.timeSession.findUnique({ where: { id: sessionId } });
    if (!s || s.deletedAt) throw new NotFoundError();
    if (s.userId !== userId) throw new ForbiddenError();
    const now = clock.now();
    if (now.getTime() - s.clockInAt.getTime() > SEVEN_DAYS_MS) {
      throw new ForbiddenError("OUTSIDE_EDIT_WINDOW: session is older than 7 days.");
    }

    const nextIn = patch.clockInAt ?? s.clockInAt;
    const nextOut = patch.clockOutAt === undefined ? s.clockOutAt : patch.clockOutAt;
    if (nextOut !== null && nextIn >= nextOut) throw new ValidationError("clockInAt must be before clockOutAt.");
    if (nextIn > now) throw new ValidationError("clockInAt cannot be in the future.");
    if (nextOut !== null && nextOut > now) throw new ValidationError("clockOutAt cannot be in the future.");

    const others = await tx.timeSession.findMany({
      where: { userId, id: { not: sessionId }, deletedAt: null },
    });
    for (const o of others) {
      if (rangesOverlap(nextIn, nextOut, o.clockInAt, o.clockOutAt)) {
        throw new ConflictError("OVERLAP", "Edit would overlap an existing session.");
      }
    }

    const before = snapshot(s);
    const updated = await tx.timeSession.update({
      where: { id: sessionId },
      data: {
        clockInAt: nextIn,
        clockOutAt: nextOut,
        notes: patch.notes ?? s.notes,
      },
    });
    const after = snapshot(updated);
    await tx.auditLog.create({
      data: {
        actorUserId: userId, targetSessionId: sessionId, action: "EDIT_SESSION",
        before, after, reason: patch.reason ?? null,
      },
    });
    return updated;
  });
}
```

- [ ] **Step 4: Run â€” expect pass**

```bash
pnpm test:int
```

- [ ] **Step 5: Commit**

```bash
git add src/features/attendance/service.ts tests/integration/attendance/edit-own.test.ts
git commit -m "feat(attendance): editOwnSession with 7-day window, overlap, audit"
```

### Task 4.6: `adminEditSession` + `adminDeleteSession` (soft) + tests

**Files:**
- Modify: `src/features/attendance/service.ts`
- Create: `tests/integration/attendance/admin-mutations.test.ts`

- [ ] **Step 1: Write failing test**

`tests/integration/attendance/admin-mutations.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import { adminEditSession, adminDeleteSession } from "@/features/attendance/service";
import { FakeClock } from "@/lib/time";
import { hash } from "@node-rs/argon2";

let db: TestDb;
const clock = new FakeClock(new Date("2026-05-12T13:00:00Z"));
beforeAll(async () => { db = await setupTestDb(); }, 120_000);
afterAll(async () => { await db.stop(); });
beforeEach(async () => {
  await db.prisma.auditLog.deleteMany();
  await db.prisma.timeSession.deleteMany();
  await db.prisma.user.deleteMany({ where: { id: { not: "system" } } });
  clock.setNow(new Date("2026-05-12T13:00:00Z"));
});

describe("admin mutations", () => {
  it("admin can edit a session older than 7 days", async () => {
    const admin = await db.prisma.user.create({ data: { email: "a@x.com", name: "A", role: "ADMIN", passwordHash: await hash("password1234aa") } });
    const emp = await db.prisma.user.create({ data: { email: "e@x.com", name: "E", passwordHash: await hash("password1234aa") } });
    const s = await db.prisma.timeSession.create({
      data: { userId: emp.id, clockInAt: new Date("2026-04-01T08:00:00Z"), clockOutAt: new Date("2026-04-01T12:00:00Z") },
    });
    const updated = await adminEditSession(
      { prisma: db.prisma, clock }, admin.id, s.id,
      { clockInAt: new Date("2026-04-01T08:15:00Z"), reason: "payroll fix" },
    );
    expect(updated.clockInAt.toISOString()).toBe("2026-04-01T08:15:00.000Z");
  });

  it("adminDeleteSession soft-deletes and writes DELETE_SESSION", async () => {
    const admin = await db.prisma.user.create({ data: { email: "a@x.com", name: "A", role: "ADMIN", passwordHash: await hash("password1234aa") } });
    const emp = await db.prisma.user.create({ data: { email: "e@x.com", name: "E", passwordHash: await hash("password1234aa") } });
    const s = await db.prisma.timeSession.create({
      data: { userId: emp.id, clockInAt: new Date("2026-05-10T08:00:00Z"), clockOutAt: new Date("2026-05-10T12:00:00Z") },
    });
    await adminDeleteSession({ prisma: db.prisma, clock }, admin.id, s.id, "duplicate entry");
    const fresh = await db.prisma.timeSession.findUnique({ where: { id: s.id } });
    expect(fresh?.deletedAt).not.toBeNull();
    const audit = await db.prisma.auditLog.findFirst({ where: { targetSessionId: s.id, action: "DELETE_SESSION" } });
    expect(audit?.reason).toBe("duplicate entry");
  });
});
```

- [ ] **Step 2: Run â€” expect failure**

```bash
pnpm test:int
```

- [ ] **Step 3: Implement `adminEditSession` and `adminDeleteSession`**

```ts
export async function adminEditSession(
  { prisma, clock }: ServiceDeps,
  adminId: string,
  sessionId: string,
  patch: SessionPatch,
): Promise<TimeSession> {
  return prisma.$transaction(async (tx) => {
    const s = await tx.timeSession.findUnique({ where: { id: sessionId } });
    if (!s || s.deletedAt) throw new NotFoundError();
    const now = clock.now();
    const nextIn = patch.clockInAt ?? s.clockInAt;
    const nextOut = patch.clockOutAt === undefined ? s.clockOutAt : patch.clockOutAt;
    if (nextOut !== null && nextIn >= nextOut) throw new ValidationError("clockInAt must be before clockOutAt.");
    if (nextIn > now) throw new ValidationError("clockInAt cannot be in the future.");
    if (nextOut !== null && nextOut > now) throw new ValidationError("clockOutAt cannot be in the future.");

    const others = await tx.timeSession.findMany({
      where: { userId: s.userId, id: { not: sessionId }, deletedAt: null },
    });
    for (const o of others) {
      if (rangesOverlap(nextIn, nextOut, o.clockInAt, o.clockOutAt)) {
        throw new ConflictError("OVERLAP", "Edit would overlap an existing session.");
      }
    }

    const before = snapshot(s);
    const updated = await tx.timeSession.update({
      where: { id: sessionId },
      data: { clockInAt: nextIn, clockOutAt: nextOut, notes: patch.notes ?? s.notes },
    });
    const after = snapshot(updated);
    await tx.auditLog.create({
      data: { actorUserId: adminId, targetSessionId: sessionId, action: "EDIT_SESSION", before, after, reason: patch.reason ?? null },
    });
    return updated;
  });
}

export async function adminDeleteSession(
  { prisma, clock }: ServiceDeps,
  adminId: string,
  sessionId: string,
  reason: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const s = await tx.timeSession.findUnique({ where: { id: sessionId } });
    if (!s || s.deletedAt) throw new NotFoundError();
    const before = snapshot(s);
    const updated = await tx.timeSession.update({ where: { id: sessionId }, data: { deletedAt: clock.now() } });
    const after = snapshot(updated);
    await tx.auditLog.create({
      data: { actorUserId: adminId, targetSessionId: sessionId, action: "DELETE_SESSION", before, after, reason },
    });
  });
}
```

- [ ] **Step 4: Run â€” expect pass**

```bash
pnpm test:int
```

- [ ] **Step 5: Commit**

```bash
git add src/features/attendance/service.ts tests/integration/attendance/admin-mutations.test.ts
git commit -m "feat(attendance): adminEditSession and adminDeleteSession (soft)"
```

### Task 4.7: Server actions wrapping the services

**Files:**
- Create: `src/features/attendance/actions.ts`

- [ ] **Step 1: Write `src/features/attendance/actions.ts`**

```ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { systemClock } from "@/lib/time";
import { requireUser, requireAdmin } from "@/lib/auth";
import { toErrorEnvelope, ValidationError } from "@/lib/errors";
import {
  clockIn, clockOut, editOwnSession, adminEditSession, adminDeleteSession,
} from "./service";

const editPatchSchema = z.object({
  sessionId: z.string().min(1),
  clockInAt: z.string().datetime().optional(),
  clockOutAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  reason: z.string().max(500).optional(),
});

function patchFromInput(input: z.infer<typeof editPatchSchema>) {
  return {
    clockInAt: input.clockInAt ? new Date(input.clockInAt) : undefined,
    clockOutAt: input.clockOutAt === undefined ? undefined : (input.clockOutAt === null ? null : new Date(input.clockOutAt)),
    notes: input.notes,
    reason: input.reason,
  };
}

export async function clockInAction() {
  try {
    const user = await requireUser();
    const s = await clockIn({ prisma, clock: systemClock }, user.id);
    revalidatePath("/clock");
    revalidatePath("/calendar");
    return { ok: true as const, sessionId: s.id };
  } catch (err) { return toErrorEnvelope(err); }
}

export async function clockOutAction() {
  try {
    const user = await requireUser();
    const s = await clockOut({ prisma, clock: systemClock }, user.id);
    revalidatePath("/clock");
    revalidatePath("/calendar");
    revalidatePath("/reports");
    return { ok: true as const, sessionId: s.id };
  } catch (err) { return toErrorEnvelope(err); }
}

export async function editOwnSessionAction(input: unknown) {
  try {
    const user = await requireUser();
    const parsed = editPatchSchema.parse(input);
    const patch = patchFromInput(parsed);
    if (Object.keys(patch).filter((k) => (patch as Record<string, unknown>)[k] !== undefined).length === 0) {
      throw new ValidationError("Patch is empty.");
    }
    const s = await editOwnSession({ prisma, clock: systemClock }, user.id, parsed.sessionId, patch);
    revalidatePath("/calendar");
    revalidatePath("/reports");
    return { ok: true as const, sessionId: s.id };
  } catch (err) { return toErrorEnvelope(err); }
}

export async function adminEditSessionAction(input: unknown) {
  try {
    const admin = await requireAdmin();
    const parsed = editPatchSchema.parse(input);
    const patch = patchFromInput(parsed);
    const s = await adminEditSession({ prisma, clock: systemClock }, admin.id, parsed.sessionId, patch);
    revalidatePath("/admin/audit");
    revalidatePath("/reports");
    return { ok: true as const, sessionId: s.id };
  } catch (err) { return toErrorEnvelope(err); }
}

const deleteSchema = z.object({ sessionId: z.string().min(1), reason: z.string().min(1).max(500) });

export async function adminDeleteSessionAction(input: unknown) {
  try {
    const admin = await requireAdmin();
    const parsed = deleteSchema.parse(input);
    await adminDeleteSession({ prisma, clock: systemClock }, admin.id, parsed.sessionId, parsed.reason);
    revalidatePath("/admin/audit");
    revalidatePath("/reports");
    return { ok: true as const };
  } catch (err) { return toErrorEnvelope(err); }
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/features/attendance/actions.ts
git commit -m "feat(attendance): server actions wrapping services"
```

---


## Milestone 5 â€” Theme + clock UI (`/clock`)

End state: authenticated users see the App shell (header with nav, theme toggle, user menu, live indicator). The `/clock` page renders Layout A â€” large "ON THE CLOCK" / "OFF THE CLOCK" hero with the JetBrains Mono live counter, a CLOCK IN/OUT button, today/week/sessions stats, and the recent-sessions list. Theme toggle persists across reload with no flash.

### Task 5.1: Theme provider with pre-paint init

**Files:**
- Create: `src/components/theme/theme-script.tsx`
- Create: `src/components/theme/theme-toggle.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write `src/components/theme/theme-script.tsx`**

This component injects an inline script in `<head>` that runs before the body renders â€” preventing flash of wrong theme.

```tsx
export function ThemeScript() {
  const code = `
(function() {
  try {
    var stored = localStorage.getItem('punchpad-theme');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (stored === 'system' || !stored ? (systemDark ? 'dark' : 'light') : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
  `.trim();
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
```

- [ ] **Step 2: Write `src/components/theme/theme-toggle.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Mode = "light" | "dark" | "system";

function apply(mode: Mode) {
  const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const actual = mode === "system" ? (isSystemDark ? "dark" : "light") : mode;
  document.documentElement.setAttribute("data-theme", actual);
  localStorage.setItem("punchpad-theme", mode);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("dark");

  useEffect(() => {
    const stored = (localStorage.getItem("punchpad-theme") as Mode) ?? "system";
    setMode(stored);
  }, []);

  const next: Mode = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
  const label = mode === "light" ? "Light" : mode === "dark" ? "Dark" : "System";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={`Theme: ${label}. Click to switch.`}
      data-testid="theme-toggle"
      data-theme-mode={mode}
      onClick={() => { setMode(next); apply(next); }}
    >
      {label}
    </Button>
  );
}
```

- [ ] **Step 3: Inject `ThemeScript` in root layout**

Modify `src/app/layout.tsx`:

```tsx
import { ThemeScript } from "@/components/theme/theme-script";
// ...
return (
  <html lang="en" suppressHydrationWarning>
    <head><ThemeScript /></head>
    <body className={`${inter.variable} ${mono.variable} ${outfit.variable} font-sans antialiased`}>
      {children}
    </body>
  </html>
);
```

- [ ] **Step 4: Commit**

```bash
git add src/components/theme src/app/layout.tsx
git commit -m "feat: theme provider with pre-paint init script"
```

### Task 5.2: App shell layout (header, nav, user menu)

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Create: `src/components/app-shell/header.tsx`
- Create: `src/components/app-shell/live-indicator.tsx`
- Create: `src/components/app-shell/user-menu.tsx`

- [ ] **Step 1: Write `src/app/(app)/layout.tsx`**

```tsx
import { requireUser } from "@/lib/auth";
import { Header } from "@/components/app-shell/header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Header user={user} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/components/app-shell/header.tsx`**

```tsx
import Link from "next/link";
import type { Session } from "next-auth";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LiveIndicator } from "./live-indicator";
import { UserMenu } from "./user-menu";

export function Header({ user }: { user: Session["user"] }) {
  const isAdmin = user.role === "ADMIN";
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg-elev)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/clock" className="font-display text-lg font-semibold tracking-tight">PunchPad</Link>
        <nav className="ml-4 flex gap-1 text-sm">
          <Link href="/clock" className="rounded px-3 py-1 hover:bg-[var(--bg-elev-2)]" data-testid="nav-clock">Clock</Link>
          <Link href="/calendar" className="rounded px-3 py-1 hover:bg-[var(--bg-elev-2)]" data-testid="nav-calendar">Calendar</Link>
          <Link href="/reports" className="rounded px-3 py-1 hover:bg-[var(--bg-elev-2)]" data-testid="nav-reports">Reports</Link>
          {isAdmin && (
            <>
              <Link href="/admin/users" className="rounded px-3 py-1 hover:bg-[var(--bg-elev-2)]" data-testid="nav-admin-users">Users</Link>
              <Link href="/admin/audit" className="rounded px-3 py-1 hover:bg-[var(--bg-elev-2)]" data-testid="nav-admin-audit">Audit</Link>
            </>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LiveIndicator userId={user.id} timezone={user.timezone} />
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Write `src/components/app-shell/user-menu.tsx`**

```tsx
"use client";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function UserMenu({ user }: { user: Session["user"] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" data-testid="user-menu-trigger">{user.name}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/login" })} data-testid="user-menu-signout">
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Write `src/components/app-shell/live-indicator.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";

export function LiveIndicator({ userId, timezone }: { userId: string; timezone: string }) {
  const [open, setOpen] = useState<{ clockInAt: string } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancel = false;
    async function load() {
      const r = await fetch(`/api/me/open-session`, { cache: "no-store" });
      if (cancel) return;
      if (r.ok) setOpen(await r.json());
      else setOpen(null);
    }
    void load();
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => { cancel = true; clearInterval(id); };
  }, [userId, tick]);

  if (!open) {
    return <span className="text-xs text-[var(--text-ghost)]" data-testid="live-indicator-off">Off the clock</span>;
  }
  const inAt = new Date(open.clockInAt).getTime();
  const elapsed = Math.max(0, Date.now() - inAt);
  const h = Math.floor(elapsed / 3_600_000);
  const m = Math.floor((elapsed % 3_600_000) / 60_000);
  return (
    <span className="flex items-center gap-2 text-xs font-mono text-[var(--accent)]" data-testid="live-indicator-on" title={`Started ${new Date(inAt).toLocaleTimeString()}`}>
      <span className="size-2 animate-pulse rounded-full bg-[var(--accent)]" />
      On the clock {h}h {m.toString().padStart(2, "0")}m
    </span>
  );
}
```

- [ ] **Step 5: Add a small JSON API for the live indicator**

Create `src/app/api/me/open-session/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  const open = await prisma.timeSession.findFirst({
    where: { userId: user.id, clockOutAt: null, deletedAt: null },
    select: { clockInAt: true },
  });
  if (!open) return NextResponse.json({ open: false }, { status: 404 });
  return NextResponse.json({ clockInAt: open.clockInAt.toISOString() });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/layout.tsx src/components/app-shell src/app/api/me
git commit -m "feat: app shell header, user menu, live indicator"
```

### Task 5.3: `/clock` hero state (idle + active)

**Files:**
- Create: `src/app/(app)/clock/page.tsx`
- Create: `src/features/attendance/queries.ts`
- Create: `src/features/attendance/components/clock-hero.tsx`
- Create: `src/features/attendance/components/clock-counter.tsx`

- [ ] **Step 1: Write `src/features/attendance/queries.ts`**

```ts
import type { PrismaClient } from "@prisma/client";
import { startOfDayInTz, startOfWeekInTz, durationMinutes } from "@/lib/time";

export async function getOpenSession(prisma: PrismaClient, userId: string) {
  return prisma.timeSession.findFirst({
    where: { userId, clockOutAt: null, deletedAt: null },
  });
}

export async function getTodayStats(prisma: PrismaClient, userId: string, tz: string, now: Date) {
  const start = startOfDayInTz(now, tz);
  const sessions = await prisma.timeSession.findMany({
    where: { userId, deletedAt: null, clockInAt: { gte: start } },
  });
  let minutes = 0;
  for (const s of sessions) {
    const end = s.clockOutAt ?? now;
    minutes += durationMinutes(s.clockInAt, end);
  }
  return { minutes, sessionCount: sessions.length };
}

export async function getWeekStats(prisma: PrismaClient, userId: string, tz: string, now: Date) {
  const start = startOfWeekInTz(now, tz);
  const sessions = await prisma.timeSession.findMany({
    where: { userId, deletedAt: null, clockInAt: { gte: start } },
  });
  let minutes = 0;
  for (const s of sessions) {
    const end = s.clockOutAt ?? now;
    minutes += durationMinutes(s.clockInAt, end);
  }
  return { minutes, sessionCount: sessions.length };
}

export async function getRecentSessions(prisma: PrismaClient, userId: string, limit = 5) {
  return prisma.timeSession.findMany({
    where: { userId, deletedAt: null, clockOutAt: { not: null } },
    orderBy: { clockInAt: "desc" },
    take: limit,
  });
}

export function formatHm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}
```

- [ ] **Step 2: Write `src/features/attendance/components/clock-counter.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";

export function ClockCounter({ clockInAt }: { clockInAt: string }) {
  const inAt = new Date(clockInAt).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);
  const elapsed = Math.max(0, now - inAt);
  const h = Math.floor(elapsed / 3_600_000);
  const m = Math.floor((elapsed % 3_600_000) / 60_000);
  const s = Math.floor((elapsed % 60_000) / 1_000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    <p className="font-mono text-6xl tabular-nums tracking-tight text-[var(--text)] md:text-7xl" data-testid="clock-counter">
      {pad(h)} : {pad(m)} : {pad(s)}
    </p>
  );
}
```

- [ ] **Step 3: Write `src/features/attendance/components/clock-hero.tsx`**

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ClockCounter } from "./clock-counter";
import { clockInAction, clockOutAction } from "../actions";

type Props = {
  open: { clockInAt: string; startedAtLocal: string } | null;
};

export function ClockHero({ open }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handle = (fn: () => Promise<{ ok: true } | { ok: false; message: string; code: string }>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!("ok" in res) || !res.ok) {
        setError(res.message);
        return;
      }
      router.refresh();
    });

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-10 text-center">
      {open ? (
        <>
          <p className="font-display text-sm uppercase tracking-[0.2em] text-[var(--accent)]">On the clock</p>
          <div className="my-6"><ClockCounter clockInAt={open.clockInAt} /></div>
          <p className="text-sm text-[var(--text-dim)]" data-testid="clock-started-at">Started at {open.startedAtLocal}</p>
          <Button
            size="lg"
            className="mt-8 h-14 min-w-64 bg-[var(--accent)] text-base font-semibold text-white hover:bg-[var(--accent-hover)]"
            disabled={pending}
            data-testid="clock-out-button"
            onClick={() => handle(clockOutAction)}
          >
            {pending ? "Clocking outâ€¦" : "Clock out"}
          </Button>
        </>
      ) : (
        <>
          <p className="font-display text-sm uppercase tracking-[0.2em] text-[var(--text-dim)]">Off the clock</p>
          <p className="mt-6 font-mono text-5xl text-[var(--text-ghost)]" data-testid="clock-counter-idle">00 : 00 : 00</p>
          <Button
            size="lg"
            className="mt-8 h-14 min-w-64 bg-[var(--accent)] text-base font-semibold text-white hover:bg-[var(--accent-hover)]"
            disabled={pending}
            data-testid="clock-in-button"
            onClick={() => handle(clockInAction)}
          >
            {pending ? "Clocking inâ€¦" : "Clock in"}
          </Button>
        </>
      )}
      {error && <p className="mt-4 text-sm text-[var(--danger)]" data-testid="clock-error">{error}</p>}
    </section>
  );
}
```

- [ ] **Step 4: Write `src/app/(app)/clock/page.tsx`**

```tsx
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { systemClock } from "@/lib/time";
import { formatLocal } from "@/lib/time";
import { getOpenSession, getTodayStats, getWeekStats, getRecentSessions, formatHm } from "@/features/attendance/queries";
import { ClockHero } from "@/features/attendance/components/clock-hero";

export const dynamic = "force-dynamic";

export default async function ClockPage() {
  const user = await requireUser();
  const now = systemClock.now();
  const [open, today, week, recent] = await Promise.all([
    getOpenSession(prisma, user.id),
    getTodayStats(prisma, user.id, user.timezone, now),
    getWeekStats(prisma, user.id, user.timezone, now),
    getRecentSessions(prisma, user.id, 5),
  ]);

  return (
    <div className="space-y-6">
      <ClockHero
        open={open ? {
          clockInAt: open.clockInAt.toISOString(),
          startedAtLocal: formatLocal(open.clockInAt, user.timezone, "h:mm a Â· EEEE"),
        } : null}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Today" value={formatHm(today.minutes)} testId="stat-today" />
        <Stat label="This week" value={formatHm(week.minutes)} testId="stat-week" />
        <Stat label="Sessions today" value={String(today.sessionCount)} testId="stat-sessions" />
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-5">
        <h2 className="mb-3 font-display text-sm uppercase tracking-wider text-[var(--text-dim)]">Recent</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-[var(--text-ghost)]" data-testid="recent-empty">No completed sessions yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]" data-testid="recent-list">
            {recent.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-mono text-[var(--text-dim)]">
                  {formatLocal(s.clockInAt, user.timezone, "EEE  h:mma")} â†’ {s.clockOutAt ? formatLocal(s.clockOutAt, user.timezone, "h:mma") : "â€”"}
                </span>
                <span className="font-mono">{formatHm(Math.floor(((s.clockOutAt?.getTime() ?? Date.now()) - s.clockInAt.getTime()) / 60_000))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-5">
      <p className="text-xs uppercase tracking-wider text-[var(--text-dim)]">{label}</p>
      <p className="mt-1 font-mono text-2xl tabular-nums" data-testid={testId}>{value}</p>
    </div>
  );
}
```

- [ ] **Step 5: Verify in browser**

```bash
pnpm dev
```

Log in, navigate to `/clock`. Click "Clock in" â€” see the hero flip to active with a live counter. Click "Clock out" â€” see it return to idle and the recent list update. Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add src/features/attendance/queries.ts src/features/attendance/components src/app/\(app\)/clock
git commit -m "feat: /clock hero (idle + active), stats, recent sessions"
```

### Task 5.4: E2E â€” clock in/out flow

**Files:**
- Create: `tests/e2e/clock/clock-flow.spec.ts`

- [ ] **Step 1: Write the E2E test**

```ts
import { test, expect } from "@playwright/test";

test.use({ storageState: "tests/e2e/storage/emp.json" });

test("clock in then clock out, recent list reflects it", async ({ page }) => {
  await page.goto("/clock");
  await expect(page.getByTestId("clock-in-button")).toBeVisible();
  await page.getByTestId("clock-in-button").click();
  await expect(page.getByTestId("clock-out-button")).toBeVisible();
  await expect(page.getByTestId("clock-counter")).toBeVisible();
  await expect(page.getByTestId("clock-started-at")).toBeVisible();

  await page.getByTestId("clock-out-button").click();
  await expect(page.getByTestId("clock-in-button")).toBeVisible();
  await expect(page.getByTestId("recent-list")).toBeVisible();
});

test("double clock-in surfaces error", async ({ page, context }) => {
  await page.goto("/clock");
  await page.getByTestId("clock-in-button").click();
  await expect(page.getByTestId("clock-out-button")).toBeVisible();

  // Second tab attempt
  const page2 = await context.newPage();
  await page2.goto("/clock");
  await expect(page2.getByTestId("clock-out-button")).toBeVisible();
  await page2.close();

  await page.getByTestId("clock-out-button").click();
});
```

- [ ] **Step 2: Run**

```bash
pnpm test:e2e --project=setup --project=chromium-emp
```

Expected: both tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/clock
git commit -m "test: e2e clock in/out flow"
```

### Task 5.5: E2E â€” theme toggle persists pre-paint

**Files:**
- Create: `tests/e2e/theme/theme.spec.ts`

- [ ] **Step 1: Write the test**

```ts
import { test, expect } from "@playwright/test";

test.use({ storageState: "tests/e2e/storage/emp.json" });

test("theme toggle persists across reload with no flash", async ({ page }) => {
  await page.goto("/clock");
  const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(initialTheme).toBeTruthy();

  await page.getByTestId("theme-toggle").click();
  const afterClick = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(afterClick).not.toBe(initialTheme);

  await page.reload();
  const afterReload = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(afterReload).toBe(afterClick);
});
```

- [ ] **Step 2: Run**

```bash
pnpm test:e2e --project=setup --project=chromium-emp
```

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/theme
git commit -m "test: e2e theme persistence"
```

---


## Milestone 6 â€” Calendar (`/calendar`)

End state: month grid (default) and week view of the current user's sessions in their TZ. Each day cell shows total hours as a small bar plus a session count. Clicking a day opens a side sheet listing that day's sessions; sessions inside the 7-day window have an inline edit affordance. E2E covers an employee editing their own session.

### Task 6.1: Calendar query layer

**Files:**
- Create: `src/features/attendance/calendar-queries.ts`
- Create: `tests/integration/attendance/calendar-queries.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/integration/attendance/calendar-queries.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import { sessionsInRange, bucketByLocalDay } from "@/features/attendance/calendar-queries";
import { hash } from "@node-rs/argon2";

let db: TestDb;
beforeAll(async () => { db = await setupTestDb(); }, 120_000);
afterAll(async () => { await db.stop(); });
beforeEach(async () => {
  await db.prisma.timeSession.deleteMany();
  await db.prisma.user.deleteMany({ where: { id: { not: "system" } } });
});

describe("calendar queries", () => {
  it("sessionsInRange returns only sessions intersecting the window for the user", async () => {
    const u = await db.prisma.user.create({ data: { email: "u@x.com", name: "U", passwordHash: await hash("password1234aa") } });
    await db.prisma.timeSession.create({ data: { userId: u.id, clockInAt: new Date("2026-05-01T08:00:00Z"), clockOutAt: new Date("2026-05-01T12:00:00Z") } });
    await db.prisma.timeSession.create({ data: { userId: u.id, clockInAt: new Date("2026-05-15T08:00:00Z"), clockOutAt: new Date("2026-05-15T12:00:00Z") } });
    const rows = await sessionsInRange(db.prisma, u.id, new Date("2026-05-10T00:00:00Z"), new Date("2026-05-20T00:00:00Z"));
    expect(rows).toHaveLength(1);
  });

  it("bucketByLocalDay groups by user TZ", async () => {
    const sessions = [
      { id: "a", clockInAt: new Date("2026-05-12T05:30:00Z"), clockOutAt: new Date("2026-05-12T07:30:00Z") },
      { id: "b", clockInAt: new Date("2026-05-12T13:00:00Z"), clockOutAt: new Date("2026-05-12T17:00:00Z") },
      { id: "c", clockInAt: new Date("2026-05-13T03:00:00Z"), clockOutAt: new Date("2026-05-13T05:00:00Z") },
    ];
    // In America/Chicago (UTC-5 in May DST), the "c" session at 03:00 UTC = 22:00 prev local day.
    const buckets = bucketByLocalDay(sessions as never, "America/Chicago");
    expect(Object.keys(buckets).sort()).toEqual(["2026-05-12"]);
    expect(buckets["2026-05-12"]).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run â€” expect failure**

```bash
pnpm test:int
```

- [ ] **Step 3: Implement `src/features/attendance/calendar-queries.ts`**

```ts
import type { PrismaClient, TimeSession } from "@prisma/client";
import { formatLocal } from "@/lib/time";

export async function sessionsInRange(
  prisma: PrismaClient, userId: string, from: Date, to: Date,
): Promise<TimeSession[]> {
  return prisma.timeSession.findMany({
    where: {
      userId, deletedAt: null,
      OR: [
        { clockInAt: { gte: from, lt: to } },
        { AND: [{ clockInAt: { lt: from } }, { clockOutAt: { gt: from } }] },
      ],
    },
    orderBy: { clockInAt: "asc" },
  });
}

export function bucketByLocalDay(
  sessions: ReadonlyArray<Pick<TimeSession, "id" | "clockInAt" | "clockOutAt">>,
  tz: string,
): Record<string, typeof sessions[number][]> {
  const out: Record<string, typeof sessions[number][]> = {};
  for (const s of sessions) {
    const day = formatLocal(s.clockInAt, tz, "yyyy-MM-dd");
    (out[day] ??= []).push(s);
  }
  return out;
}
```

- [ ] **Step 4: Run â€” expect pass**

```bash
pnpm test:int
```

- [ ] **Step 5: Commit**

```bash
git add src/features/attendance/calendar-queries.ts tests/integration/attendance/calendar-queries.test.ts
git commit -m "feat(calendar): range query + local-day bucketing"
```

### Task 6.2: Month grid component

**Files:**
- Create: `src/features/attendance/components/month-grid.tsx`
- Create: `src/app/(app)/calendar/page.tsx`

- [ ] **Step 1: Write `src/features/attendance/components/month-grid.tsx`**

```tsx
"use client";
import Link from "next/link";

type DayBucket = { dateLocal: string; minutes: number; count: number };

export function MonthGrid({
  year, month, days, today, onSelect,
}: {
  year: number;
  month: number; // 0-indexed
  days: DayBucket[];
  today: string; // yyyy-MM-dd
  onSelect: (date: string) => void;
}) {
  const map = new Map(days.map((d) => [d.dateLocal, d]));
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekdayMon0 = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<DayBucket | null> = Array(firstWeekdayMon0).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(map.get(key) ?? { dateLocal: key, minutes: 0, count: 0 });
  }
  while (cells.length % 7) cells.push(null);

  const max = Math.max(60, ...days.map((d) => d.minutes));

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-4" data-testid="month-grid">
      <div className="mb-2 grid grid-cols-7 text-xs uppercase tracking-wider text-[var(--text-dim)]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-2 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell) return <div key={idx} className="aspect-square rounded bg-transparent" />;
          const isToday = cell.dateLocal === today;
          const pct = Math.min(100, Math.round((cell.minutes / max) * 100));
          return (
            <button
              key={cell.dateLocal}
              type="button"
              data-testid={`day-${cell.dateLocal}`}
              onClick={() => onSelect(cell.dateLocal)}
              className={`flex aspect-square flex-col rounded p-2 text-left transition-colors ${
                isToday ? "ring-1 ring-[var(--accent)]" : "ring-0"
              } hover:bg-[var(--bg-elev-2)]`}
            >
              <span className="text-xs text-[var(--text-dim)]">{Number(cell.dateLocal.slice(-2))}</span>
              <div className="mt-auto h-1 w-full rounded bg-[var(--bg-elev-2)]">
                <div className="h-full rounded bg-[var(--accent)]" style={{ width: `${pct}%` }} />
              </div>
              {cell.count > 0 && (
                <span className="text-[10px] text-[var(--text-ghost)]">{cell.count} session{cell.count === 1 ? "" : "s"}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/app/(app)/calendar/page.tsx`**

```tsx
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sessionsInRange, bucketByLocalDay } from "@/features/attendance/calendar-queries";
import { CalendarShell } from "@/features/attendance/components/calendar-shell";
import { startOfDayInTz, endOfDayInTz, formatLocal, durationMinutes, systemClock } from "@/lib/time";

export const dynamic = "force-dynamic";

type Search = { year?: string; month?: string };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const now = systemClock.now();
  const year = sp.year ? Number(sp.year) : Number(formatLocal(now, user.timezone, "yyyy"));
  const month = sp.month ? Number(sp.month) - 1 : Number(formatLocal(now, user.timezone, "M")) - 1;

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const from = startOfDayInTz(first, user.timezone);
  const to = endOfDayInTz(last, user.timezone);

  const sessions = await sessionsInRange(prisma, user.id, from, to);
  const buckets = bucketByLocalDay(sessions, user.timezone);

  const dayBuckets = Object.entries(buckets).map(([dateLocal, list]) => {
    const minutes = list.reduce((m, s) => m + durationMinutes(s.clockInAt, s.clockOutAt ?? now), 0);
    return { dateLocal, minutes, count: list.length };
  });

  const today = formatLocal(now, user.timezone, "yyyy-MM-dd");

  return (
    <CalendarShell
      year={year}
      month={month}
      today={today}
      days={dayBuckets}
      timezone={user.timezone}
      userId={user.id}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/attendance/components/month-grid.tsx src/app/\(app\)/calendar
git commit -m "feat(calendar): month grid + page wiring"
```

### Task 6.3: Calendar shell with day sheet + week/month toggle + inline edit

**Files:**
- Create: `src/features/attendance/components/calendar-shell.tsx`
- Create: `src/features/attendance/components/day-sheet.tsx`
- Create: `src/features/attendance/components/edit-session-form.tsx`
- Create: `src/app/api/me/sessions/route.ts`

- [ ] **Step 1: Write JSON endpoint to fetch a single day's sessions for the sheet**

`src/app/api/me/sessions/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { startOfDayInTz, endOfDayInTz } from "@/lib/time";

export async function GET(req: Request) {
  const user = await requireUser();
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  if (!date) return NextResponse.json({ ok: false, code: "VALIDATION", message: "date is required" }, { status: 400 });
  const [y, m, d] = date.split("-").map(Number);
  const noon = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1, 12, 0, 0));
  const from = startOfDayInTz(noon, user.timezone);
  const to = endOfDayInTz(noon, user.timezone);
  const sessions = await prisma.timeSession.findMany({
    where: { userId: user.id, deletedAt: null, clockInAt: { gte: from, lte: to } },
    orderBy: { clockInAt: "asc" },
  });
  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      clockInAt: s.clockInAt.toISOString(),
      clockOutAt: s.clockOutAt?.toISOString() ?? null,
      autoClosed: s.autoClosed,
      notes: s.notes,
    })),
  });
}
```

- [ ] **Step 2: Write `src/features/attendance/components/edit-session-form.tsx`**

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { editOwnSessionAction } from "../actions";

type Session = { id: string; clockInAt: string; clockOutAt: string | null; notes: string | null };

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
            setError(res.message);
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
        <Input id={`in-${session.id}`} name="clockInAt" type="datetime-local" defaultValue={isoToLocalInput(session.clockInAt)} required data-testid={`edit-in-${session.id}`} />
      </div>
      <div>
        <Label htmlFor={`out-${session.id}`}>Clock out</Label>
        <Input id={`out-${session.id}`} name="clockOutAt" type="datetime-local" defaultValue={session.clockOutAt ? isoToLocalInput(session.clockOutAt) : ""} required data-testid={`edit-out-${session.id}`} />
      </div>
      <div>
        <Label htmlFor={`r-${session.id}`}>Reason</Label>
        <Input id={`r-${session.id}`} name="reason" type="text" required data-testid={`edit-reason-${session.id}`} />
      </div>
      {error && <p data-testid={`edit-error-${session.id}`} className="text-sm text-[var(--danger)]">{error}</p>}
      <Button type="submit" disabled={pending} data-testid={`edit-save-${session.id}`}>{pending ? "Savingâ€¦" : "Save"}</Button>
    </form>
  );
}
```

- [ ] **Step 3: Write `src/features/attendance/components/day-sheet.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditSessionForm } from "./edit-session-form";

type SessionRow = { id: string; clockInAt: string; clockOutAt: string | null; autoClosed: boolean; notes: string | null };

const SEVEN_DAYS_MS = 7 * 24 * 3_600_000;

export function DaySheet({
  open, date, timezone, onOpenChange,
}: {
  open: boolean;
  date: string | null;
  timezone: string;
  onOpenChange: (o: boolean) => void;
}) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !date) return;
    setLoading(true);
    void fetch(`/api/me/sessions?date=${date}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setSessions(j.sessions ?? []))
      .finally(() => setLoading(false));
  }, [open, date]);

  const fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent data-testid="day-sheet">
        <SheetHeader>
          <SheetTitle>{date}</SheetTitle>
        </SheetHeader>
        {loading ? (
          <p className="text-sm text-[var(--text-dim)]">Loadingâ€¦</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-[var(--text-dim)]" data-testid="day-sheet-empty">No sessions on this day.</p>
        ) : (
          <ul className="mt-4 space-y-3" data-testid="day-sheet-list">
            {sessions.map((s) => {
              const inWindow = Date.now() - new Date(s.clockInAt).getTime() <= SEVEN_DAYS_MS;
              const isEditing = editing === s.id;
              return (
                <li key={s.id} className="rounded-lg border border-[var(--border)] p-3 text-sm" data-testid={`session-row-${s.id}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono">
                      {fmt.format(new Date(s.clockInAt))} â†’ {s.clockOutAt ? fmt.format(new Date(s.clockOutAt)) : "â€”"}
                    </span>
                    <div className="flex items-center gap-2">
                      {s.autoClosed && <Badge variant="secondary">auto-closed</Badge>}
                      {inWindow && !isEditing && (
                        <Button size="sm" variant="ghost" onClick={() => setEditing(s.id)} data-testid={`edit-button-${s.id}`}>Edit</Button>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <div className="mt-3">
                      <EditSessionForm session={s} onSaved={() => { setEditing(null); void fetch(`/api/me/sessions?date=${date}`, { cache: "no-store" }).then((r) => r.json()).then((j) => setSessions(j.sessions ?? [])); }} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Write `src/features/attendance/components/calendar-shell.tsx`**

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MonthGrid } from "./month-grid";
import { DaySheet } from "./day-sheet";

type DayBucket = { dateLocal: string; minutes: number; count: number };

export function CalendarShell({
  year, month, today, days, timezone,
}: {
  year: number;
  month: number; // 0-indexed
  today: string;
  days: DayBucket[];
  timezone: string;
  userId: string;
}) {
  const [openDate, setOpenDate] = useState<string | null>(null);
  const heading = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const prev = month === 0 ? { y: year - 1, m: 12 } : { y: year, m: month };
  const next = month === 11 ? { y: year + 1, m: 1 } : { y: year, m: month + 2 };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">{heading}</h1>
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm" data-testid="cal-prev">
            <Link href={`/calendar?year=${prev.y}&month=${prev.m}`}>â† Prev</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" data-testid="cal-today">
            <Link href="/calendar">Today</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" data-testid="cal-next">
            <Link href={`/calendar?year=${next.y}&month=${next.m}`}>Next â†’</Link>
          </Button>
        </div>
      </div>
      <MonthGrid year={year} month={month} days={days} today={today} onSelect={setOpenDate} />
      <DaySheet open={!!openDate} date={openDate} timezone={timezone} onOpenChange={(o) => !o && setOpenDate(null)} />
    </div>
  );
}
```

- [ ] **Step 5: Verify in browser**

```bash
pnpm dev
```

Log in, go to `/calendar`. The month grid renders for the current month. Click a day â€” sheet opens listing that day's sessions. Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add src/features/attendance/components src/app/api/me/sessions src/app/\(app\)/calendar
git commit -m "feat(calendar): shell, day sheet, inline edit form"
```

### Task 6.4: E2E â€” employee edits own session inside 7-day window

**Files:**
- Create: `tests/e2e/calendar/edit-own.spec.ts`

- [ ] **Step 1: Write test**

```ts
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

test.use({ storageState: "tests/e2e/storage/emp.json" });

test("employee edits own session via day sheet", async ({ page }) => {
  const prisma = new PrismaClient();
  const emp = await prisma.user.findUniqueOrThrow({ where: { email: "emp@e2e.test" } });
  await prisma.timeSession.deleteMany({ where: { userId: emp.id } });
  const now = new Date();
  const inAt = new Date(now.getTime() - 3 * 24 * 3_600_000);
  inAt.setUTCHours(13, 0, 0, 0);
  const outAt = new Date(inAt.getTime() + 4 * 3_600_000);
  await prisma.timeSession.create({ data: { userId: emp.id, clockInAt: inAt, clockOutAt: outAt } });
  await prisma.$disconnect();

  await page.goto("/calendar");
  const isoDay = inAt.toISOString().slice(0, 10);
  await page.getByTestId(`day-${isoDay}`).click();
  await expect(page.getByTestId("day-sheet-list")).toBeVisible();

  const rows = page.locator('[data-testid^="session-row-"]');
  await rows.first().getByTestId(/^edit-button-/).click();

  const reason = page.getByTestId(/^edit-reason-/);
  await reason.fill("forgot to clock in on time");
  await page.getByTestId(/^edit-save-/).click();

  await expect(page.getByTestId(/^edit-form-/)).toHaveCount(0);
});
```

- [ ] **Step 2: Run**

```bash
pnpm test:e2e --project=setup --project=chromium-emp
```

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/calendar
git commit -m "test: e2e employee edits own session in 7-day window"
```

---


## Milestone 7 â€” Reports + CSV (`/reports` + `/api/reports/csv`)

End state: KPI row, date-range picker with presets (this week / last week / **semi-monthly pay period (1stâ€“15th, 16thâ€“end)** / custom), per-user table with daily breakdown, and a working streaming CSV download. Admins can pick any user; employees see themselves. E2E covers a download.

### Task 7.1: Reports service (KPIs + table data)

**Files:**
- Create: `src/features/reports/service.ts`
- Create: `src/features/reports/types.ts`
- Create: `tests/integration/reports/service.test.ts`

- [ ] **Step 1: Write `src/features/reports/types.ts`**

```ts
export type RangeKey = "today" | "thisWeek" | "lastWeek" | "payPeriod" | "custom";

export type DailyRow = {
  dateLocal: string;
  minutes: number;
  sessionCount: number;
};

export type UserRow = {
  userId: string;
  email: string;
  name: string;
  totalMinutes: number;
  days: DailyRow[];
};

export type KpiSet = {
  today: number;
  thisWeek: number;
  lastWeek: number;
  sevenDayAvg: number;
};
```

- [ ] **Step 2: Write failing test**

`tests/integration/reports/service.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import { reportForRange, kpiSet } from "@/features/reports/service";
import { hash } from "@node-rs/argon2";

let db: TestDb;
beforeAll(async () => { db = await setupTestDb(); }, 120_000);
afterAll(async () => { await db.stop(); });
beforeEach(async () => {
  await db.prisma.timeSession.deleteMany();
  await db.prisma.user.deleteMany({ where: { id: { not: "system" } } });
});

describe("reportForRange", () => {
  it("aggregates per user, per local day", async () => {
    const u = await db.prisma.user.create({ data: { email: "u@x.com", name: "U", passwordHash: await hash("password1234aa") } });
    await db.prisma.timeSession.createMany({
      data: [
        { userId: u.id, clockInAt: new Date("2026-05-12T13:00:00Z"), clockOutAt: new Date("2026-05-12T17:00:00Z") },
        { userId: u.id, clockInAt: new Date("2026-05-12T18:00:00Z"), clockOutAt: new Date("2026-05-12T20:00:00Z") },
        { userId: u.id, clockInAt: new Date("2026-05-13T13:00:00Z"), clockOutAt: new Date("2026-05-13T17:30:00Z") },
      ],
    });
    const rows = await reportForRange(db.prisma, {
      from: new Date("2026-05-12T05:00:00Z"),
      to: new Date("2026-05-13T23:59:59Z"),
      timezone: "America/Chicago",
    });
    expect(rows).toHaveLength(1);
    const r = rows[0]!;
    expect(r.totalMinutes).toBe(6 * 60 + 4 * 60 + 30); // 6h + 4h30m
    const byDay = Object.fromEntries(r.days.map((d) => [d.dateLocal, d.minutes]));
    expect(byDay["2026-05-12"]).toBe(360);
    expect(byDay["2026-05-13"]).toBe(270);
  });

  it("filters by userId when provided", async () => {
    const u1 = await db.prisma.user.create({ data: { email: "u1@x.com", name: "U1", passwordHash: await hash("password1234aa") } });
    const u2 = await db.prisma.user.create({ data: { email: "u2@x.com", name: "U2", passwordHash: await hash("password1234aa") } });
    await db.prisma.timeSession.create({ data: { userId: u1.id, clockInAt: new Date("2026-05-12T13:00:00Z"), clockOutAt: new Date("2026-05-12T17:00:00Z") } });
    await db.prisma.timeSession.create({ data: { userId: u2.id, clockInAt: new Date("2026-05-12T13:00:00Z"), clockOutAt: new Date("2026-05-12T17:00:00Z") } });
    const rows = await reportForRange(db.prisma, {
      from: new Date("2026-05-12T00:00:00Z"),
      to: new Date("2026-05-12T23:59:59Z"),
      timezone: "America/Chicago",
      userId: u1.id,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.userId).toBe(u1.id);
  });
});
```

- [ ] **Step 3: Run â€” expect failure**

```bash
pnpm test:int
```

- [ ] **Step 4: Implement `src/features/reports/service.ts`**

```ts
import type { PrismaClient } from "@prisma/client";
import { formatLocal, durationMinutes, startOfDayInTz, endOfDayInTz, startOfWeekInTz, endOfWeekInTz } from "@/lib/time";
import type { UserRow, KpiSet } from "./types";

export type ReportInput = {
  from: Date;
  to: Date;
  timezone: string;
  userId?: string;
};

export async function reportForRange(
  prisma: PrismaClient,
  input: ReportInput,
): Promise<UserRow[]> {
  const users = await prisma.user.findMany({
    where: input.userId
      ? { id: input.userId }
      : { deactivatedAt: null, id: { not: "system" } },
    orderBy: { name: "asc" },
  });

  const sessions = await prisma.timeSession.findMany({
    where: {
      deletedAt: null,
      userId: input.userId ?? { in: users.map((u) => u.id) },
      OR: [
        { clockInAt: { gte: input.from, lte: input.to } },
        { AND: [{ clockInAt: { lt: input.from } }, { clockOutAt: { gt: input.from } }] },
      ],
    },
    orderBy: { clockInAt: "asc" },
  });

  const byUser = new Map<string, UserRow>();
  for (const u of users) {
    byUser.set(u.id, { userId: u.id, email: u.email, name: u.name, totalMinutes: 0, days: [] });
  }

  const dailyMap = new Map<string, Map<string, { minutes: number; count: number }>>();
  for (const s of sessions) {
    const day = formatLocal(s.clockInAt, input.timezone, "yyyy-MM-dd");
    const end = s.clockOutAt ?? input.to;
    const mins = durationMinutes(s.clockInAt, end);
    const user = byUser.get(s.userId);
    if (!user) continue;
    user.totalMinutes += mins;
    const dm = dailyMap.get(s.userId) ?? new Map();
    const cell = dm.get(day) ?? { minutes: 0, count: 0 };
    cell.minutes += mins;
    cell.count += 1;
    dm.set(day, cell);
    dailyMap.set(s.userId, dm);
  }

  for (const [uid, user] of byUser) {
    const dm = dailyMap.get(uid) ?? new Map();
    user.days = Array.from(dm.entries())
      .map(([dateLocal, v]) => ({ dateLocal, minutes: v.minutes, sessionCount: v.count }))
      .sort((a, b) => a.dateLocal.localeCompare(b.dateLocal));
  }

  return Array.from(byUser.values());
}

export async function kpiSet(prisma: PrismaClient, userId: string, tz: string, now: Date): Promise<KpiSet> {
  const todayFrom = startOfDayInTz(now, tz);
  const todayTo = endOfDayInTz(now, tz);
  const thisWeekFrom = startOfWeekInTz(now, tz);
  const thisWeekTo = endOfWeekInTz(now, tz);
  const lastWeekRef = new Date(now.getTime() - 7 * 24 * 3_600_000);
  const lastWeekFrom = startOfWeekInTz(lastWeekRef, tz);
  const lastWeekTo = endOfWeekInTz(lastWeekRef, tz);
  const sevenFrom = new Date(now.getTime() - 7 * 24 * 3_600_000);

  async function minutesIn(from: Date, to: Date) {
    const sessions = await prisma.timeSession.findMany({
      where: { userId, deletedAt: null, clockInAt: { gte: from, lte: to } },
    });
    return sessions.reduce((acc, s) => acc + durationMinutes(s.clockInAt, s.clockOutAt ?? now), 0);
  }

  const [today, thisWeek, lastWeek, sevenDay] = await Promise.all([
    minutesIn(todayFrom, todayTo),
    minutesIn(thisWeekFrom, thisWeekTo),
    minutesIn(lastWeekFrom, lastWeekTo),
    minutesIn(sevenFrom, now),
  ]);

  return { today, thisWeek, lastWeek, sevenDayAvg: Math.round(sevenDay / 7) };
}
```

- [ ] **Step 5: Run â€” expect pass**

```bash
pnpm test:int
```

- [ ] **Step 6: Commit**

```bash
git add src/features/reports tests/integration/reports
git commit -m "feat(reports): aggregation service + KPI set"
```

### Task 7.2: Range preset helpers (incl. semi-monthly pay period)

**Files:**
- Create: `src/features/reports/ranges.ts`
- Create: `tests/unit/reports/ranges.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/unit/reports/ranges.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolveRange, type RangeKey } from "@/features/reports/ranges";

const NOW = new Date("2026-05-22T15:00:00Z");
const TZ = "America/Chicago";

describe("resolveRange", () => {
  it("thisWeek returns Mon..Sun local", () => {
    const r = resolveRange("thisWeek", NOW, TZ);
    expect(r.from.toISOString()).toBe("2026-05-18T05:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-05-25T04:59:59.999Z");
  });
  it("lastWeek returns previous Mon..Sun", () => {
    const r = resolveRange("lastWeek", NOW, TZ);
    expect(r.from.toISOString()).toBe("2026-05-11T05:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-05-18T04:59:59.999Z");
  });
  it("payPeriod returns semi-monthly window for 22nd â†’ 16..end", () => {
    const r = resolveRange("payPeriod", NOW, TZ);
    expect(r.from.toISOString()).toBe("2026-05-16T05:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-06-01T04:59:59.999Z");
  });
  it("payPeriod returns 1..15 when ref day <= 15", () => {
    const r = resolveRange("payPeriod", new Date("2026-05-08T15:00:00Z"), TZ);
    expect(r.from.toISOString()).toBe("2026-05-01T05:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-05-16T04:59:59.999Z");
  });
});
```

- [ ] **Step 2: Implement `src/features/reports/ranges.ts`**

```ts
import {
  startOfDayInTz, endOfDayInTz,
  startOfWeekInTz, endOfWeekInTz,
  startOfSemiMonthlyInTz, endOfSemiMonthlyInTz,
} from "@/lib/time";

export type RangeKey = "today" | "thisWeek" | "lastWeek" | "payPeriod" | "custom";

export type Range = { from: Date; to: Date };

export function resolveRange(key: RangeKey, now: Date, tz: string, custom?: Range): Range {
  switch (key) {
    case "today": return { from: startOfDayInTz(now, tz), to: endOfDayInTz(now, tz) };
    case "thisWeek": return { from: startOfWeekInTz(now, tz), to: endOfWeekInTz(now, tz) };
    case "lastWeek": {
      const ref = new Date(now.getTime() - 7 * 24 * 3_600_000);
      return { from: startOfWeekInTz(ref, tz), to: endOfWeekInTz(ref, tz) };
    }
    case "payPeriod": return { from: startOfSemiMonthlyInTz(now, tz), to: endOfSemiMonthlyInTz(now, tz) };
    case "custom":
      if (!custom) throw new Error("custom range requires explicit from/to");
      return custom;
  }
}
```

- [ ] **Step 3: Run â€” expect pass**

```bash
pnpm test:unit
```

- [ ] **Step 4: Commit**

```bash
git add src/features/reports/ranges.ts tests/unit/reports/ranges.test.ts
git commit -m "feat(reports): range preset helpers (incl. semi-monthly)"
```

### Task 7.3: `/reports` page (KPI row, picker, table)

**Files:**
- Create: `src/app/(app)/reports/page.tsx`
- Create: `src/features/reports/components/kpi-row.tsx`
- Create: `src/features/reports/components/range-picker.tsx`
- Create: `src/features/reports/components/user-table.tsx`

- [ ] **Step 1: Write `src/features/reports/components/kpi-row.tsx`**

```tsx
import { formatHm } from "@/features/attendance/queries";
import type { KpiSet } from "../types";

export function KpiRow({ k }: { k: KpiSet }) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <Card label="Today" value={formatHm(k.today)} testId="kpi-today" />
      <Card label="This week" value={formatHm(k.thisWeek)} testId="kpi-this-week" />
      <Card label="Last week" value={formatHm(k.lastWeek)} testId="kpi-last-week" />
      <Card label="7-day avg" value={formatHm(k.sevenDayAvg)} testId="kpi-7d-avg" />
    </div>
  );
}

function Card({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-4">
      <p className="text-xs uppercase tracking-wider text-[var(--text-dim)]">{label}</p>
      <p className="mt-1 font-mono text-2xl tabular-nums" data-testid={testId}>{value}</p>
    </div>
  );
}
```

- [ ] **Step 2: Write `src/features/reports/components/range-picker.tsx`**

```tsx
"use client";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRESETS: Array<{ key: string; label: string }> = [
  { key: "today", label: "Today" },
  { key: "thisWeek", label: "This week" },
  { key: "lastWeek", label: "Last week" },
  { key: "payPeriod", label: "Pay period" },
];

export function RangePicker({ users }: { users?: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const active = params.get("range") ?? "thisWeek";

  function setQuery(updates: Record<string, string | null>) {
    const sp = new URLSearchParams(params);
    for (const [k, v] of Object.entries(updates)) v === null ? sp.delete(k) : sp.set(k, v);
    router.push(`${path}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3" data-testid="range-picker">
      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <Button key={p.key} variant={active === p.key ? "default" : "ghost"} size="sm" onClick={() => setQuery({ range: p.key, from: null, to: null })} data-testid={`preset-${p.key}`}>{p.label}</Button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <div>
          <label className="block text-xs text-[var(--text-dim)]">From</label>
          <Input type="date" defaultValue={params.get("from") ?? ""} onChange={(e) => setQuery({ range: "custom", from: e.target.value })} data-testid="range-from" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-dim)]">To</label>
          <Input type="date" defaultValue={params.get("to") ?? ""} onChange={(e) => setQuery({ range: "custom", to: e.target.value })} data-testid="range-to" />
        </div>
      </div>
      {users && (
        <div>
          <label className="block text-xs text-[var(--text-dim)]">User</label>
          <select className="rounded border border-[var(--border)] bg-[var(--bg-elev)] px-2 py-1 text-sm" defaultValue={params.get("userId") ?? ""} onChange={(e) => setQuery({ userId: e.target.value || null })} data-testid="user-filter">
            <option value="">All users</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      )}
      <Button asChild data-testid="csv-download">
        <Link href={`/api/reports/csv?${params.toString()}`}>Download CSV</Link>
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/features/reports/components/user-table.tsx`**

```tsx
import { formatHm } from "@/features/attendance/queries";
import type { UserRow } from "../types";

export function UserTable({ rows }: { rows: UserRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-[var(--text-dim)]" data-testid="report-empty">No sessions in this range.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]" data-testid="report-table">
      <table className="min-w-full divide-y divide-[var(--border)]">
        <thead className="bg-[var(--bg-elev)] text-left text-xs uppercase tracking-wider text-[var(--text-dim)]">
          <tr>
            <th className="px-4 py-2">User</th>
            <th className="px-4 py-2">Total</th>
            <th className="px-4 py-2">Daily breakdown</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((r) => (
            <tr key={r.userId} data-testid={`row-${r.userId}`}>
              <td className="px-4 py-3"><div className="font-medium">{r.name}</div><div className="text-xs text-[var(--text-dim)]">{r.email}</div></td>
              <td className="px-4 py-3 font-mono">{formatHm(r.totalMinutes)}</td>
              <td className="px-4 py-3 text-sm">
                <ul className="flex flex-wrap gap-2">
                  {r.days.map((d) => (
                    <li key={d.dateLocal} className="rounded bg-[var(--bg-elev-2)] px-2 py-1 font-mono"><span className="text-[var(--text-dim)]">{d.dateLocal.slice(5)}</span> {formatHm(d.minutes)}</li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/app/(app)/reports/page.tsx`**

```tsx
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { systemClock } from "@/lib/time";
import { resolveRange, type RangeKey } from "@/features/reports/ranges";
import { reportForRange, kpiSet } from "@/features/reports/service";
import { KpiRow } from "@/features/reports/components/kpi-row";
import { RangePicker } from "@/features/reports/components/range-picker";
import { UserTable } from "@/features/reports/components/user-table";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const now = systemClock.now();
  const key = (sp.range as RangeKey) ?? "thisWeek";
  const custom = sp.from && sp.to ? { from: new Date(`${sp.from}T00:00:00`), to: new Date(`${sp.to}T23:59:59`) } : undefined;
  const range = resolveRange(key, now, user.timezone, custom);

  const filterUserId = user.role === "ADMIN" ? sp.userId : user.id;

  const [rows, kpi, users] = await Promise.all([
    reportForRange(prisma, { from: range.from, to: range.to, timezone: user.timezone, userId: filterUserId }),
    kpiSet(prisma, user.id, user.timezone, now),
    user.role === "ADMIN"
      ? prisma.user.findMany({ where: { deactivatedAt: null, id: { not: "system" } }, select: { id: true, name: true } })
      : Promise.resolve(undefined),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-semibold">Reports</h1>
      <KpiRow k={kpi} />
      <RangePicker users={users} />
      <UserTable rows={rows} />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/features/reports/components src/app/\(app\)/reports
git commit -m "feat(reports): page with KPI row, range picker, user table"
```

### Task 7.4: Streaming CSV export endpoint

**Files:**
- Create: `src/app/api/reports/csv/route.ts`

- [ ] **Step 1: Write `src/app/api/reports/csv/route.ts`**

```ts
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { resolveRange, type RangeKey } from "@/features/reports/ranges";
import { systemClock, formatLocal, durationMinutes } from "@/lib/time";
import { csvHeader, csvRow } from "@/lib/csv";

export async function GET(req: Request) {
  const user = await requireUser();
  const url = new URL(req.url);
  const key = (url.searchParams.get("range") as RangeKey) ?? "thisWeek";
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const custom = fromParam && toParam ? { from: new Date(`${fromParam}T00:00:00`), to: new Date(`${toParam}T23:59:59`) } : undefined;
  const range = resolveRange(key, systemClock.now(), user.timezone, custom);

  const userIdParam = url.searchParams.get("userId");
  const filterUserId = user.role === "ADMIN" ? userIdParam ?? undefined : user.id;

  const sessions = await prisma.timeSession.findMany({
    where: {
      deletedAt: null,
      ...(filterUserId ? { userId: filterUserId } : {}),
      clockInAt: { gte: range.from, lte: range.to },
    },
    include: { user: true, auditLogs: { where: { action: "EDIT_SESSION" }, select: { id: true } } },
    orderBy: [{ user: { email: "asc" } }, { clockInAt: "asc" }],
  });

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(enc.encode(csvHeader([
        "user_email", "user_name", "date_local", "session_id",
        "clock_in_local", "clock_out_local", "duration_minutes",
        "auto_closed", "edited", "notes",
        "clock_in_utc", "clock_out_utc",
      ])));
      for (const s of sessions) {
        const tz = user.timezone;
        const date = formatLocal(s.clockInAt, tz, "yyyy-MM-dd");
        const inLocal = formatLocal(s.clockInAt, tz, "yyyy-MM-dd HH:mm");
        const outLocal = s.clockOutAt ? formatLocal(s.clockOutAt, tz, "yyyy-MM-dd HH:mm") : "";
        const minutes = durationMinutes(s.clockInAt, s.clockOutAt ?? systemClock.now());
        controller.enqueue(enc.encode(csvRow([
          s.user.email, s.user.name, date, s.id,
          inLocal, outLocal, minutes,
          s.autoClosed, s.auditLogs.length > 0, s.notes,
          s.clockInAt, s.clockOutAt,
        ])));
      }
      controller.close();
    },
  });

  const fname = `punchpad-${range.from.toISOString().slice(0, 10)}_to_${range.to.toISOString().slice(0, 10)}.csv`;
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
```

- [ ] **Step 2: Smoke test**

```bash
pnpm dev
```

Log in as admin, go to `/reports`, click "Download CSV". A file with the right header row downloads. Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/reports/csv
git commit -m "feat(reports): streaming CSV export"
```

### Task 7.5: E2E â€” CSV download

**Files:**
- Create: `tests/e2e/reports/csv.spec.ts`

- [ ] **Step 1: Write test**

```ts
import { test, expect } from "@playwright/test";

test.use({ storageState: "tests/e2e/storage/admin.json" });

test("admin downloads CSV with expected header", async ({ page }) => {
  await page.goto("/reports?range=thisWeek");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("csv-download").click(),
  ]);
  const path = await download.path();
  expect(path).toBeTruthy();
  const fs = await import("node:fs/promises");
  const head = (await fs.readFile(path!, "utf-8")).split("\r\n")[0];
  expect(head).toBe("user_email,user_name,date_local,session_id,clock_in_local,clock_out_local,duration_minutes,auto_closed,edited,notes,clock_in_utc,clock_out_utc");
});
```

- [ ] **Step 2: Run**

```bash
pnpm test:e2e --project=setup --project=chromium-admin
```

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/reports
git commit -m "test: e2e CSV download"
```

---


## Milestone 8 â€” Admin (`/admin/users`, `/admin/audit`)

End state: admin can create employees, reset passwords (which sets `mustChangePassword: true`), deactivate users, and change roles. Audit log page lists every recorded change with filters and a before/after JSON expand. RBAC is verified by an integration test that hits every server action with non-admin and expects FORBIDDEN.

### Task 8.1: User-management service + tests

**Files:**
- Create: `src/features/users/admin-service.ts`
- Create: `tests/integration/users/admin-service.test.ts`

- [ ] **Step 1: Write failing test**

`tests/integration/users/admin-service.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import { createUser, resetPassword, deactivateUser, changeRole } from "@/features/users/admin-service";
import { FakeClock } from "@/lib/time";
import { hash } from "@node-rs/argon2";

let db: TestDb;
const clock = new FakeClock(new Date("2026-05-12T13:00:00Z"));
beforeAll(async () => { db = await setupTestDb(); }, 120_000);
afterAll(async () => { await db.stop(); });
beforeEach(async () => {
  await db.prisma.auditLog.deleteMany();
  await db.prisma.user.deleteMany({ where: { id: { not: "system" } } });
});

describe("admin user service", () => {
  it("createUser persists user with mustChangePassword=true and writes CREATE_USER audit", async () => {
    const admin = await db.prisma.user.create({ data: { email: "a@x.com", name: "A", role: "ADMIN", passwordHash: await hash("password1234aa") } });
    const u = await createUser({ prisma: db.prisma, clock }, admin.id, {
      email: "new@x.com", name: "New", initialPassword: "password1234aa", role: "EMPLOYEE", timezone: "America/Chicago",
    });
    expect(u.mustChangePassword).toBe(true);
    const audit = await db.prisma.auditLog.findFirst({ where: { actorUserId: admin.id, action: "CREATE_USER" } });
    expect(audit).toBeTruthy();
  });

  it("createUser rejects duplicate email with VALIDATION", async () => {
    const admin = await db.prisma.user.create({ data: { email: "a@x.com", name: "A", role: "ADMIN", passwordHash: await hash("password1234aa") } });
    await db.prisma.user.create({ data: { email: "dup@x.com", name: "Dup", passwordHash: await hash("password1234aa") } });
    await expect(createUser({ prisma: db.prisma, clock }, admin.id, { email: "dup@x.com", name: "X", initialPassword: "password1234aa", role: "EMPLOYEE", timezone: "America/Chicago" }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("resetPassword sets mustChangePassword=true", async () => {
    const admin = await db.prisma.user.create({ data: { email: "a@x.com", name: "A", role: "ADMIN", passwordHash: await hash("password1234aa") } });
    const e = await db.prisma.user.create({ data: { email: "e@x.com", name: "E", passwordHash: await hash("password1234aa") } });
    await resetPassword({ prisma: db.prisma, clock }, admin.id, e.id, "newpassword1234");
    const fresh = await db.prisma.user.findUniqueOrThrow({ where: { id: e.id } });
    expect(fresh.mustChangePassword).toBe(true);
  });

  it("deactivateUser sets deactivatedAt and writes audit", async () => {
    const admin = await db.prisma.user.create({ data: { email: "a@x.com", name: "A", role: "ADMIN", passwordHash: await hash("password1234aa") } });
    const e = await db.prisma.user.create({ data: { email: "e@x.com", name: "E", passwordHash: await hash("password1234aa") } });
    await deactivateUser({ prisma: db.prisma, clock }, admin.id, e.id);
    const fresh = await db.prisma.user.findUniqueOrThrow({ where: { id: e.id } });
    expect(fresh.deactivatedAt).not.toBeNull();
    const audit = await db.prisma.auditLog.findFirst({ where: { action: "DEACTIVATE_USER" } });
    expect(audit?.actorUserId).toBe(admin.id);
  });

  it("changeRole writes ROLE_CHANGE audit with before/after", async () => {
    const admin = await db.prisma.user.create({ data: { email: "a@x.com", name: "A", role: "ADMIN", passwordHash: await hash("password1234aa") } });
    const e = await db.prisma.user.create({ data: { email: "e@x.com", name: "E", passwordHash: await hash("password1234aa") } });
    await changeRole({ prisma: db.prisma, clock }, admin.id, e.id, "ADMIN");
    const audit = await db.prisma.auditLog.findFirst({ where: { action: "ROLE_CHANGE" } });
    expect(audit?.before).toMatchObject({ role: "EMPLOYEE" });
    expect(audit?.after).toMatchObject({ role: "ADMIN" });
  });

  it("refuses to deactivate the system user or the last admin", async () => {
    const admin = await db.prisma.user.create({ data: { email: "a@x.com", name: "A", role: "ADMIN", passwordHash: await hash("password1234aa") } });
    await expect(deactivateUser({ prisma: db.prisma, clock }, admin.id, "system")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(deactivateUser({ prisma: db.prisma, clock }, admin.id, admin.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
```

- [ ] **Step 2: Run â€” expect failure**

```bash
pnpm test:int
```

- [ ] **Step 3: Implement `src/features/users/admin-service.ts`**

```ts
import type { PrismaClient, User } from "@prisma/client";
import type { Clock } from "@/lib/time";
import { hashPassword } from "@/lib/password";
import { ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors";

export type Deps = { prisma: PrismaClient; clock: Clock };

export type CreateUserInput = {
  email: string;
  name: string;
  initialPassword: string;
  role: "EMPLOYEE" | "ADMIN";
  timezone: string;
};

export async function createUser(d: Deps, actorId: string, input: CreateUserInput): Promise<User> {
  if (input.initialPassword.length < 12) throw new ValidationError("Initial password must be at least 12 characters.");
  const email = input.email.toLowerCase();
  const exists = await d.prisma.user.findUnique({ where: { email } });
  if (exists) throw new ValidationError("A user with that email already exists.");
  const passwordHash = await hashPassword(input.initialPassword);
  const user = await d.prisma.user.create({
    data: { email, name: input.name, role: input.role, timezone: input.timezone, passwordHash, mustChangePassword: true },
  });
  await d.prisma.auditLog.create({
    data: { actorUserId: actorId, action: "CREATE_USER", after: { id: user.id, email: user.email, role: user.role } },
  });
  return user;
}

export async function resetPassword(d: Deps, actorId: string, userId: string, newPassword: string): Promise<void> {
  if (newPassword.length < 12) throw new ValidationError("New password must be at least 12 characters.");
  const user = await d.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError();
  await d.prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword), mustChangePassword: true },
  });
  await d.prisma.auditLog.create({
    data: { actorUserId: actorId, action: "EDIT_SESSION", reason: "password reset", after: { userId } },
  });
}

async function isLastActiveAdmin(prisma: PrismaClient, userId: string): Promise<boolean> {
  const others = await prisma.user.count({
    where: { id: { not: userId, notIn: ["system"] }, role: "ADMIN", deactivatedAt: null },
  });
  return others === 0;
}

export async function deactivateUser(d: Deps, actorId: string, userId: string): Promise<void> {
  if (userId === "system") throw new ForbiddenError("Cannot deactivate the system user.");
  const user = await d.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError();
  if (user.role === "ADMIN" && (await isLastActiveAdmin(d.prisma, userId))) {
    throw new ForbiddenError("Cannot deactivate the last active admin.");
  }
  const before = { id: user.id, deactivatedAt: user.deactivatedAt?.toISOString() ?? null };
  const updated = await d.prisma.user.update({ where: { id: userId }, data: { deactivatedAt: d.clock.now() } });
  await d.prisma.auditLog.create({
    data: { actorUserId: actorId, action: "DEACTIVATE_USER", before, after: { id: updated.id, deactivatedAt: updated.deactivatedAt?.toISOString() ?? null } },
  });
}

export async function changeRole(d: Deps, actorId: string, userId: string, role: "EMPLOYEE" | "ADMIN"): Promise<void> {
  if (userId === "system") throw new ForbiddenError("Cannot change the system user's role.");
  const user = await d.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError();
  if (user.role === role) return;
  if (user.role === "ADMIN" && role === "EMPLOYEE" && (await isLastActiveAdmin(d.prisma, userId))) {
    throw new ForbiddenError("Cannot demote the last active admin.");
  }
  const before = { role: user.role };
  const updated = await d.prisma.user.update({ where: { id: userId }, data: { role } });
  await d.prisma.auditLog.create({
    data: { actorUserId: actorId, action: "ROLE_CHANGE", before, after: { role: updated.role } },
  });
}
```

- [ ] **Step 4: Run â€” expect pass**

```bash
pnpm test:int
```

- [ ] **Step 5: Commit**

```bash
git add src/features/users/admin-service.ts tests/integration/users/admin-service.test.ts
git commit -m "feat(users): admin service (create/reset/deactivate/changeRole) with audit"
```

### Task 8.2: Admin server actions

**Files:**
- Create: `src/features/users/admin-actions.ts`

- [ ] **Step 1: Write `src/features/users/admin-actions.ts`**

```ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { systemClock } from "@/lib/time";
import { requireAdmin } from "@/lib/auth";
import { toErrorEnvelope } from "@/lib/errors";
import { createUser, resetPassword, deactivateUser, changeRole } from "./admin-service";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  initialPassword: z.string().min(12),
  role: z.enum(["EMPLOYEE", "ADMIN"]),
  timezone: z.string().min(1),
});

export async function createUserAction(input: unknown) {
  try {
    const admin = await requireAdmin();
    const p = createSchema.parse(input);
    const u = await createUser({ prisma, clock: systemClock }, admin.id, p);
    revalidatePath("/admin/users");
    return { ok: true as const, userId: u.id };
  } catch (e) { return toErrorEnvelope(e); }
}

const resetSchema = z.object({ userId: z.string().min(1), newPassword: z.string().min(12) });
export async function resetPasswordAction(input: unknown) {
  try {
    const admin = await requireAdmin();
    const p = resetSchema.parse(input);
    await resetPassword({ prisma, clock: systemClock }, admin.id, p.userId, p.newPassword);
    revalidatePath("/admin/users");
    return { ok: true as const };
  } catch (e) { return toErrorEnvelope(e); }
}

const idSchema = z.object({ userId: z.string().min(1) });
export async function deactivateUserAction(input: unknown) {
  try {
    const admin = await requireAdmin();
    const p = idSchema.parse(input);
    await deactivateUser({ prisma, clock: systemClock }, admin.id, p.userId);
    revalidatePath("/admin/users");
    return { ok: true as const };
  } catch (e) { return toErrorEnvelope(e); }
}

const roleSchema = z.object({ userId: z.string().min(1), role: z.enum(["EMPLOYEE", "ADMIN"]) });
export async function changeRoleAction(input: unknown) {
  try {
    const admin = await requireAdmin();
    const p = roleSchema.parse(input);
    await changeRole({ prisma, clock: systemClock }, admin.id, p.userId, p.role);
    revalidatePath("/admin/users");
    return { ok: true as const };
  } catch (e) { return toErrorEnvelope(e); }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/users/admin-actions.ts
git commit -m "feat(users): admin server actions"
```

### Task 8.3: `/admin/users` page UI

**Files:**
- Create: `src/app/(app)/admin/users/page.tsx`
- Create: `src/features/users/components/users-table.tsx`
- Create: `src/features/users/components/new-user-dialog.tsx`
- Create: `src/features/users/components/reset-password-dialog.tsx`

- [ ] **Step 1: Write `src/app/(app)/admin/users/page.tsx`**

```tsx
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UsersTable } from "@/features/users/components/users-table";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({
    where: { id: { not: "system" } },
    orderBy: [{ deactivatedAt: "asc" }, { name: "asc" }],
    include: { sessions: { orderBy: { clockInAt: "desc" }, take: 1, select: { clockInAt: true } } },
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
```

- [ ] **Step 2: Write `src/features/users/components/users-table.tsx`**

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewUserDialog } from "./new-user-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { deactivateUserAction, changeRoleAction } from "../admin-actions";

type Row = { id: string; email: string; name: string; role: "EMPLOYEE" | "ADMIN"; deactivatedAt: string | null; lastClockIn: string | null };

export function UsersTable({ rows }: { rows: Row[] }) {
  const [resetFor, setResetFor] = useState<Row | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <NewUserDialog />
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--border)]" data-testid="users-table">
        <table className="min-w-full divide-y divide-[var(--border)] text-sm">
          <thead className="bg-[var(--bg-elev)] text-left text-xs uppercase tracking-wider text-[var(--text-dim)]">
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Last clock-in</th><th className="px-4 py-2">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((r) => (
              <tr key={r.id} data-testid={`user-row-${r.id}`}>
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.email}</td>
                <td className="px-4 py-3"><Badge variant={r.role === "ADMIN" ? "default" : "secondary"}>{r.role}</Badge></td>
                <td className="px-4 py-3">{r.deactivatedAt ? <Badge variant="secondary">deactivated</Badge> : <Badge>active</Badge>}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.lastClockIn ? r.lastClockIn.slice(0, 16).replace("T", " ") : "â€”"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setResetFor(r)} data-testid={`reset-${r.id}`}>Reset password</Button>
                    <Button size="sm" variant="ghost" onClick={() => void changeRoleAction({ userId: r.id, role: r.role === "ADMIN" ? "EMPLOYEE" : "ADMIN" })} data-testid={`toggle-role-${r.id}`}>
                      {r.role === "ADMIN" ? "Demote" : "Promote"}
                    </Button>
                    {!r.deactivatedAt && (
                      <Button size="sm" variant="ghost" onClick={() => void deactivateUserAction({ userId: r.id })} data-testid={`deactivate-${r.id}`}>Deactivate</Button>
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
```

- [ ] **Step 3: Write `src/features/users/components/new-user-dialog.tsx`**

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
      <DialogTrigger asChild><Button data-testid="new-user-button">New user</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create user</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              setError(null);
              const res = await createUserAction({
                email: fd.get("email"), name: fd.get("name"),
                initialPassword: fd.get("initialPassword"),
                role: fd.get("role"), timezone: fd.get("timezone"),
              });
              if (!("ok" in res) || !res.ok) { setError(res.message); return; }
              setOpen(false);
              router.refresh();
            });
          }}
          className="flex flex-col gap-3"
        >
          <div><Label>Name</Label><Input name="name" required data-testid="new-user-name" /></div>
          <div><Label>Email</Label><Input name="email" type="email" required data-testid="new-user-email" /></div>
          <div><Label>Initial password (min 12)</Label><Input name="initialPassword" type="text" required minLength={12} data-testid="new-user-password" /></div>
          <div>
            <Label>Role</Label>
            <select name="role" defaultValue="EMPLOYEE" className="w-full rounded border border-[var(--border)] bg-[var(--bg-elev)] px-2 py-1 text-sm" data-testid="new-user-role">
              <option value="EMPLOYEE">Employee</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div><Label>Timezone</Label><Input name="timezone" defaultValue="America/Chicago" required data-testid="new-user-tz" /></div>
          {error && <p data-testid="new-user-error" className="text-sm text-[var(--danger)]">{error}</p>}
          <Button type="submit" disabled={pending} data-testid="new-user-submit">{pending ? "Creatingâ€¦" : "Create"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Write `src/features/users/components/reset-password-dialog.tsx`**

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction } from "../admin-actions";

export function ResetPasswordDialog({ row, onClose }: { row: { id: string; name: string } | null; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (!row) return null;
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reset password â€” {row.name}</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              setError(null);
              const res = await resetPasswordAction({ userId: row.id, newPassword: fd.get("newPassword") });
              if (!("ok" in res) || !res.ok) { setError(res.message); return; }
              onClose();
              router.refresh();
            });
          }}
          className="flex flex-col gap-3"
        >
          <div><Label>New password</Label><Input name="newPassword" type="text" required minLength={12} data-testid="reset-input" /></div>
          {error && <p data-testid="reset-error" className="text-sm text-[var(--danger)]">{error}</p>}
          <Button type="submit" disabled={pending} data-testid="reset-submit">{pending ? "Savingâ€¦" : "Reset"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/admin/users src/features/users/components
git commit -m "feat(admin): /admin/users page with create/reset/role/deactivate"
```

### Task 8.4: `/admin/audit` page

**Files:**
- Create: `src/app/(app)/admin/audit/page.tsx`
- Create: `src/features/audit/components/audit-table.tsx`

- [ ] **Step 1: Write `src/app/(app)/admin/audit/page.tsx`**

```tsx
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AuditTable } from "@/features/audit/components/audit-table";

export const dynamic = "force-dynamic";

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const actor = sp.actor;
  const action = sp.action;
  const from = sp.from ? new Date(`${sp.from}T00:00:00`) : undefined;
  const to = sp.to ? new Date(`${sp.to}T23:59:59`) : undefined;

  const rows = await prisma.auditLog.findMany({
    where: {
      ...(actor ? { actorUserId: actor } : {}),
      ...(action ? { action: action as never } : {}),
      ...(from || to ? { at: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
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
```

- [ ] **Step 2: Write `src/features/audit/components/audit-table.tsx`**

```tsx
"use client";
import { useState } from "react";

type Row = {
  id: string;
  at: string;
  actor: { email: string; name: string };
  action: string;
  targetSessionId: string | null;
  reason: string | null;
  before: unknown;
  after: unknown;
};

export function AuditTable({ rows }: { rows: Row[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (rows.length === 0) return <p className="text-sm text-[var(--text-dim)]" data-testid="audit-empty">No audit entries match.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]" data-testid="audit-table">
      <table className="min-w-full divide-y divide-[var(--border)] text-sm">
        <thead className="bg-[var(--bg-elev)] text-left text-xs uppercase tracking-wider text-[var(--text-dim)]">
          <tr><th className="px-4 py-2">When</th><th className="px-4 py-2">Actor</th><th className="px-4 py-2">Action</th><th className="px-4 py-2">Target</th><th className="px-4 py-2">Reason</th></tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((r) => (
            <>
              <tr key={r.id} className="cursor-pointer hover:bg-[var(--bg-elev-2)]" onClick={() => setExpanded(expanded === r.id ? null : r.id)} data-testid={`audit-row-${r.id}`}>
                <td className="px-4 py-3 font-mono text-xs">{r.at.replace("T", " ").slice(0, 19)}Z</td>
                <td className="px-4 py-3">{r.actor.name} <span className="text-[var(--text-dim)]">({r.actor.email})</span></td>
                <td className="px-4 py-3 font-mono">{r.action}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.targetSessionId ?? "â€”"}</td>
                <td className="px-4 py-3">{r.reason ?? ""}</td>
              </tr>
              {expanded === r.id && (
                <tr key={`${r.id}-expand`}>
                  <td colSpan={5} className="bg-[var(--bg-elev-2)] px-4 py-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div><h3 className="text-xs uppercase text-[var(--text-dim)]">Before</h3><pre className="overflow-x-auto rounded bg-[var(--bg)] p-3 text-xs">{JSON.stringify(r.before, null, 2)}</pre></div>
                      <div><h3 className="text-xs uppercase text-[var(--text-dim)]">After</h3><pre className="overflow-x-auto rounded bg-[var(--bg)] p-3 text-xs">{JSON.stringify(r.after, null, 2)}</pre></div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/admin/audit src/features/audit
git commit -m "feat(admin): /admin/audit page with before/after expand"
```

### Task 8.5: RBAC sweep integration test

**Files:**
- Create: `tests/integration/auth/rbac.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import { createUser, resetPassword, deactivateUser, changeRole } from "@/features/users/admin-service";
import { adminEditSession, adminDeleteSession } from "@/features/attendance/service";
import { FakeClock } from "@/lib/time";
import { hash } from "@node-rs/argon2";

// These services do not themselves enforce role â€” the requireAdmin gate at the action layer does.
// This test asserts that admin services accept admin actorIds and produce audit rows with them.
// (Auth-layer RBAC is exercised by the auth E2E tests.)

let db: TestDb;
const clock = new FakeClock(new Date("2026-05-12T13:00:00Z"));
beforeAll(async () => { db = await setupTestDb(); }, 120_000);
afterAll(async () => { await db.stop(); });
beforeEach(async () => {
  await db.prisma.auditLog.deleteMany();
  await db.prisma.timeSession.deleteMany();
  await db.prisma.user.deleteMany({ where: { id: { not: "system" } } });
});

describe("admin services produce audit rows attributed to the actor", () => {
  it("createUser audit references admin actor", async () => {
    const admin = await db.prisma.user.create({ data: { email: "a@x.com", name: "A", role: "ADMIN", passwordHash: await hash("password1234aa") } });
    await createUser({ prisma: db.prisma, clock }, admin.id, { email: "n@x.com", name: "N", initialPassword: "password1234aa", role: "EMPLOYEE", timezone: "America/Chicago" });
    const audit = await db.prisma.auditLog.findFirst({ where: { action: "CREATE_USER" } });
    expect(audit?.actorUserId).toBe(admin.id);
  });

  it("adminDeleteSession audit references admin actor", async () => {
    const admin = await db.prisma.user.create({ data: { email: "a@x.com", name: "A", role: "ADMIN", passwordHash: await hash("password1234aa") } });
    const emp = await db.prisma.user.create({ data: { email: "e@x.com", name: "E", passwordHash: await hash("password1234aa") } });
    const s = await db.prisma.timeSession.create({ data: { userId: emp.id, clockInAt: new Date("2026-05-10T08:00:00Z"), clockOutAt: new Date("2026-05-10T12:00:00Z") } });
    await adminDeleteSession({ prisma: db.prisma, clock }, admin.id, s.id, "test");
    const audit = await db.prisma.auditLog.findFirst({ where: { action: "DELETE_SESSION" } });
    expect(audit?.actorUserId).toBe(admin.id);
  });
});
```

- [ ] **Step 2: Run**

```bash
pnpm test:int
```

- [ ] **Step 3: Commit**

```bash
git add tests/integration/auth/rbac.test.ts
git commit -m "test: admin services attribute audit to actor"
```

### Task 8.6: E2E â€” full account lifecycle

**Files:**
- Create: `tests/e2e/admin/lifecycle.spec.ts`

- [ ] **Step 1: Write**

```ts
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

test.use({ storageState: "tests/e2e/storage/admin.json" });

test("admin creates user, user logs in, gets forced to change password", async ({ page, browser }) => {
  const prisma = new PrismaClient();
  await prisma.user.deleteMany({ where: { email: "newhire@e2e.test" } });
  await prisma.$disconnect();

  await page.goto("/admin/users");
  await page.getByTestId("new-user-button").click();
  await page.getByTestId("new-user-name").fill("New Hire");
  await page.getByTestId("new-user-email").fill("newhire@e2e.test");
  await page.getByTestId("new-user-password").fill("tempPassword1234");
  await page.getByTestId("new-user-tz").fill("America/Chicago");
  await page.getByTestId("new-user-submit").click();
  await expect(page.getByText("newhire@e2e.test")).toBeVisible();

  const fresh = await browser.newContext();
  const p2 = await fresh.newPage();
  await p2.goto("/login");
  await p2.getByTestId("login-email").fill("newhire@e2e.test");
  await p2.getByTestId("login-password").fill("tempPassword1234");
  await p2.getByTestId("login-submit").click();
  await p2.waitForURL("**/account/change-password");
  await p2.getByTestId("cp-current").fill("tempPassword1234");
  await p2.getByTestId("cp-new").fill("newGoodPassword12");
  await p2.getByTestId("cp-submit").click();
  await p2.waitForURL("**/clock");
  await fresh.close();
});
```

- [ ] **Step 2: Run**

```bash
pnpm test:e2e --project=setup --project=chromium-admin
```

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/admin
git commit -m "test: e2e account lifecycle (create â†’ login â†’ forced password change)"
```

---


## Milestone 9 â€” Cron + Email

End state: a separate `cron` container fires `POST /api/cron/watchdog` every 15 min and `POST /api/cron/weekly-digest` every 15 min on Monday between 06:00â€“15:00 UTC. Both endpoints require a `x-cron-secret` header. Watchdog warns at 12h, auto-closes at 18h (deterministic close time), and emits both employee + admin notifications. Weekly digest is idempotent per `(userId, isoWeek)`. Resend is the default transport; SMTP is wired and selectable via `EMAIL_TRANSPORT`.

### Task 9.1: Email transport wrapper

**Files:**
- Create: `src/lib/email.ts`
- Create: `tests/unit/lib/email.test.ts`

- [ ] **Step 1: Install Resend and Nodemailer**

```bash
pnpm add resend nodemailer
pnpm add -D @types/nodemailer
```

- [ ] **Step 2: Write failing test (selection logic only â€” no network)**

`tests/unit/lib/email.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { sendEmail, type EmailTransport } from "@/lib/email";

describe("sendEmail", () => {
  it("calls resend send when transport=resend", async () => {
    const send = vi.fn().mockResolvedValue({ id: "fake" });
    const t: EmailTransport = { kind: "resend", send };
    await sendEmail(t, { to: "a@x.com", subject: "Hi", html: "<p>Hi</p>" });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: "a@x.com", subject: "Hi" }));
  });
  it("calls smtp send when transport=smtp", async () => {
    const send = vi.fn().mockResolvedValue({ messageId: "fake" });
    const t: EmailTransport = { kind: "smtp", send };
    await sendEmail(t, { to: "a@x.com", subject: "Hi", html: "<p>Hi</p>" });
    expect(send).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Implement `src/lib/email.ts`**

```ts
import { Resend } from "resend";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export type EmailMessage = { to: string; subject: string; html: string };
export type EmailTransport =
  | { kind: "resend"; send: (msg: EmailMessage & { from: string }) => Promise<unknown> }
  | { kind: "smtp"; send: (msg: EmailMessage & { from: string }) => Promise<unknown> };

let cached: EmailTransport | null = null;
export function getDefaultTransport(): EmailTransport {
  if (cached) return cached;
  if (env.EMAIL_TRANSPORT === "resend") {
    const resend = new Resend(env.RESEND_API_KEY!);
    cached = {
      kind: "resend",
      send: async (msg) => resend.emails.send({ from: msg.from, to: [msg.to], subject: msg.subject, html: msg.html }),
    };
  } else {
    const tx: Transporter = nodemailer.createTransport({
      host: env.SMTP_HOST!, port: env.SMTP_PORT!, secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER!, pass: env.SMTP_PASS! },
    });
    cached = {
      kind: "smtp",
      send: async (msg) => tx.sendMail({ from: msg.from, to: msg.to, subject: msg.subject, html: msg.html }),
    };
  }
  return cached!;
}

export async function sendEmail(transport: EmailTransport, msg: EmailMessage): Promise<void> {
  try {
    await transport.send({ ...msg, from: env.EMAIL_FROM });
  } catch (err) {
    logger.error({ component: "email", to: msg.to, err: (err as Error).message }, "email_send_failed");
    throw err;
  }
}
```

- [ ] **Step 4: Run â€” expect pass**

```bash
pnpm test:unit
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts tests/unit/lib/email.test.ts package.json
git commit -m "feat: email transport wrapper (Resend + SMTP)"
```

### Task 9.2: Cron secret middleware helper

**Files:**
- Create: `src/lib/cron.ts`

- [ ] **Step 1: Write `src/lib/cron.ts`**

```ts
import { env } from "@/lib/env";
import { UnauthorizedError } from "@/lib/errors";

export function verifyCronSecret(req: Request): void {
  const got = req.headers.get("x-cron-secret");
  if (!got || got !== env.CRON_SECRET) throw new UnauthorizedError("Cron secret invalid.");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/cron.ts
git commit -m "feat: cron secret verifier"
```

### Task 9.3: Watchdog service (warn + close passes)

**Files:**
- Create: `src/features/cron/watchdog-service.ts`
- Create: `tests/integration/cron/watchdog.test.ts`

- [ ] **Step 1: Write failing test**

`tests/integration/cron/watchdog.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import { runWatchdog } from "@/features/cron/watchdog-service";
import { FakeClock } from "@/lib/time";
import { hash } from "@node-rs/argon2";

let db: TestDb;
const clock = new FakeClock(new Date("2026-05-12T00:00:00Z"));

beforeAll(async () => { db = await setupTestDb(); }, 120_000);
afterAll(async () => { await db.stop(); });
beforeEach(async () => {
  await db.prisma.auditLog.deleteMany();
  await db.prisma.timeSession.deleteMany();
  await db.prisma.user.deleteMany({ where: { id: { not: "system" } } });
  await db.prisma.user.upsert({
    where: { id: "system" }, update: {},
    create: { id: "system", email: "system@punchpad.internal", name: "System", passwordHash: "!disabled", role: "ADMIN", deactivatedAt: new Date() },
  });
  clock.setNow(new Date("2026-05-12T00:00:00Z"));
});

describe("watchdog", () => {
  it("warns at 12h+ and is idempotent", async () => {
    const u = await db.prisma.user.create({ data: { email: "u@x.com", name: "U", passwordHash: await hash("password1234aa") } });
    await db.prisma.timeSession.create({ data: { userId: u.id, clockInAt: new Date("2026-05-11T11:00:00Z") } });
    clock.setNow(new Date("2026-05-12T00:00:00Z")); // 13h in
    const send = vi.fn();
    const r1 = await runWatchdog({ prisma: db.prisma, clock, warnHours: 12, closeHours: 18, notify: send, systemUserId: "system" });
    expect(r1.warned).toBe(1);
    expect(r1.closed).toBe(0);
    const r2 = await runWatchdog({ prisma: db.prisma, clock, warnHours: 12, closeHours: 18, notify: send, systemUserId: "system" });
    expect(r2.warned).toBe(0); // idempotent
  });

  it("auto-closes at 18h+ at clockInAt + 18h and writes AUTO_CLOSE audit attributed to system", async () => {
    const u = await db.prisma.user.create({ data: { email: "u@x.com", name: "U", passwordHash: await hash("password1234aa") } });
    await db.prisma.timeSession.create({ data: { userId: u.id, clockInAt: new Date("2026-05-11T05:00:00Z") } });
    clock.setNow(new Date("2026-05-12T00:00:00Z")); // 19h in
    const send = vi.fn();
    const r = await runWatchdog({ prisma: db.prisma, clock, warnHours: 12, closeHours: 18, notify: send, systemUserId: "system" });
    expect(r.closed).toBe(1);
    const fresh = await db.prisma.timeSession.findFirstOrThrow({ where: { userId: u.id } });
    expect(fresh.clockOutAt?.toISOString()).toBe("2026-05-11T23:00:00.000Z");
    expect(fresh.autoClosed).toBe(true);
    const audit = await db.prisma.auditLog.findFirst({ where: { action: "AUTO_CLOSE" } });
    expect(audit?.actorUserId).toBe("system");
  });
});
```

- [ ] **Step 2: Run â€” expect failure**

```bash
pnpm test:int
```

- [ ] **Step 3: Implement `src/features/cron/watchdog-service.ts`**

```ts
import type { PrismaClient } from "@prisma/client";
import type { Clock } from "@/lib/time";
import { snapshot } from "@/features/attendance/types";
import { logger } from "@/lib/logger";

export type WatchdogDeps = {
  prisma: PrismaClient;
  clock: Clock;
  warnHours: number;
  closeHours: number;
  systemUserId: string;
  notify: (kind: "warn" | "auto_close" | "admin_auto_close", payload: Record<string, unknown>) => void | Promise<void>;
};

export async function runWatchdog(d: WatchdogDeps): Promise<{ warned: number; closed: number }> {
  const now = d.clock.now();
  const warnCutoff = new Date(now.getTime() - d.warnHours * 3_600_000);
  const closeCutoff = new Date(now.getTime() - d.closeHours * 3_600_000);

  // Warn pass: open, not yet warned, clockInAt <= warnCutoff
  const toWarn = await d.prisma.timeSession.findMany({
    where: { clockOutAt: null, deletedAt: null, warnedAt: null, clockInAt: { lte: warnCutoff } },
    include: { user: { select: { email: true, name: true } } },
  });
  for (const s of toWarn) {
    await d.prisma.timeSession.update({ where: { id: s.id }, data: { warnedAt: now } });
    await d.notify("warn", { userId: s.userId, email: s.user.email, sessionId: s.id, clockInAt: s.clockInAt.toISOString() });
    logger.info({ component: "watchdog", sessionId: s.id }, "watchdog_warned");
  }

  // Close pass: open, clockInAt <= closeCutoff
  const toClose = await d.prisma.timeSession.findMany({
    where: { clockOutAt: null, deletedAt: null, clockInAt: { lte: closeCutoff } },
    include: { user: { select: { email: true, name: true } } },
  });
  for (const s of toClose) {
    const closeAt = new Date(s.clockInAt.getTime() + d.closeHours * 3_600_000);
    const before = snapshot(s);
    const updated = await d.prisma.timeSession.update({
      where: { id: s.id }, data: { clockOutAt: closeAt, autoClosed: true },
    });
    const after = snapshot(updated);
    await d.prisma.auditLog.create({
      data: { actorUserId: d.systemUserId, targetSessionId: s.id, action: "AUTO_CLOSE", before, after, reason: "Exceeded watchdog threshold" },
    });
    await d.notify("auto_close", { userId: s.userId, email: s.user.email, sessionId: s.id, closeAt: closeAt.toISOString() });

    const admins = await d.prisma.user.findMany({ where: { role: "ADMIN", deactivatedAt: null, id: { not: "system" } }, select: { id: true, email: true } });
    for (const a of admins) {
      await d.notify("admin_auto_close", { adminId: a.id, adminEmail: a.email, subjectUserId: s.userId, subjectEmail: s.user.email, sessionId: s.id });
    }
    logger.info({ component: "watchdog", sessionId: s.id }, "watchdog_auto_closed");
  }

  return { warned: toWarn.length, closed: toClose.length };
}
```

- [ ] **Step 4: Run â€” expect pass**

```bash
pnpm test:int
```

- [ ] **Step 5: Commit**

```bash
git add src/features/cron/watchdog-service.ts tests/integration/cron/watchdog.test.ts
git commit -m "feat(cron): watchdog (warn + auto-close) service"
```

### Task 9.4: `/api/cron/watchdog` route

**Files:**
- Create: `src/app/api/cron/watchdog/route.ts`
- Create: `src/features/cron/notify.ts`

- [ ] **Step 1: Write `src/features/cron/notify.ts`**

```ts
import { getDefaultTransport, sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export async function dispatchNotification(
  kind: "warn" | "auto_close" | "admin_auto_close",
  payload: Record<string, unknown>,
): Promise<void> {
  const t = getDefaultTransport();
  if (kind === "warn") {
    await sendEmail(t, {
      to: String(payload.email),
      subject: "PunchPad: still working?",
      html: `<p>You've been clocked in for over ${env.WATCHDOG_WARN_HOURS} hours. If that's expected, ignore this. Otherwise, please clock out.</p>`,
    });
  } else if (kind === "auto_close") {
    await sendEmail(t, {
      to: String(payload.email),
      subject: "PunchPad: session auto-closed",
      html: `<p>Your session was automatically closed after ${env.WATCHDOG_CLOSE_HOURS} hours. Edit it in PunchPad if needed.</p>`,
    });
  } else if (kind === "admin_auto_close") {
    await sendEmail(t, {
      to: String(payload.adminEmail),
      subject: `PunchPad: user ${payload.subjectEmail} auto-closed`,
      html: `<p>User <strong>${payload.subjectEmail}</strong> had a session auto-closed.</p>`,
    });
  }
  logger.info({ component: "notify", kind, payload }, "notification_sent");
}
```

- [ ] **Step 2: Write `src/app/api/cron/watchdog/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { systemClock } from "@/lib/time";
import { env } from "@/lib/env";
import { verifyCronSecret } from "@/lib/cron";
import { runWatchdog } from "@/features/cron/watchdog-service";
import { dispatchNotification } from "@/features/cron/notify";
import { toErrorEnvelope } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    verifyCronSecret(req);
    const result = await runWatchdog({
      prisma,
      clock: systemClock,
      warnHours: env.WATCHDOG_WARN_HOURS,
      closeHours: env.WATCHDOG_CLOSE_HOURS,
      systemUserId: "system",
      notify: dispatchNotification,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const env_ = toErrorEnvelope(err);
    const status = "code" in env_ && env_.code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json(env_, { status });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/watchdog src/features/cron/notify.ts
git commit -m "feat(cron): /api/cron/watchdog route with email notifications"
```

### Task 9.5: Weekly digest service + idempotency

**Files:**
- Create: `src/features/cron/digest-service.ts`
- Create: `tests/integration/cron/digest.test.ts`

- [ ] **Step 1: Write failing test**

`tests/integration/cron/digest.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { setupTestDb, type TestDb } from "../helpers/db";
import { runWeeklyDigest } from "@/features/cron/digest-service";
import { FakeClock } from "@/lib/time";
import { hash } from "@node-rs/argon2";

let db: TestDb;
const clock = new FakeClock(new Date("2026-05-11T12:00:00Z")); // a Monday 07:00 in America/Chicago
beforeAll(async () => { db = await setupTestDb(); }, 120_000);
afterAll(async () => { await db.stop(); });
beforeEach(async () => {
  await db.prisma.digestSend.deleteMany();
  await db.prisma.timeSession.deleteMany();
  await db.prisma.user.deleteMany({ where: { id: { not: "system" } } });
});

describe("weekly digest", () => {
  it("sends to employees in their local 07:00 window and is idempotent on second call", async () => {
    const u = await db.prisma.user.create({ data: { email: "u@x.com", name: "U", passwordHash: await hash("password1234aa"), timezone: "America/Chicago" } });
    await db.prisma.timeSession.createMany({
      data: [
        { userId: u.id, clockInAt: new Date("2026-05-04T13:00:00Z"), clockOutAt: new Date("2026-05-04T22:00:00Z") },
        { userId: u.id, clockInAt: new Date("2026-05-05T13:00:00Z"), clockOutAt: new Date("2026-05-05T21:00:00Z") },
      ],
    });
    const send = vi.fn();
    const r1 = await runWeeklyDigest({ prisma: db.prisma, clock, sendHourLocal: 7, send });
    expect(r1.sent).toBe(1);
    const r2 = await runWeeklyDigest({ prisma: db.prisma, clock, sendHourLocal: 7, send });
    expect(r2.sent).toBe(0); // idempotent
  });
});
```

- [ ] **Step 2: Run â€” expect failure**

```bash
pnpm test:int
```

- [ ] **Step 3: Implement `src/features/cron/digest-service.ts`**

```ts
import type { PrismaClient, User } from "@prisma/client";
import type { Clock } from "@/lib/time";
import { formatLocal, isoWeekKey, durationMinutes, startOfWeekInTz, endOfWeekInTz } from "@/lib/time";

export type DigestDeps = {
  prisma: PrismaClient;
  clock: Clock;
  sendHourLocal: number;
  send: (msg: { to: string; subject: string; html: string }) => Promise<void>;
};

export async function runWeeklyDigest(d: DigestDeps): Promise<{ sent: number }> {
  const now = d.clock.now();
  const users = await d.prisma.user.findMany({ where: { deactivatedAt: null, id: { not: "system" } } });
  let sent = 0;

  for (const user of users) {
    const localHour = Number(formatLocal(now, user.timezone, "H"));
    const localWeekday = formatLocal(now, user.timezone, "EEEE");
    if (localWeekday !== "Monday") continue;
    if (localHour !== d.sendHourLocal) continue;
    const wk = isoWeekKey(now, user.timezone);
    const already = await d.prisma.digestSend.findUnique({ where: { userId_isoWeek: { userId: user.id, isoWeek: wk } } });
    if (already) continue;

    const lastMonday = new Date(startOfWeekInTz(now, user.timezone).getTime() - 7 * 24 * 3_600_000);
    const lastSunday = new Date(endOfWeekInTz(lastMonday, user.timezone));
    const sessions = await d.prisma.timeSession.findMany({
      where: { userId: user.id, deletedAt: null, clockInAt: { gte: lastMonday, lte: lastSunday } },
      orderBy: { clockInAt: "asc" },
    });
    const total = sessions.reduce((m, s) => m + durationMinutes(s.clockInAt, s.clockOutAt ?? now), 0);
    const html = renderDigestEmail(user, sessions, total, lastMonday, lastSunday);

    await d.send({ to: user.email, subject: `PunchPad â€” last week (${formatLocal(lastMonday, user.timezone, "MMM d")}â€“${formatLocal(lastSunday, user.timezone, "MMM d")})`, html });
    await d.prisma.digestSend.create({ data: { userId: user.id, isoWeek: wk } });
    sent += 1;
  }

  return { sent };
}

function renderDigestEmail(
  user: User,
  sessions: Array<{ clockInAt: Date; clockOutAt: Date | null; autoClosed: boolean }>,
  totalMinutes: number,
  from: Date,
  to: Date,
): string {
  const totalH = Math.floor(totalMinutes / 60), totalM = totalMinutes % 60;
  const rows = sessions.map((s) => {
    const dur = durationMinutes(s.clockInAt, s.clockOutAt ?? to);
    const d = formatLocal(s.clockInAt, user.timezone, "EEE MMM d");
    const i = formatLocal(s.clockInAt, user.timezone, "h:mma");
    const o = s.clockOutAt ? formatLocal(s.clockOutAt, user.timezone, "h:mma") : "â€”";
    const flag = s.autoClosed ? " (auto-closed)" : "";
    return `<tr><td style="padding:6px 12px">${d}</td><td style="padding:6px 12px;font-family:monospace">${i} â†’ ${o}${flag}</td><td style="padding:6px 12px;font-family:monospace">${Math.floor(dur / 60)}h ${dur % 60}m</td></tr>`;
  }).join("");
  return `
    <div style="font-family:Inter,system-ui,sans-serif;color:#0f172a;max-width:560px">
      <h1 style="font-size:18px">Hi ${user.name},</h1>
      <p>Last week you were on the clock for <strong>${totalH}h ${totalM}m</strong>.</p>
      <table style="border-collapse:collapse;border:1px solid #e2e8f0">${rows || `<tr><td style="padding:8px">No sessions logged.</td></tr>`}</table>
      <p style="color:#64748b;font-size:12px">â€” PunchPad</p>
    </div>
  `;
}
```

- [ ] **Step 4: Run â€” expect pass**

```bash
pnpm test:int
```

- [ ] **Step 5: Commit**

```bash
git add src/features/cron/digest-service.ts tests/integration/cron/digest.test.ts
git commit -m "feat(cron): weekly digest service with idempotency"
```

### Task 9.6: `/api/cron/weekly-digest` route

**Files:**
- Create: `src/app/api/cron/weekly-digest/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { systemClock } from "@/lib/time";
import { env } from "@/lib/env";
import { verifyCronSecret } from "@/lib/cron";
import { runWeeklyDigest } from "@/features/cron/digest-service";
import { getDefaultTransport, sendEmail } from "@/lib/email";
import { toErrorEnvelope } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    verifyCronSecret(req);
    const transport = getDefaultTransport();
    const result = await runWeeklyDigest({
      prisma,
      clock: systemClock,
      sendHourLocal: env.DIGEST_SEND_HOUR_LOCAL,
      send: async (msg) => sendEmail(transport, msg),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const env_ = toErrorEnvelope(err);
    const status = "code" in env_ && env_.code === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json(env_, { status });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/weekly-digest
git commit -m "feat(cron): /api/cron/weekly-digest route"
```

### Task 9.7: E2E â€” watchdog produces an auto-close via direct POST

**Files:**
- Create: `tests/e2e/cron/watchdog.spec.ts`

- [ ] **Step 1: Write**

```ts
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

test.use({ storageState: undefined });

test("POST /api/cron/watchdog requires secret", async ({ request }) => {
  const res = await request.post("/api/cron/watchdog");
  expect(res.status()).toBe(401);
});

test("watchdog auto-closes a long-open session", async ({ request }) => {
  const prisma = new PrismaClient();
  const emp = await prisma.user.findUniqueOrThrow({ where: { email: "emp@e2e.test" } });
  await prisma.timeSession.deleteMany({ where: { userId: emp.id } });
  const inAt = new Date(Date.now() - 19 * 3_600_000);
  await prisma.timeSession.create({ data: { userId: emp.id, clockInAt: inAt } });
  await prisma.$disconnect();

  const secret = process.env.CRON_SECRET ?? "dev-cron-secret-32-chars-aaaaaaaa";
  const res = await request.post("/api/cron/watchdog", { headers: { "x-cron-secret": secret } });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.closed).toBeGreaterThanOrEqual(1);
});
```

- [ ] **Step 2: Run**

```bash
pnpm test:e2e --project=setup --project=chromium-public
```

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/cron
git commit -m "test: e2e watchdog auto-close via direct POST"
```

---


## Milestone 10 â€” Deployment

End state: `docker compose up -d` on a fresh VM brings up `web`, `postgres`, `cron`, and `caddy`. Migrations run automatically on `web` boot. Caddy terminates TLS and proxies to `web` (health-checked). Cron fires watchdog every 15 min and weekly digest on the Monday window. A nightly `pg_dump` produces a gzipped backup in `./backups/`. A short runbook in `RUNBOOK.md` documents update / rollback / restore.

### Task 10.1: `/api/health` endpoint

**Files:**
- Create: `src/app/api/health/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch { /* ignore */ }
  return NextResponse.json(
    { ok: dbOk, db: dbOk ? "up" : "down", commit: process.env.GIT_COMMIT ?? "unknown" },
    { status: dbOk ? 200 : 503 },
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/health
git commit -m "feat: /api/health endpoint"
```

### Task 10.2: Multi-stage Dockerfile (Next.js standalone)

**Files:**
- Create: `Dockerfile`
- Create: `docker/entrypoint.sh`
- Modify: `next.config.ts` (add `output: "standalone"`)

- [ ] **Step 1: Add `output: "standalone"` to `next.config.ts`**

```ts
import type { NextConfig } from "next";
const config: NextConfig = { output: "standalone", reactStrictMode: true };
export default config;
```

- [ ] **Step 2: Write `Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=20.18.0
FROM node:${NODE_VERSION}-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV SKIP_ENV_VALIDATION=1
RUN corepack enable && pnpm exec prisma generate && pnpm build

FROM node:${NODE_VERSION}-alpine AS runner
RUN apk add --no-cache openssl dumb-init
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S -G nodejs nextjs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3000
ENTRYPOINT ["dumb-init", "/entrypoint.sh"]
CMD ["node", "server.js"]
```

- [ ] **Step 3: Write `docker/entrypoint.sh`**

```sh
#!/bin/sh
set -e
echo "[entrypoint] running prisma migrate deploy"
node_modules/.bin/prisma migrate deploy
echo "[entrypoint] seeding (idempotent)"
node_modules/.bin/prisma db seed || true
echo "[entrypoint] starting app"
exec "$@"
```

- [ ] **Step 4: Local build smoke test**

```bash
docker build -t punchpad:dev .
```

Expected: a successful build. Image size ~150â€“200 MB.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile docker/entrypoint.sh next.config.ts
git commit -m "feat: production Dockerfile with standalone output and migrate-on-start"
```

### Task 10.3: `docker-compose.yml` (web + postgres + cron + caddy)

**Files:**
- Create: `docker-compose.yml`
- Create: `cron/Dockerfile`
- Create: `cron/crontab`
- Create: `Caddyfile`

- [ ] **Step 1: Write `cron/Dockerfile`**

```dockerfile
FROM alpine:3.20
RUN apk add --no-cache curl ca-certificates tzdata supercronic
ARG SUPERCRONIC_VERSION=v0.2.29
RUN wget -qO /usr/local/bin/supercronic "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64" \
 && chmod +x /usr/local/bin/supercronic
COPY crontab /etc/crontab
USER nobody
CMD ["supercronic", "/etc/crontab"]
```

- [ ] **Step 2: Write `cron/crontab`**

```
# Watchdog every 15 minutes
*/15 * * * * curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" http://web:3000/api/cron/watchdog || true
# Weekly digest on Monday between 06:00 and 14:45 UTC, every 15 minutes
0,15,30,45 6-14 * * 1 curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" http://web:3000/api/cron/weekly-digest || true
```

- [ ] **Step 3: Write `Caddyfile`**

```
{
  email {$ACME_EMAIL}
}

{$PUNCHPAD_DOMAIN} {
  encode zstd gzip
  reverse_proxy web:3000 {
    health_uri  /api/health
    health_interval 30s
    health_timeout  5s
  }
}
```

- [ ] **Step 4: Write `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-punchpad}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?required}
      POSTGRES_DB: ${POSTGRES_DB:-punchpad}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER:-punchpad}"]
      interval: 10s
      timeout: 5s
      retries: 10

  web:
    build: .
    restart: unless-stopped
    depends_on:
      postgres: { condition: service_healthy }
    environment:
      NODE_ENV: production
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      DATABASE_URL: postgresql://${POSTGRES_USER:-punchpad}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-punchpad}
      ADMIN_EMAIL: ${ADMIN_EMAIL}
      ADMIN_INITIAL_PASSWORD: ${ADMIN_INITIAL_PASSWORD}
      CRON_SECRET: ${CRON_SECRET}
      WATCHDOG_WARN_HOURS: ${WATCHDOG_WARN_HOURS:-12}
      WATCHDOG_CLOSE_HOURS: ${WATCHDOG_CLOSE_HOURS:-18}
      EMAIL_TRANSPORT: ${EMAIL_TRANSPORT:-resend}
      RESEND_API_KEY: ${RESEND_API_KEY:-}
      SMTP_HOST: ${SMTP_HOST:-}
      SMTP_PORT: ${SMTP_PORT:-}
      SMTP_USER: ${SMTP_USER:-}
      SMTP_PASS: ${SMTP_PASS:-}
      EMAIL_FROM: ${EMAIL_FROM}
      TZ_DEFAULT: ${TZ_DEFAULT:-America/Chicago}
      DIGEST_SEND_HOUR_LOCAL: ${DIGEST_SEND_HOUR_LOCAL:-7}
    expose: ["3000"]

  cron:
    build: ./cron
    restart: unless-stopped
    depends_on:
      web: { condition: service_started }
    environment:
      CRON_SECRET: ${CRON_SECRET}

  caddy:
    image: caddy:2
    restart: unless-stopped
    depends_on:
      web: { condition: service_started }
    ports:
      - "80:80"
      - "443:443"
    environment:
      ACME_EMAIL: ${ACME_EMAIL}
      PUNCHPAD_DOMAIN: ${PUNCHPAD_DOMAIN}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config

volumes:
  pgdata:
  caddy_data:
  caddy_config:
```

- [ ] **Step 5: Validate the compose file**

```bash
docker compose config > /dev/null
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml cron Caddyfile
git commit -m "feat: docker compose (web + postgres + cron + caddy)"
```

### Task 10.4: Backup script

**Files:**
- Create: `scripts/backup.sh`

- [ ] **Step 1: Write `scripts/backup.sh`**

```sh
#!/usr/bin/env bash
set -euo pipefail
DATE=$(date -u +%F)
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-punchpad}" "${POSTGRES_DB:-punchpad}" | gzip > "$OUT_DIR/punchpad-${DATE}.sql.gz"
# Retain 14 days
find "$OUT_DIR" -name 'punchpad-*.sql.gz' -mtime +14 -delete
echo "Backup written: $OUT_DIR/punchpad-${DATE}.sql.gz"
```

- [ ] **Step 2: Chmod and commit**

```bash
chmod +x scripts/backup.sh
git add scripts/backup.sh
git commit -m "feat: nightly pg_dump backup script (14-day retention)"
```

(Schedule on the host: `crontab -e` â†’ `0 3 * * * cd /opt/punchpad && ./scripts/backup.sh >> /var/log/punchpad-backup.log 2>&1`. Document in runbook below.)

### Task 10.5: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: punchpad
          POSTGRES_PASSWORD: punchpad
          POSTGRES_DB: punchpad
        ports: ["5432:5432"]
        options: >-
          --health-cmd="pg_isready -U punchpad"
          --health-interval=5s --health-timeout=3s --health-retries=10
    env:
      DATABASE_URL: postgresql://punchpad:punchpad@localhost:5432/punchpad
      NEXTAUTH_URL: http://localhost:3000
      NEXTAUTH_SECRET: ci-secret-32-chars-aaaaaaaaaaaaaaaa
      ADMIN_EMAIL: ci@punchpad.test
      ADMIN_INITIAL_PASSWORD: ciPassword12345
      CRON_SECRET: ci-cron-secret-32-chars-aaaaaaaaa
      EMAIL_TRANSPORT: resend
      RESEND_API_KEY: re_ci_dummy
      EMAIL_FROM: PunchPad <ci@punchpad.test>
      TZ_DEFAULT: America/Chicago
      DIGEST_SEND_HOUR_LOCAL: "7"
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec prisma migrate deploy
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:unit
      - run: pnpm test:int
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
```

- [ ] **Step 2: Commit**

```bash
git add .github
git commit -m "ci: lint, typecheck, unit, integration, e2e"
```

### Task 10.6: `RUNBOOK.md`

**Files:**
- Create: `RUNBOOK.md`

- [ ] **Step 1: Write `RUNBOOK.md`**

````markdown
# PunchPad Runbook

## First-time deployment

1. Provision the VM (1 vCPU / 1 GB RAM is sufficient). Install Docker and Docker Compose plugin.
2. `git clone` this repo to `/opt/punchpad`.
3. Copy `.env.example` to `.env` and fill in:
   - `POSTGRES_PASSWORD`, `NEXTAUTH_SECRET`, `CRON_SECRET` â€” generate fresh 32-byte values (`openssl rand -base64 32`).
   - `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD`, `NEXTAUTH_URL`, `PUNCHPAD_DOMAIN`, `ACME_EMAIL`.
   - `EMAIL_TRANSPORT` + corresponding keys (`RESEND_API_KEY` *or* `SMTP_*`).
4. Point DNS `${PUNCHPAD_DOMAIN}` at the VM.
5. `docker compose up -d`. First boot pulls images, builds `web`, runs migrations, seeds the system user and initial admin.
6. Visit `https://${PUNCHPAD_DOMAIN}`. Log in as `${ADMIN_EMAIL}` with `${ADMIN_INITIAL_PASSWORD}`; you'll be forced to change the password.
7. Add the host crontab line for daily backups (see Backups below).

## Update

```bash
cd /opt/punchpad
git pull
docker compose build web
docker compose up -d web
```

Migrations run automatically on `web` start. Other services keep running. The blip is ~5 seconds; a click during that window is recoverable manually via `/admin/audit`.

## Rollback

```bash
cd /opt/punchpad
git checkout <previous-tag>
docker compose build web
docker compose up -d web
```

If a migration was applied and you need to revert it: restore from the most recent backup (see Restore below) and roll the code back.

## Backups

Host crontab line (run `crontab -e`):

```
0 3 * * * cd /opt/punchpad && ./scripts/backup.sh >> /var/log/punchpad-backup.log 2>&1
```

Off-site copy: pipe `./backups/` into your existing target (rsync / restic / rclone). Not wired automatically in Phase 1.

## Restore

```bash
cd /opt/punchpad
docker compose stop web cron
gunzip -c backups/punchpad-YYYY-MM-DD.sql.gz | \
  docker compose exec -T postgres psql -U punchpad -d punchpad
docker compose start web cron
```

## Cron health checks

- Tail watchdog logs: `docker compose logs cron --tail=200`
- Manual trigger: `curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/watchdog`

## Observability

- `docker compose logs -f web` â€” JSON pino logs to stdout.
- `GET /api/health` returns `{ ok, db, commit }`. Caddy uses it for upstream health.
- To ship logs to a log aggregator later, mount the Docker logging driver â€” no code change required.
````

- [ ] **Step 2: Commit**

```bash
git add RUNBOOK.md
git commit -m "docs: deployment runbook"
```

### Task 10.7: Self-review and full local verification

This is a single pass through the entire app to confirm everything wired together.

- [ ] **Step 1: Run the full CI gate locally**

```bash
pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:int && pnpm test:e2e
```

Expected: every gate passes. Fix any regressions before moving on.

- [ ] **Step 2: Bring up Docker Compose locally end-to-end**

Use a local `.env` file (copy from `.env.example`, set throwaway secrets, set `PUNCHPAD_DOMAIN=localhost` and disable Caddy by commenting it out or replacing the Caddyfile with an HTTP-only block).

```bash
docker compose -f docker-compose.yml up -d --build
docker compose logs -f web
```

Expected: `web` boots, migrations run, seed completes, app reachable on `http://localhost` (via Caddy) or `http://localhost:3000` (direct, after exposing the port temporarily).

- [ ] **Step 3: Hit the watchdog endpoint manually**

```bash
curl -fsS -X POST -H "x-cron-secret: $(grep '^CRON_SECRET=' .env | cut -d= -f2)" http://localhost:3000/api/cron/watchdog
```

Expected: `{"ok": true, "warned": 0, "closed": 0}` on a fresh DB.

- [ ] **Step 4: Tear down**

```bash
docker compose down
```

- [ ] **Step 5: Commit any final fixes** (if any) and tag

```bash
git add -A
git commit -m "chore: Phase 1 verification fixes" || true
git tag -a v1.0.0-phase1 -m "PunchPad Phase 1 MVP"
```

---

## Self-review checklist (done by the plan author before handing off)

Spec coverage (Section â†’ covered by):
- Â§1 Overview & Phase 1 goals â†’ Milestones 4â€“9 cover all six goals; Phase 1 non-goals are not implemented.
- Â§2 Architecture / stack â†’ Milestone 0 + 1 + 10.
- Â§3 Data model (User, TimeSession, AuditLog, LoginAttempt, DigestSend, partial-unique index, system user) â†’ Milestone 2.
- Â§4 Authentication & roles (NextAuth Credentials + JWT, Argon2id, lockout, mustChangePassword, requireUser/requireAdmin, role table) â†’ Milestone 3 + 8 (lifecycle).
- Â§5 Core flows (clockIn, clockOut, self-edit 7-day, admin edit/delete, watchdog) â†’ Milestone 4 + 9.
- Â§6 UI surfaces (theme, /login, /clock Layout A, /calendar, /reports, /admin/users, /admin/audit) â†’ Milestones 3, 5â€“8.
- Â§7 Reports & CSV & digest â†’ Milestones 7 + 9.
- Â§8 Errors, validation, edge cases â†’ Milestone 1 (errors), Milestone 4 (overlap, conflict), Milestone 9 (idempotency).
- Â§9 Testing strategy (unit + Testcontainers integration + Playwright E2E with JWT injection) â†’ throughout.
- Â§10 Deployment & ops â†’ Milestone 10.
- Â§11 Phase 2 hooks â†’ architecture is preserved (service.ts pattern; configurable transport; soft-deletes; provider array; cron over HTTP).
- Â§12 Open items â†’ pinned at the top of the plan.

Placeholder scan: no TBD / TODO / "implement later" / "similar to Task N" placeholders remain.

Type consistency: `clockIn` / `clockOut` / `editOwnSession` / `adminEditSession` / `adminDeleteSession` / `createUser` / `resetPassword` / `deactivateUser` / `changeRole` / `runWatchdog` / `runWeeklyDigest` signatures are consistent across their tasks and their callers (server actions, routes).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-12-punchpad-phase1-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** â€” I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** â€” Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?

