-- Enforce: a user can have at most one TimeSession with clockOutAt IS NULL
CREATE UNIQUE INDEX "one_open_session_per_user"
  ON "TimeSession" ("userId")
  WHERE "clockOutAt" IS NULL;
