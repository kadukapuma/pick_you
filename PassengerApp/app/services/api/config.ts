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

// Development mode flag
export const IS_DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === "true";

// Mock user for development
export const MOCK_USER = {
  id: 999,
  first_name: "Dev",
  last_name: "User",
  phone: "+1234567890",
  email: "dev@pickme.com",
  role: "passenger" as const,
  is_active: true,
  created_at: new Date().toISOString(),
  passenger: {
    id: 999,
    wallet_balance: 5000,
  },
};

// Mock token for development
export const MOCK_TOKEN = "dev-token-xyz123-no-auth";

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: "/passenger/auth/register",
    LOGIN: "/passenger/auth/otp/verify", // Using OTP verified login now
    LOGOUT: "/passenger/auth/logout",
    OTP_SEND: "/passenger/auth/otp/send",
    OTP_VERIFY: "/passenger/auth/otp/verify",
    GET_USER: "/user",
    GET_PROFILE: "/user",
  },
  PASSENGER: {
    PROFILE: "/passenger/profile",
    UPDATE_PROFILE: "/passenger/profile",
    PROFILE_PICTURE: "/passenger/profile-picture",
  },
};
