/**
 * Maps raw backend/network error strings to friendly user-facing messages.
 * Never show raw API paths or JSON to the user — pass errors through here first.
 *
 * Usage:
 *   import { getFriendlyError } from "../../utils/errorMessages";
 *   showToast(getFriendlyError(result.message), "error");
 */
export function getFriendlyError(raw?: string): string {
    if (!raw) return "Something went wrong. Please try again.";

    const msg = raw.toLowerCase();

    if (msg.includes("otp") && (msg.includes("expired") || msg.includes("invalid"))) {
        return "Your OTP has expired or is invalid. Please request a new one.";
    }
    if (msg.includes("unauthenticated") || msg.includes("unauthorized")) {
        return "Your session has expired. Please sign in again.";
    }
    if (msg.includes("network") || msg.includes("timeout") || msg.includes("fetch")) {
        return "No internet connection. Please check your network.";
    }
    if (msg.includes("phone") && msg.includes("not found")) {
        return "Phone number not found. Please register first.";
    }
    if (msg.includes("already") && msg.includes("registered")) {
        return "This phone number is already registered.";
    }
    if (msg.includes("too many") || msg.includes("throttl")) {
        return "Too many attempts. Please wait a moment and try again.";
    }
    if (msg.includes("server") || msg.includes("500")) {
        return "Server error. Please try again in a moment.";
    }

    return "Something went wrong. Please try again.";
}

/**
 * Friendly messages for specific success actions.
 */
export const SuccessMessages = {
    LOGIN: "Welcome back! You're signed in.",
    REGISTER: "Account created! Let's get started.",
    OTP_RESENT: "A new OTP has been sent to your number.",
    PROFILE_SAVED: "Your profile has been updated.",
    RIDE_BOOKED: "Your ride has been booked!",
    ADDRESS_SAVED: "Address saved successfully.",
    LOGOUT: "You've been signed out.",
} as const;
