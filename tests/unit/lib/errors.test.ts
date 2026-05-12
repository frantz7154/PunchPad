import { describe, it, expect } from "vitest";
import {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  NotFoundError,
  ServiceUnavailableError,
  toErrorEnvelope,
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
    expect(toErrorEnvelope(new Error("boom"))).toEqual({
      ok: false,
      code: "INTERNAL",
      message: "An unexpected error occurred.",
    });
  });
});
