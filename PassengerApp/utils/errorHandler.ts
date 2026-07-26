/**
 * Professional Error Handler
 * Separates user-facing messages from developer logs
 */

export interface ApiError {
  status?: number;
  code?: string;
  message?: string;
  errors?: Record<string, string[]>;
  endpoint?: string;
  method?: string;
  payload?: any;
}

/**
 * Maps backend error codes to user-friendly messages
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  EMAIL_EXISTS: "This email is already registered.",
  INVALID_CREDENTIALS: "Incorrect email or password.",
  USER_NOT_FOUND: "User account not found.",
  ACCOUNT_SUSPENDED: "Your account has been suspended. Please contact support.",

  // Validation errors
  INVALID_EMAIL: "Please enter a valid email address.",
  WEAK_PASSWORD: "Password must be at least 8 characters.",
  PASSWORD_MISMATCH: "Passwords do not match.",
  REQUIRED_FIELD: "Please fill in all required fields.",

  // Network errors
  NETWORK_ERROR: "No internet connection. Please check your network.",
  TIMEOUT: "Request timed out. Please try again.",
  SERVER_ERROR: "Server error. Please try again later.",

  // OTP errors
  OTP_INVALID: "Invalid OTP code. Please try again.",
  OTP_EXPIRED: "OTP has expired. Please request a new code.",
  OTP_FAILED: "Failed to send OTP. Please try again.",

  // Default
  UNKNOWN_ERROR: "Something went wrong. Please try again.",
};

/**
 * Get user-friendly error message
 * @param error - Error object from API or system
 * @returns User-friendly error message
 */
export const getUserFriendlyError = (error: any): string => {
  // Check for error code
  const code = error?.code || error?.response?.data?.code;
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }

  // Check for validation errors
  if (error?.response?.data?.errors) {
    const errors = error.response.data.errors;
    const firstError = Object.values(errors)[0];
    if (Array.isArray(firstError) && firstError.length > 0) {
      return String(firstError[0]);
    }
  }

  if (error?.errors) {
    const errors = error.errors;
    const firstError = Object.values(errors)[0];
    if (Array.isArray(firstError) && firstError.length > 0) {
      return String(firstError[0]);
    }
    if (typeof firstError === "string") {
      return firstError;
    }
  }

  // Check for custom message
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  // Check for direct error message
  if (error?.message) {
    if (error.message.includes("Network")) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    if (error.message.includes("timeout")) {
      return ERROR_MESSAGES.TIMEOUT;
    }
    return error.message;
  }

  // Check for status codes
  const status = error?.response?.status;
  if (status === 422) {
    return "Please check your input and try again.";
  }
  if (status === 401 || status === 403) {
    return "Authentication failed. Please try again.";
  }
  if (status === 404) {
    return "Resource not found.";
  }
  if (status >= 500) {
    return ERROR_MESSAGES.SERVER_ERROR;
  }

  return ERROR_MESSAGES.UNKNOWN_ERROR;
};

/**
 * Extract validation errors from API response
 * @param error - Error object from API
 * @returns Record of field-level errors
 */
export const getValidationErrors = (error: any): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (error?.response?.data?.errors) {
    const backendErrors = error.response.data.errors;

    for (const [field, messages] of Object.entries(backendErrors)) {
      if (Array.isArray(messages) && messages.length > 0) {
        errors[field] = String(messages[0]);
      }
    }
  }

  if (error?.errors) {
    const backendErrors = error.errors;

    for (const [field, messages] of Object.entries(backendErrors)) {
      if (Array.isArray(messages) && messages.length > 0) {
        errors[field] = String(messages[0]);
      } else if (typeof messages === "string") {
        errors[field] = messages;
      }
    }
  }

  return errors;
};

/**
 * Format error for developer logging
 * @param error - Error object
 * @param context - Additional context
 * @returns Formatted error log
 */
export const formatErrorLog = (
  error: any,
  context?: { endpoint?: string; payload?: any },
): Record<string, any> => {
  return {
    timestamp: new Date().toISOString(),
    status: error?.response?.status,
    code: error?.code || error?.response?.data?.code,
    message: error?.response?.data?.message || error?.message,
    endpoint: context?.endpoint || error?.config?.url,
    method: error?.config?.method,
    payload: context?.payload,
    response: error?.response?.data,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "N/A",
  };
};
