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
  constructor(
    userMessage: string,
    public readonly details?: unknown,
  ) {
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
