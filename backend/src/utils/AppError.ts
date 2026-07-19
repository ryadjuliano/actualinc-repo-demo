// A thrown AppError carries an HTTP status + a user-safe message, so the
// central error middleware can respond correctly without each controller
// needing to know how to format an error response.
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
