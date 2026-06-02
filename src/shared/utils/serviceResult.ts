export type ServiceErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'DB_ERROR'
  | 'CONFLICT'
  | 'UNKNOWN'

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: ServiceErrorCode }
