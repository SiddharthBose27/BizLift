import { AppError } from "../utils/appError.js";

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    code: "ROUTE_NOT_FOUND",
    message: `Route ${req.method} ${req.path} not found.`,
    requestId: req.context?.requestId,
  });
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  const status = Number(error?.status) || 500;
  const operational = error instanceof AppError || error?.isOperational;
  const message = operational ? error.message : "Internal server error.";

  if (status >= 500) {
    console.error("Unhandled API error", {
      requestId: req.context?.requestId,
      method: req.method,
      path: req.path,
      error: error?.stack || error,
    });
  }

  const payload = {
    success: false,
    code: error?.code || (status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR"),
    message,
    requestId: req.context?.requestId,
  };

  if (operational && error.details !== undefined) payload.details = error.details;
  return res.status(status).json(payload);
};
