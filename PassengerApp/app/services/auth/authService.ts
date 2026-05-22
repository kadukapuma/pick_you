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
  static async sendOtp(email: string): Promise<{
    success: boolean;
    message?: string;
    otp?: number;
  }> {
    try {
      const response = await apiClient.post<{ otp: number }>(API_ENDPOINTS.AUTH.OTP_SEND, {
        email,
        purpose: "verification",
      });

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
   */
  static async verifyOtp(
    email: string,
    otpCode: string,
    userData?: RegisterResponse,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: AuthResponse;
  }> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.OTP_VERIFY, {
        email,
        otp_code: otpCode,
        purpose: "verification",
      });

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
