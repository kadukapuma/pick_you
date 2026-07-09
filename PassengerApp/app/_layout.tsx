import "../global.css";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { RideSearchProvider } from "../context/RideSearchContext";
import { ToastProvider } from "../context/ToastContext";

function RootLayoutContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

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
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#59C36A" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* ✅ ALWAYS render (auth) - splash and onboarding screens */}
      <Stack.Screen name="(auth)" options={{ animation: "none" }} />

      {/* ✅ ALWAYS render (drawer) - app screens for authenticated users */}
      <Stack.Screen name="(drawer)" options={{ animation: "none" }} />

      {/* Ride search overlay */}
      <Stack.Screen
        name="ride-search"
        options={{
          animation: "fade",
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RideSearchProvider>
          <RootLayoutContent />
        </RideSearchProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
