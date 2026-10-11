/** Application-level error with a stable code the UI can branch on. */
export class AppError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(message: string, code = 'UNKNOWN', status?: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

export const ErrorCodes = {
  NETWORK: 'NETWORK_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_PIN: 'INVALID_PIN',
  INVALID_INPUT: 'INVALID_INPUT',
  SOLD_OUT: 'SOLD_OUT',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  SERVER: 'SERVER_ERROR',
} as const;

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toUserMessage(error: unknown): string {
  if (isAppError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}