import "../global.css";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RideSearchProvider } from "./context/RideSearchContext";

function RootLayoutContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure navigation is mounted before deciding which route to show
    const timer = setTimeout(() => {
      setIsNavigationReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

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
      {!isAuthenticated && (
        <Stack.Screen name="(auth)" options={{ animation: "none" }} />
      )}
      {isAuthenticated && (
        <>
          <Stack.Screen name="(drawer)" options={{ animation: "none" }} />
          <Stack.Screen
            name="ride-search"
            options={{
              animation: "fade",
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
            }}
          />
        </>
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RideSearchProvider>
        <RootLayoutContent />
      </RideSearchProvider>
    </AuthProvider>
  );
}
