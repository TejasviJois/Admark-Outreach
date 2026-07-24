export class DomainError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message, 400);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends DomainError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message, 401);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends DomainError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message, 403);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super("NOT_FOUND", message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
    this.name = "ConflictError";
  }
}

export class DatabaseError extends DomainError {
  constructor(message: string) {
    super("DATABASE_ERROR", message, 500);
    this.name = "DatabaseError";
  }
}

export class ExternalServiceError extends DomainError {
  constructor(message: string) {
    super("EXTERNAL_SERVICE_ERROR", message, 502);
    this.name = "ExternalServiceError";
  }
}
