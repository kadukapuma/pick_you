import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiClient } from "../api/client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests push permission, fetches the device's Expo push token, and
 * registers it with the backend so ride-status pushes can reach this device.
 * No-ops silently on simulators/emulators, where push tokens aren't available.
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (!Device.isDevice) {
      return;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    if (!token) {
      return;
    }

    await apiClient.post("/devices/push-token", {
      token,
      platform: Platform.OS,
      app: "passenger",
    });
  } catch (error) {
    if (__DEV__) console.warn("Push notification registration failed:", error);
  }
}
