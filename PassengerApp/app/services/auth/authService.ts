import { apiClient } from "../api/apiClient";
import { API_ENDPOINTS } from "../api/config";
import { StorageService, StoredUser } from "./storageService";

export interface RegisterPhonePayload {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
}

export interface AuthResponse {
  user: StoredUser;
  token: string;
  registered: boolean;
  phone?: string;
  normalized_phone?: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(payload: RegisterPhonePayload): Promise<{
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

      if (response.success && response.data?.token) {
        await StorageService.saveToken(response.data.token);
        await StorageService.saveUser(response.data.user);
        console.log("✅ Token and user saved after registration");
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
   * Logout user
   */
  static async logout(): Promise<{ success: boolean; message?: string }> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
      await StorageService.clearAuth();
      console.log("✅ User logged out and auth cleared");
      return { success: true, message: "Logged out successfully" };
    } catch (error: any) {
      console.error("Logout error:", error);
      await StorageService.clearAuth();
      return { success: true, message: "Logged out" };
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
        console.log("✅ Auth restored from storage - Token:", token.substring(0, 20) + "...");
        return { success: true, user };
      }
      console.log("⚠️ No token or user in storage");
      return { success: false };
    } catch (error) {
      console.error("Restore auth error:", error);
      return { success: false };
    }
  }

  /**
   * Send OTP to phone number
   */
  static async sendOtp(phone: string): Promise<{
    success: boolean;
    message?: string;
    otp?: number;
  }> {
    try {
      const response = await apiClient.post<{ otp: number }>(API_ENDPOINTS.AUTH.OTP_SEND, {
        phone
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
   * Verify OTP code and check registration status
   * Saves auth tokens for both existing users and new registrations
   */
  static async verifyOtp(
    phone: string,
    otpCode: string,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: AuthResponse;
  }> {
    try {
      const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.OTP_VERIFY, {
        phone,
        otp_code: otpCode,
      });

      // ✅ Save token and user for BOTH registered users AND new user registrations
      if (response.success && response.data?.token && response.data?.user) {
        await StorageService.saveToken(response.data.token);
        await StorageService.saveUser(response.data.user);
        console.log(
          `✅ Auth saved after OTP verification (registered: ${response.data.registered}) - User: ${response.data.user.id}`
        );
      }

      return {
        success: response.success,
        message: response.message,
        data: response.data,
      };
    } catch (error: any) {
      console.error("OTP verification error:", error);
      return {
        success: false,
        message: error.message || "Failed to verify OTP",
      };
    }
  }
}
