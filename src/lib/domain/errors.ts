export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function asDomainError(error: unknown): DomainError {
  if (error instanceof DomainError) return error;
  return new DomainError(error instanceof Error ? error.message : "Unexpected error", "INTERNAL_ERROR", 500);
}
