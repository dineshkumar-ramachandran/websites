export class AppError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;
  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  fields: Record<string, string>;
  constructor(fields: Record<string, string>, message = "Please correct the highlighted fields.") {
    super(400, "validation_error", message, { fields });
    this.fields = fields;
  }
}

/** Raised when the requested hall/time is no longer available. */
export class UnavailableError extends AppError {
  constructor(message = "Sorry, this time is no longer available for this hall.", details?: Record<string, unknown>) {
    super(409, "unavailable", message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found.") {
    super(404, "not_found", message);
  }
}
