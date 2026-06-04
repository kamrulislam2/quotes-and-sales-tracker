/**
 * Error Handler Utility
 * Centralized error management with user-friendly English messages
 */

interface ErrorInfo {
  code: string;
  userMessage: string;
  technicalMessage?: string;
  severity: 'error' | 'warning' | 'info';
}


export const errorHandler = {
  // Error message mapping
  errorMessages: {
    // Auth errors
    'auth_invalid_credentials': 'Invalid username or password.',
    'auth_user_not_found': 'User does not exist.',
    'auth_invalid_token': 'Session expired. Please login again.',
    'auth_email_exists': 'This email is already in use.',
    'auth_weak_password': 'Password is too weak.',

    // Database errors
    'db_duplicate_key': 'This information already exists.',
    'db_unique_violation': 'This value is already in use.',
    'db_not_found': 'Requested data not found.',
    'db_permission_denied': 'You do not have permission to perform this action.',

    // Network errors
    'network_timeout': 'Connection timeout. Please try again.',
    'network_offline': 'No internet connection.',
    'network_error': 'Network issue. Please try again.',

    // Validation errors
    'validation_required': 'This field is required.',
    'validation_format': 'Format is incorrect.',
    'validation_range': 'Value is out of range.',

    // Server errors
    'server_internal': 'Server error. Please try again later.',
    'server_unavailable': 'Service is currently unavailable.',
    'server_maintenance': 'Service is down for maintenance.',

    // General errors
    'unknown': 'Something went wrong. Please try again.',
    'operation_failed': 'Operation failed.',
  } as Record<string, string>,

  /**
   * Supabase error handling
   */
  handleSupabaseError: (error: unknown): ErrorInfo => {
    const err = error as { code?: string | number; message?: string } | null | undefined;
    const technicalMessage = err?.message || (error ? String(error) : '');

    // Duplicate key error
    if (err?.code === '23505' || err?.message?.includes('duplicate')) {
      return {
        code: 'db_duplicate_key',
        userMessage: 'This information already exists.',
        technicalMessage,
        severity: 'error'
      };
    }

    // Permission denied
    if (err?.code === '42501' || err?.message?.includes('permission')) {
      return {
        code: 'db_permission_denied',
        userMessage: 'You do not have permission to perform this action.',
        technicalMessage,
        severity: 'error'
      };
    }

    // Foreign key constraint
    if (err?.code === '23503' || err?.message?.includes('foreign')) {
      return {
        code: 'db_not_found',
        userMessage: 'Connected record not found.',
        technicalMessage,
        severity: 'error'
      };
    }

    // Default Supabase error
    return {
      code: 'server_error',
      userMessage: err?.message || 'A database error occurred.',
      technicalMessage,
      severity: 'error'
    };
  },

  /**
   * Network error handling
   */
  handleNetworkError: (error: unknown): ErrorInfo => {
    const err = error as { code?: string | number; message?: string } | null | undefined;
    const message = err?.message || '';

    if (message.includes('timeout') || err?.code === 'ECONNABORTED') {
      return {
        code: 'network_timeout',
        userMessage: 'Connection timeout. Please try again.',
        technicalMessage: message,
        severity: 'error'
      };
    }

    if (!navigator.onLine) {
      return {
        code: 'network_offline',
        userMessage: 'No internet connection.',
        technicalMessage: message,
        severity: 'error'
      };
    }

    return {
      code: 'network_error',
      userMessage: 'Network issue. Please try again.',
      technicalMessage: message,
      severity: 'error'
    };
  },

  /**
   * Any error handling
   */
  handleError: (error: unknown): ErrorInfo => {
    const err = error as { code?: string | number; message?: string } | null | undefined;
    
    // Supabase error
    if (err?.code && typeof err.code === 'string') {
      return errorHandler.handleSupabaseError(error);
    }

    // Network error
    if (err?.message?.includes('fetch') || !navigator.onLine) {
      return errorHandler.handleNetworkError(error);
    }

    // Known error message
    const message = err?.message || '';
    for (const [key, value] of Object.entries(errorHandler.errorMessages)) {
      if (message.toLowerCase().includes(key)) {
        return {
          code: key,
          userMessage: value,
          technicalMessage: message,
          severity: 'error'
        };
      }
    }

    // Default error
    return {
      code: 'unknown',
      userMessage: 'Something went wrong. Please try again.',
      technicalMessage: message || (error instanceof Error ? error.message : String(error)),
      severity: 'error'
    };
  },

  /**
   * Get user-friendly message
   */
  getUserMessage: (code: string): string => {
    return errorHandler.errorMessages[code] || errorHandler.errorMessages['unknown'];
  },

  /**
   * Log error in dev mode
   */
  logError: (error: unknown, context?: string): void => {
    if (typeof window !== 'undefined' && (!process.env.NODE_ENV || process.env.NODE_ENV === 'development')) {
      console.error(`[Error] ${context || 'Unknown'}:`, error);
    }
  },

  /**
   * Success messages
   */
  getSuccessMessage: (action: string): string => {
    const messages: Record<string, string> = {
      'create': 'Created successfully.',
      'update': 'Updated successfully.',
      'delete': 'Deleted successfully.',
      'approve': 'Approved successfully.',
      'reject': 'Rejected successfully.',
      'submit': 'Submitted successfully.',
      'sync': 'Synced successfully.',
      'export': 'Exported successfully.',
    };
    return messages[action] || 'Completed successfully.';
  }
};
