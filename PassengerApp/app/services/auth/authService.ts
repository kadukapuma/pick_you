import { apiClient } from "../api/apiClient";
import { API_ENDPOINTS } from "../api/config";
import { StorageService, StoredUser } from "./storageService";

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  role: "passenger" | "driver";
}

export interface RegisterPhonePayload {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  role: "passenger" | "driver";
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: StoredUser;
  token: string;
}

export interface RegisterResponse {
  user: StoredUser;
  token: string;
  email: string;
}

export class AuthService {
  /**
   * Register a new user with phone (simplified for OTP flow)
   * No password required - will be set later
   */
  static async registerWithPhone(payload: RegisterPhonePayload): Promise<{
    success: boolean;
    data?: RegisterResponse;
    message?: string;
    errors?: Record<string, string[]>;
  }> {
    try {
      const response = await apiClient.post<RegisterResponse>(
        API_ENDPOINTS.AUTH.REGISTER,
        payload,
      );

      return {
        success: response.success,
        data: response.data,
        message: response.message,
        errors: response.errors,
      };
    } catch (error: any) {
      console.error("Registration error:", error);
      return {
        success: false,
        message: error.message || "Registration failed",
      };
    }
  }

  /**
   * Check if a user exists by phone number
   * Returns user data if exists, null if new
   */
  static async checkUserExists(phone: string): Promise<{
    exists: boolean;
    user?: StoredUser;
    message?: string;
  }> {
    try {
      const response = await apiClient.post<{ user: StoredUser }>(
        "/auth/check-user",
        { phone },
      );

      if (response.success && response.data?.user) {
        return {
          exists: true,
          user: response.data.user,
        };
      }

      return {
        exists: false,
      };
    } catch (error: any) {
      // If endpoint doesn't exist yet, treat as new user
      return {
        exists: false,
        message: error.message,
      };
    }
  }

  /**
   * Login with phone OTP (for existing users after OTP verification)
   */
  static async loginWithPhoneOtp(
    phone: string,
    otpCode: string,
  ): Promise<{
    success: boolean;
    data?: AuthResponse;
    message?: string;
    errors?: Record<string, string[]>;
  }> {
    try {
      const response = await apiClient.post<AuthResponse>(
        API_ENDPOINTS.AUTH.OTP_VERIFY,
        {
          phone,
          otp_code: otpCode,
          purpose: "verification",
        },
      );

      if (response.success && response.data) {
        // Save token and user data
        await StorageService.saveToken(response.data.token);
        await StorageService.saveUser(response.data.user);
      }

      return {
        success: response.success,
        data: response.data,
        message: response.message,
        errors: response.errors,
      };
    } catch (error: any) {
      console.error("Login error:", error);
      return {
        success: false,
        message: error.message || "Login failed",
      };
    }
  }

  /**
   * Register a new user and send OTP (but don't auto-login)
   * Used for signup flow with OTP verification
   */
  static async registerWithOTP(payload: RegisterPayload): Promise<{
    success: boolean;
    data?: RegisterResponse;
    message?: string;
    errors?: Record<string, string[]>;
  }> {
    try {
      const response = await apiClient.post<RegisterResponse>(
        API_ENDPOINTS.AUTH.REGISTER,
        payload,
      );

      // DO NOT save token or user yet - wait for OTP verification
      // Just return the response data for OTP verification later
      return {
        success: response.success,
        data: response.data,
        message: response.message,
        errors: response.errors,
      };
    } catch (error: any) {
      console.error("Registration error:", error);
      return {
        success: false,
        message: error.message || "Registration failed",
      };
    }
  }

  /**
   * Register a new user
   */
  static async register(payload: RegisterPayload): Promise<{
    success: boolean;
    data?: AuthResponse;
    message?: string;
    errors?: Record<string, string[]>;
  }> {
    try {
      const response = await apiClient.post<AuthResponse>(
        API_ENDPOINTS.AUTH.REGISTER,
        payload,
      );

      if (response.success && response.data) {
        // Save token and user data
        await StorageService.saveToken(response.data.token);
        await StorageService.saveUser(response.data.user);
      }

      return {
        success: response.success,
        data: response.data,
        message: response.message,
        errors: response.errors,
      };
    } catch (error: any) {
      console.error("Registration error:", error);
      return {
        success: false,
        message: error.message || "Registration failed",
      };
    }
  }

  /**
   * Login user
   */
  static async login(payload: LoginPayload): Promise<{
    success: boolean;
    data?: AuthResponse;
    message?: string;
    errors?: Record<string, string[]>;
  }> {
    try {
      const response = await apiClient.post<AuthResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        payload,
      );

      if (response.success && response.data) {
        // Save token and user data
        await StorageService.saveToken(response.data.token);
        await StorageService.saveUser(response.data.user);
      }

      return {
        success: response.success,
        data: response.data,
        message: response.message,
        errors: response.errors,
      };
    } catch (error: any) {
      console.error("Login error:", error);
      return {
        success: false,
        message: error.message || "Login failed",
      };
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<{ success: boolean; message?: string }> {
    try {
      // Call logout endpoint
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);

      // Clear local storage
      await StorageService.clearAuth();

      return {
        success: true,
        message: "Logged out successfully",
      };
    } catch (error: any) {
      console.error("Logout error:", error);
      // Still clear local storage even if API call fails
      await StorageService.clearAuth();
      return {
        success: true,
        message: "Logged out",
      };
    }
  }

  /**
   * Restore authentication from stored data
   */
  static async restoreAuth(): Promise<{
    success: boolean;
    user?: StoredUser;
  }> {
    try {
      const token = await StorageService.getToken();
      const user = await StorageService.getUser();

      if (token && user) {
        return {
          success: true,
          user,
        };
      }

      return {
        success: false,
      };
    } catch (error) {
      console.error("Restore auth error:", error);
      return {
        success: false,
      };
    }
  }

  /**
   * Send OTP to email
   */
  /**
   * Send OTP to email or phone number
   * For signin: pass phone number
   * For signup: pass email
   */
  static async sendOtp(contactInfo: string): Promise<{
    success: boolean;
    message?: string;
    otp?: number;
  }> {
    try {
      // Determine if it's a phone number or email
      const isPhoneNumber = /^\d{10,}$/.test(contactInfo.replace(/\D/g, ""));

      const payload = {
        purpose: "verification",
        ...(isPhoneNumber ? { phone: contactInfo } : { email: contactInfo }),
      };

      const response = await apiClient.post<{ otp: number }>(
        API_ENDPOINTS.AUTH.OTP_SEND,
        payload,
      );

      return {
        success: response.success,
        message: response.message,
        otp: response.data?.otp,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to send OTP",
      };
    }
  }

  /**
   * Verify OTP code and complete authentication
   * Accepts either phone number or email
   */
  static async verifyOtp(
    contactInfo: string,
    otpCode: string,
    userData?: RegisterResponse,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: AuthResponse;
  }> {
    try {
      // Determine if it's a phone number or email
      const isPhoneNumber = /^\d{10,}$/.test(contactInfo.replace(/\D/g, ""));

      const payload = {
        otp_code: otpCode,
        purpose: "verification",
        ...(isPhoneNumber ? { phone: contactInfo } : { email: contactInfo }),
      };

      const response = await apiClient.post(
        API_ENDPOINTS.AUTH.OTP_VERIFY,
        payload,
      );

      if (response.success && userData) {
        // Now save token and user data after OTP verification
        await StorageService.saveToken(userData.token);
        await StorageService.saveUser(userData.user);
      }

      return {
        success: response.success,
        message: response.message,
        data: userData,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to verify OTP",
      };
    }
  }
}
