/**
 * Base application error.
 * All thrown errors in the application MUST extend AppError.
 * This enables consistent error serialization in API response handlers.
 */
export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly details: Record<string, string[]> | null

  constructor(
    message: string,
    code: string,
    statusCode: number,
    details: Record<string, string[]> | null = null,
    isOperational = true,
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}
