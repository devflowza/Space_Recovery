export interface ServiceResult<T = void> {
  data: T | null;
  error: string | null;
}

export function ok<T>(data: T): ServiceResult<T> {
  return { data, error: null };
}

export function err<T = void>(message: string): ServiceResult<T> {
  return { data: null, error: message };
}

const POSTGRES_ERROR_MESSAGES: Record<string, string> = {
  '23505': 'A record with this information already exists.',
  '23503': 'This record is referenced by other records and cannot be deleted.',
  '23502': 'A required field is missing.',
  '42501': 'You do not have permission to perform this action.',
  '42P01': 'The requested resource does not exist.',
  'PGRST116': 'No record found.',
  'PGRST301': 'Too many rows returned. Please refine your query.',
};

export function getErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred';

  if (typeof error === 'string') return error;

  if (typeof error === 'object') {
    const e = error as Record<string, unknown>;

    if (typeof e.code === 'string' && POSTGRES_ERROR_MESSAGES[e.code]) {
      return POSTGRES_ERROR_MESSAGES[e.code];
    }

    if (typeof e.message === 'string') {
      const msg = e.message.toLowerCase();
      if (msg.includes('duplicate key')) return 'A record with this information already exists.';
      if (msg.includes('foreign key')) return 'This record is referenced by other records.';
      if (msg.includes('not found')) return 'The requested record was not found.';
      if (msg.includes('permission denied')) return 'You do not have permission to perform this action.';
      return e.message;
    }
  }

  return 'An unexpected error occurred. Please try again.';
}

export async function withErrorHandling<T>(
  fn: () => Promise<T>
): Promise<ServiceResult<T>> {
  try {
    const data = await fn();
    return ok(data);
  } catch (error) {
    return err(getErrorMessage(error));
  }
}
