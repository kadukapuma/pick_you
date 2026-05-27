import "../global.css";
import { useEffect, useRef, useState } from "react";
import { Stack, router } from "expo-router";
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

  // Load maintenance mode
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

    if (!isNavigationReady || isLoading) {
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
  }, [isAuthenticated, isNavigationReady, isLoading]);

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
    <AuthProvider>
      <RideSearchProvider>
        <RootLayoutContent />
      </RideSearchProvider>
    </AuthProvider>
  );
}
