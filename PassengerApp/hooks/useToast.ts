import { useToastContext } from "../context/ToastContext";

/**
 * Convenience hook to trigger toasts from any screen or component.
 *
 * Usage:
 *   const { showToast } = useToast();
 *   showToast("Profile updated!", "success");
 *   showToast("Something went wrong.", "error");
 *   showToast("Loading...", "info");
 */
export function useToast() {
    return useToastContext();
}
