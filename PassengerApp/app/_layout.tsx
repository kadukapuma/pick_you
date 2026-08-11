import "../global.css";
import { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import DelayedLoader from "../components/ui/DelayedLoader";
import { AuthProvider, useAuth } from "../state/auth/AuthContext";
import { RideSearchProvider } from "../state/booking/RideBookingContext";
import { ToastProvider } from "../state/toast/ToastContext";
import RideStatusBanner from "../features/ride-tracking/RideStatusBanner";
import { registerForPushNotifications } from "../services/notifications/pushRegistration";
import { AppUpdatePolicy, checkPassengerAppUpdate, isPassengerUpdateRequired } from "../services/notifications/appUpdate";
import RequiredUpdateScreen from "../components/update/RequiredUpdateScreen";

function RootLayoutContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [updatePolicy, setUpdatePolicy] = useState<AppUpdatePolicy | null>(null);

  useEffect(() => {
    const check = () => checkPassengerAppUpdate().then(setUpdatePolicy).catch(() => {});
    check();
    const appState = AppState.addEventListener("change", state => { if (state === "active") check(); });
    const notification = Notifications.addNotificationResponseReceivedListener(response => {
      if (response.notification.request.content.data?.action === "app_update") check();
    });
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response?.notification.request.content.data?.action === "app_update") check();
    });
    return () => { appState.remove(); notification.remove(); };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotifications();
    }
  }, [isAuthenticated]);

  // Set navigation ready after a small delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsNavigationReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Handle auth state changes - navigate to correct initial route
  useEffect(() => {
    if (isLoading || !isNavigationReady) {
      console.log("⏳ Waiting for auth and navigation to be ready...");
      return;
    }

    console.log(`🔄 Auth state changed: isAuthenticated=${isAuthenticated}`);
  }, [isAuthenticated, isLoading, isNavigationReady]);

  if (isLoading || !isNavigationReady) {
    return <DelayedLoader label="Starting PickU" variant="screen" backgroundColor="#F2FBF8" />;
  }

  if (isPassengerUpdateRequired(updatePolicy)) {
    return <RequiredUpdateScreen policy={updatePolicy!} />;
  }

  return (
    <>
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* ✅ ALWAYS render (auth) - splash and onboarding screens */}
      <Stack.Screen name="(auth)" options={{ animation: "none" }} />

      {/* ✅ ALWAYS render (app) - app screens for authenticated users */}
      <Stack.Screen name="(app)" options={{ animation: "none" }} />

      <Stack.Screen name="ride-tracking" options={{ animation: "fade", gestureEnabled: true }} />
      <Stack.Screen name="ride-details" options={{ animation: "slide_from_right", gestureEnabled: true }} />
      <Stack.Screen name="ride-help" options={{ animation: "slide_from_right", gestureEnabled: true }} />

      {/* Ride search overlay */}
      <Stack.Screen
        name="ride-booking"
        options={{
          animation: "fade",
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
    </Stack>
    <RideStatusBanner />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: "#000000" }}>
      <View style={{ flex: 1 }}>
        <ToastProvider>
          <AuthProvider>
            <RideSearchProvider>
              <RootLayoutContent />
            </RideSearchProvider>
          </AuthProvider>
        </ToastProvider>
      </View>
    </SafeAreaView>
  );
}


