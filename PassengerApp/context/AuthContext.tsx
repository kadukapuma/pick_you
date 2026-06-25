import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthService } from "../services/auth/authService";
import { StoredUser } from "../services/auth/storageService";
import { IS_DEV_MODE, MOCK_USER, MOCK_TOKEN } from "../services/api/config";

export interface AuthContextType {
  user: StoredUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  pendingRegistration: RegisterResponse | null;
  setPendingRegistration: (data: RegisterResponse | null) => void;
  updateUser: (userData: StoredUser | null) => void;
}

export interface RegisterResponse {
  user: any;
  token: string;
  email: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRegistration, setPendingRegistration] =
    useState<RegisterResponse | null>(null);

  // Restore authentication on app startup
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        setIsLoading(true);
        const result = await AuthService.restoreAuth();
        if (result.success && result.user) {
          setUser(result.user);
          console.log("✅ Auth restored: User", result.user.id);
        } else {
          setUser(null);
          console.log("⚠️ No valid auth found");
        }
      } catch (err) {
        console.error("Failed to restore auth:", err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreAuth();
  }, []);

  const register = async (data: any) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await AuthService.register({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
      });

      if (result.success && result.data) {
        setUser(result.data.user);
        console.log("✅ Registration successful: User", result.data.user.id);
      } else {
        const errorMsg =
          result.errors && Object.keys(result.errors).length > 0
            ? Object.values(result.errors)[0][0]
            : result.message || "Registration failed";
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      const message = err.message || "Registration failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update user in context (used after OTP verification)
   */
  const updateUser = (userData: StoredUser | null) => {
    setUser(userData);
    console.log("✅ User context updated", userData ? userData.id : "null");
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await AuthService.logout();
      setUser(null);
    } catch (err: any) {
      const message = err.message || "Logout failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    register,
    logout,
    error,
    clearError,
    pendingRegistration,
    setPendingRegistration,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
