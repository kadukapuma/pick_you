/**
 * Developer Logger Utility
 * For debugging and monitoring API calls
 */

interface LogContext {
  screen?: string;
  action?: string;
  [key: string]: any;
}

/**
 * Log API error with full context
 * @param error - Error object
 * @param context - Additional context
 */
export const logApiError = (error: any, context?: LogContext): void => {
  if (__DEV__) {
    console.log("\n=========== API ERROR ===========");
    console.log({
      timestamp: new Date().toISOString(),
      screen: context?.screen || "Unknown",
      action: context?.action || "API Call",
      status: error?.response?.status,
      code: error?.response?.data?.code,
      endpoint: error?.config?.url,
      method: error?.config?.method,
      message: error?.response?.data?.message || error?.message,
      errors: error?.response?.data?.errors,
      payload: error?.config?.data,
      ...context,
    });
    console.log("==================================\n");
  }
};

/**
 * Log API success with context
 * @param message - Success message
 * @param context - Additional context
 */
export const logApiSuccess = (message: string, context?: LogContext): void => {
  if (__DEV__) {
    console.log("\n========== API SUCCESS ===========");
    console.log({
      timestamp: new Date().toISOString(),
      message,
      screen: context?.screen || "Unknown",
      action: context?.action || "API Call",
      ...context,
    });
    console.log("==================================\n");
  }
};

/**
 * Log screen lifecycle events
 * @param screen - Screen name
 * @param event - Event type (mount, unmount, action)
 * @param context - Additional context
 */
export const logScreenEvent = (
  screen: string,
  event: "MOUNT" | "UNMOUNT" | "ACTION" | "ERROR",
  context?: LogContext,
): void => {
  if (__DEV__) {
    console.log(`[${screen}] ${event}`, context);
  }
};

/**
 * Log validation errors
 * @param errors - Validation errors object
 * @param context - Additional context
 */
export const logValidationErrors = (
  errors: Record<string, any>,
  context?: LogContext,
): void => {
  if (__DEV__) {
    console.log(`[VALIDATION ERROR] ${context?.screen || "Unknown"}:`, errors);
  }
};
