import 'server-only';

export type DomainErrorCode = 'NOT_FOUND' | 'FORBIDDEN' | 'INVALID' | 'CONFLICT';

/** A generic, transport-agnostic domain error mapped to an HTTP status by `handleError`. */
export class DomainError extends Error {
  constructor(
    public code: DomainErrorCode,
    message: string
  ) {
    super(message);
  }
}
