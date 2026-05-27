/**
 * API Configuration
 * Reads backend URL from environment variable EXPO_PUBLIC_API_URL
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.6:8000";

export const API_CONFIG = {
  BASE_URL: `${API_URL}/api`,
  TIMEOUT: 60000, // 60 seconds - increased for backend processing & network latency
  HEADERS: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: "/passenger/auth/register",
    LOGIN: "/passenger/auth/otp/verify", // Using OTP verified login now
    LOGOUT: "/passenger/auth/logout",
    OTP_SEND: "/passenger/auth/otp/send",
    OTP_VERIFY: "/passenger/auth/otp/verify",
    GET_USER: "/user",
  },
};
