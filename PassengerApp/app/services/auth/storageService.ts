import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  TOKEN: "auth_token",
  USER: "auth_user",
};

// Fallback in-memory storage for Expo Go
const memoryStorage: Record<string, string> = {};

export interface StoredUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: "passenger" | "driver" | "admin";
  is_active: boolean;
  created_at?: string;
  passenger?: {
    id: number;
    wallet_balance: number;
  };
}

export class StorageService {
  private static useMemory = false;

  /**
   * Check if AsyncStorage is available
   */
  private static async checkAsyncStorageAvailability(): Promise<boolean> {
    if (this.useMemory) return false;
    try {
      await AsyncStorage.getItem("__test_key__");
      return true;
    } catch (error) {
      this.useMemory = true;
      console.warn("AsyncStorage not available, using in-memory storage");
      return false;
    }
  }

  /**
   * Save authentication token
   */
  static async saveToken(token: string): Promise<void> {
    try {
      const isAvailable = await this.checkAsyncStorageAvailability();
      if (isAvailable) {
        await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      } else {
        memoryStorage[STORAGE_KEYS.TOKEN] = token;
      }
    } catch (error) {
      console.error("Failed to save token:", error);
      // Fallback to memory storage
      memoryStorage[STORAGE_KEYS.TOKEN] = token;
    }
  }

  /**
   * Get authentication token
   */
  static async getToken(): Promise<string | null> {
    try {
      const isAvailable = await this.checkAsyncStorageAvailability();
      if (isAvailable) {
        return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      } else {
        return memoryStorage[STORAGE_KEYS.TOKEN] || null;
      }
    } catch (error) {
      console.error("Failed to retrieve token:", error);
      return memoryStorage[STORAGE_KEYS.TOKEN] || null;
    }
  }

  /**
   * Save user data
   */
  static async saveUser(user: StoredUser): Promise<void> {
    try {
      const isAvailable = await this.checkAsyncStorageAvailability();
      const userData = JSON.stringify(user);
      if (isAvailable) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER, userData);
      } else {
        memoryStorage[STORAGE_KEYS.USER] = userData;
      }
    } catch (error) {
      console.error("Failed to save user:", error);
      // Fallback to memory storage
      memoryStorage[STORAGE_KEYS.USER] = JSON.stringify(user);
    }
  }

  /**
   * Get stored user data
   */
  static async getUser(): Promise<StoredUser | null> {
    try {
      const isAvailable = await this.checkAsyncStorageAvailability();
      let userData: string | null = null;
      if (isAvailable) {
        userData = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      } else {
        userData = memoryStorage[STORAGE_KEYS.USER] || null;
      }
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error("Failed to retrieve user:", error);
      const fallback = memoryStorage[STORAGE_KEYS.USER];
      return fallback ? JSON.parse(fallback) : null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getToken();
      return !!token;
    } catch {
      return false;
    }
  }

  /**
   * Clear all authentication data
   */
  static async clearAuth(): Promise<void> {
    try {
      const isAvailable = await this.checkAsyncStorageAvailability();
      if (isAvailable) {
        await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
        await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      } else {
        delete memoryStorage[STORAGE_KEYS.TOKEN];
        delete memoryStorage[STORAGE_KEYS.USER];
      }
    } catch (error) {
      console.error("Failed to clear auth:", error);
      // Fallback: clear memory storage
      delete memoryStorage[STORAGE_KEYS.TOKEN];
      delete memoryStorage[STORAGE_KEYS.USER];
    }
  }
}
