/**
 * Utility to extract user-friendly error messages from any full-stack/API or network error.
 */
export function getErrorMessage(error: any): string {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  // Handle manual/simple string error
  if (typeof error === 'string') {
    return error;
  }

  // Check if browser is offline
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    return 'You are offline. Please check your internet connection.';
  }

  // Handle Axios response errors
  if (error.response) {
    const data = error.response.data;

    // Check for standardized API response schema
    if (data && typeof data === 'object') {
      if (data.message) {
        if (Array.isArray(data.message)) {
          return data.message[0];
        }
        return data.message;
      }
      
      // Fallback on standard error codes
      if (data.errorCode) {
        switch (data.errorCode) {
          case 'VALIDATION_ERROR':
            return 'Please review the fields and try again.';
          case 'UNAUTHORIZED':
            return 'Your session has expired. Please log in again.';
          case 'FORBIDDEN':
            return 'You do not have permission to perform this action.';
          case 'NOT_FOUND':
            return 'Requested resource could not be found.';
          case 'CONFLICT':
            return 'This record already exists.';
          case 'RATE_LIMIT_ERROR':
            return 'Too many requests. Please slow down.';
          case 'DATABASE_ERROR':
          case 'INTERNAL_SERVER_ERROR':
            return 'A server error occurred. Our developers have been notified.';
        }
      }
    }

    // Fallback based on HTTP status code if no error payload is present
    const status = error.response.status;
    switch (status) {
      case 400:
        return 'Invalid request details. Please check your input.';
      case 401:
        return 'Unauthorized. Please login to continue.';
      case 403:
        return 'Access denied. You do not have permission.';
      case 404:
        return 'Resource not found.';
      case 408:
      case 504:
        return 'The server took too long to respond. Please try again.';
      case 429:
        return 'Too many requests. Please wait a moment.';
      case 500:
      default:
        return 'Something went wrong on the server. Please try again.';
    }
  }

  // Handle Axios request timeout/no response errors
  if (error.request) {
    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      return 'The request timed out. Please check your network and try again.';
    }
    return 'No response from server. Please check if the backend is running.';
  }

  // Fallback to error message
  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}
