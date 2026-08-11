import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import api from "./api";

const CACHE_KEY = "driver_app_update_policy";

const compareVersions = (left, right) => {
  const a = String(left).split(".").map(Number);
  const b = String(right).split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0);
  }
  return 0;
};

export const installedDriverVersion = Constants.expoConfig?.version || "0.0.0";

export const isDriverUpdateRequired = (policy) =>
  Platform.OS === "android" && Boolean(policy?.required) &&
  compareVersions(installedDriverVersion, policy?.minimum_version || "0.0.0") < 0;

export async function checkDriverAppUpdate() {
  try {
    const response = await api.get("/app-updates/driver", { timeout: 10000 });
    const policy = response.data?.data ?? response.data;
    if (policy) {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(policy));
      return policy;
    }
  } catch (_) {
    // Fall back to the last policy. A device with no cached policy is not bricked.
  }
  const cached = await AsyncStorage.getItem(CACHE_KEY);
  return cached ? JSON.parse(cached) : null;
}
