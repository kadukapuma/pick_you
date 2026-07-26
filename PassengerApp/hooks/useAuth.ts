import { useAuth as useAuthContext } from "../state/auth/AuthContext";

/**
 * Custom hook to use authentication
 * Must be used within AuthProvider
 */
export function useAuth() {
  return useAuthContext();
}
