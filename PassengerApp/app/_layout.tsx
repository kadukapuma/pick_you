import "../global.css";
import { useEffect, useRef, useState } from "react";
import { Stack } from "expo-router";
import { AppState, AppStateStatus, ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RideSearchProvider } from "./context/RideSearchContext";
import MaintenanceScreen from "./components/MaintenanceScreen";
import { fetchMaintenanceMode } from "./services/maintenanceService";

function RootLayoutContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Small delay to ensure navigation is mounted before deciding which route to show
    const timer = setTimeout(() => {
      setIsNavigationReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadMaintenanceMode = async () => {
      try {
        const enabled = await fetchMaintenanceMode();

        if (isActive) {
          setIsMaintenanceMode(enabled);
        }
      } catch (error) {
        console.error("Failed to load maintenance mode:", error);

        if (isActive) {
          setIsMaintenanceMode(false);
        }
      } finally {
        if (isActive) {
          setIsMaintenanceLoading(false);
        }
      }
    };

    loadMaintenanceMode();

    const syncMaintenanceMode = () => {
      loadMaintenanceMode();
    };

    // ✅ App state listener to sync auth when app returns to foreground
    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      const wasBackgrounded = appStateRef.current.match(/inactive|background/);
      appStateRef.current = nextState;

      if (wasBackgrounded && nextState === "active") {
        console.log("🔄 App resumed - syncing maintenance mode");
        syncMaintenanceMode();
      }
    });

    return () => {
      isActive = false;
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!isNavigationReady) {
      return;
    }

    const refreshMaintenanceMode = async () => {
      try {
        const enabled = await fetchMaintenanceMode();
        setIsMaintenanceMode(enabled);
      } catch (error) {
        console.error("Failed to refresh maintenance mode:", error);
      }
    };

    refreshMaintenanceMode();

    if (isAuthenticated) {
      refreshTimerRef.current = setInterval(refreshMaintenanceMode, 5000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [isAuthenticated, isNavigationReady]);

  if (isLoading || !isNavigationReady || isMaintenanceLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#59C36A" />
      </View>
    );
  }

  if (isMaintenanceMode && isAuthenticated) {
    return <MaintenanceScreen />;
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
