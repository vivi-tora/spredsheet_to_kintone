export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return { statusCode: error.statusCode, message: error.message, details: error.details };
  }
  console.error('Unexpected error:', error);
  return { statusCode: 500, message: 'An unexpected error occurred' };
}
