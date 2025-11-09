/**
 * Error Handling Utilities
 * Centralized error mapping and type-safe result handling
 */

// Type-safe service result
export type ServiceResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: { code: string; message: string } };

// Common error codes
export const ERROR_CODES = {
  NETWORK: 'network_error',
  PERMISSION_DENIED: 'permission_denied',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  VALIDATION: 'validation_error',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown_error',
  AUTH_REQUIRED: 'auth_required',
  RLS_VIOLATION: 'rls_violation',
} as const;

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  // Network errors
  network_error: 'Connection lost. Please check your network and try again.',
  timeout: 'Request timed out. Please try again.',

  // Permission errors
  permission_denied: 'Permission denied. Please sign in to continue.',
  auth_required: 'Please sign in to access this feature.',
  rls_violation: 'Access denied. You can only access your own data.',

  // Postgres error codes
  '42501': 'Permission denied. Please sign in to continue.', // insufficient_privilege
  'PGRST301': 'Permission denied. Please sign in to continue.', // JWT expired

  // Constraint violations
  '23505': 'This item already exists.', // unique_violation
  '23503': 'Related item not found.', // foreign_key_violation
  '23502': 'Required information is missing.', // not_null_violation

  // PostgREST codes
  PGRST116: 'No data found.',
  PGRST204: 'No results found.',

  // Generic fallback
  not_found: 'Item not found.',
  conflict: 'This action conflicts with existing data.',
  validation_error: 'Please check your input and try again.',
  unknown_error: 'Something went wrong. Please try again.',
};

/**
 * Maps Supabase/Postgres error to user-friendly message
 */
export function mapErrorMessage(error: any): string {
  if (!error) return ERROR_MESSAGES.unknown_error;

  // Network errors
  if (error.message?.includes('NetworkError') || error.message?.includes('fetch')) {
    return ERROR_MESSAGES.network_error;
  }

  if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
    return ERROR_MESSAGES.timeout;
  }

  // Postgres error codes
  const pgCode = error.code || error.error_code;
  if (pgCode && ERROR_MESSAGES[pgCode]) {
    return ERROR_MESSAGES[pgCode];
  }

  // PostgREST codes
  const pgrCode = error.code || error.status_code;
  if (pgrCode && ERROR_MESSAGES[pgrCode]) {
    return ERROR_MESSAGES[pgrCode];
  }

  // Use error message if it's user-friendly (not a stack trace or code)
  if (error.message && !error.message.includes('Error:') && error.message.length < 150) {
    return error.message;
  }

  // Default fallback
  return ERROR_MESSAGES.unknown_error;
}

/**
 * Maps error to standardized code and message
 */
export function mapError(error: any): { code: string; message: string } {
  const message = mapErrorMessage(error);

  // Determine error code
  let code = ERROR_CODES.UNKNOWN;

  if (error.message?.includes('NetworkError') || error.message?.includes('fetch')) {
    code = ERROR_CODES.NETWORK;
  } else if (error.code === '42501' || error.code === 'PGRST301') {
    code = ERROR_CODES.PERMISSION_DENIED;
  } else if (error.code === '23505') {
    code = ERROR_CODES.CONFLICT;
  } else if (error.message?.includes('timeout')) {
    code = ERROR_CODES.TIMEOUT;
  } else if (error.message?.includes('not found')) {
    code = ERROR_CODES.NOT_FOUND;
  }

  return { code, message };
}

/**
 * Wraps a service call in try-catch and returns typed result
 */
export async function wrapServiceCall<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<ServiceResult<T>> {
  try {
    const data = await fn();
    return { success: true, data, error: null };
  } catch (err: any) {
    const error = mapError(err);
    if (context) {
      console.warn(`[${context}] error:`, error);
    }
    return { success: false, data: null, error };
  }
}

/**
 * Asserts a result is successful and unwraps data, or throws
 */
export function unwrapResult<T>(result: ServiceResult<T>): T {
  if (!result.success) {
    const err = new Error(result.error.message) as Error & { code: string };
    err.code = result.error.code;
    throw err;
  }
  return result.data;
}
