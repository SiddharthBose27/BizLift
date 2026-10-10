export class AppError extends Error {
  constructor(message, status = 500, code = "INTERNAL_ERROR", details = undefined) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

export const badRequest = (message, details) => new AppError(message, 400, "BAD_REQUEST", details);
export const unauthorized = (message = "Authentication required.") => new AppError(message, 401, "UNAUTHORIZED");
export const forbidden = (message = "Access denied.") => new AppError(message, 403, "FORBIDDEN");
export const notFound = (message = "Resource not found.") => new AppError(message, 404, "NOT_FOUND");
