import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  TOKEN: "auth_token",
  USER: "auth_user",
};

export interface StoredUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  profile_picture_path?: string;
  role: "passenger" | "driver" | "admin";
  is_active: boolean;
  created_at?: string;
  passenger?: {
    id: number;
    wallet_balance: number;
  };
}

export class StorageService {
  /**
   * Save authentication token
   */
  static async saveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      console.log(`💾 Token saved to AsyncStorage (length: ${token.length})`);

      // Verify it was saved
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      console.log(
        `✅ Token verification: ${saved ? "SUCCESS - saved" : "FAILED - not saved"}`,
      );
    } catch (error) {
      console.error("❌ Failed to save token:", error);
      throw error;
    }
  }

  /**
   * Get authentication token (no logging - called frequently for every API request)
   */
  static async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch (error) {
      console.error("❌ Failed to retrieve token:", error);
      return null;
    }
  }

  /**
   * Save user data
   */
  static async saveUser(user: StoredUser): Promise<void> {
    try {
      const userData = JSON.stringify(user);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, userData);
      console.log(
        `💾 User saved to AsyncStorage (ID: ${user.id}, ${user.first_name})`,
      );

      // Verify it was saved
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      console.log(
        `✅ User verification: ${saved ? "SUCCESS - saved" : "FAILED - not saved"}`,
      );
    } catch (error) {
      console.error("❌ Failed to save user:", error);
      throw error;
    }
  }

  /**
   * Get stored user data
   */
  static async getUser(): Promise<StoredUser | null> {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (userData) {
        const user = JSON.parse(userData);
        console.log(`🔍 User restored: ID ${user.id}`);
        return user;
      }
      return null;
    } catch (error) {
      console.error("❌ Failed to retrieve user:", error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getToken();
      const isAuth = !!token;
      console.log(
        `🔐 Authentication check: ${isAuth ? "AUTHENTICATED" : "NOT AUTHENTICATED"}`,
      );
      return isAuth;
    } catch {
      console.log(`🔐 Authentication check: ERROR`);
      return false;
    }
  }

  /**
   * Clear all authentication data
   */
  static async clearAuth(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      console.log("🗑️  Auth cleared from AsyncStorage");
    } catch (error) {
      console.error("❌ Failed to clear auth:", error);
      throw error;
    }
  }

  /**
   * Debug: Get all storage items
   */
  static async debugGetAllKeys(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      console.log("📊 All storage keys:", keys);

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        console.log(
          `  - ${key}: ${value ? value.substring(0, 50) + "..." : "null"}`,
        );
      }
    } catch (error) {
      console.error("❌ Failed to get all keys:", error);
    }
  }
}
