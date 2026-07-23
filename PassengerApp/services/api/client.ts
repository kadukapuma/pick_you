import { API_CONFIG } from "./config";
import { StorageService } from "../auth/authStorage";
import { router } from "expo-router";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

type ApiRequestOptions = RequestInit & {
  suppressErrorLog?: boolean;
  /** Set true to skip the global 401 auto-logout handler (e.g. during token validation on startup) */
  skipAuthCheck?: boolean;
};

class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  private async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const token = await StorageService.getToken();

      const headers: Record<string, string> = {
        ...API_CONFIG.HEADERS,
        ...options.headers,
      } as Record<string, string>;

      // Add token if available
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      if (options.method && ["POST", "PUT", "PATCH", "DELETE"].includes(options.method)) {
        headers["Idempotency-Key"] =
          `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const rawBody = await response.text();
      let data: any = {};

      if (rawBody) {
        try {
          data = JSON.parse(rawBody);
        } catch {
          data = {
            message:
              rawBody
                .replace(/<[^>]*>/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 300) || `HTTP ${response.status}`,
          };
        }
      }

      if (!response.ok) {
        if (!options.suppressErrorLog) {
          if (__DEV__) console.warn(`[DEV] [${response.status}] ${endpoint}:`, data);
        }

        // Global 401 handler — token was revoked mid-session
        if (response.status === 401 && !options.skipAuthCheck) {
          console.warn("🔒 401 received mid-session — clearing auth and redirecting to login");
          await StorageService.clearAuth();
          router.replace("/(auth)/get-started" as any);
        }

        return {
          success: false,
          message: data.message || "An error occurred",
          errors: data.errors,
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error: any) {
      if (__DEV__) console.warn(`Fetch error on ${endpoint}:`, error);

      if (error.name === "AbortError") {
        return {
          success: false,
          message: "Request timeout",
        };
      }

      return {
        success: false,
        message: error.message || "Network error",
      };
    }
  }

  public get<T>(
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  public post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const apiClient = new ApiClient();
