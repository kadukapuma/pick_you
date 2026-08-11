import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiClient } from "../api/client";

export interface AppUpdatePolicy {
  app: "passenger";
  latest_version: string;
  minimum_version: string;
  title: string;
  message: string;
  website_url: string;
  required: boolean;
  published_at: string | null;
}

const CACHE_KEY = "passenger_app_update_policy";

const compareVersions = (left: string, right: string) => {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0);
  }
  return 0;
};

export const installedPassengerVersion = Constants.expoConfig?.version || "0.0.0";

export const isPassengerUpdateRequired = (policy?: AppUpdatePolicy | null) =>
  Platform.OS === "android" && Boolean(policy?.required) &&
  compareVersions(installedPassengerVersion, policy?.minimum_version || "0.0.0") < 0;

export async function checkPassengerAppUpdate(): Promise<AppUpdatePolicy | null> {
  const response = await apiClient.get<AppUpdatePolicy>("/app-updates/passenger", {
    suppressErrorLog: true,
    skipAuthCheck: true,
    timeoutMs: 10000,
  });
  if (response.success && response.data) {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(response.data));
    return response.data;
  }
  const cached = await AsyncStorage.getItem(CACHE_KEY);
  return cached ? JSON.parse(cached) : null;
}
