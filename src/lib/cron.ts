import { env } from "@/lib/env";
import { UnauthorizedError } from "@/lib/errors";

export function verifyCronSecret(req: Request): void {
  const got = req.headers.get("x-cron-secret");
  if (!got || got !== env.CRON_SECRET) throw new UnauthorizedError("Cron secret invalid.");
}
