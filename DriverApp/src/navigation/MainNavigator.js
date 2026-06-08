import React, { useState, useEffect, useRef } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator } from "react-native"; // Added View & ActivityIndicator for clean load gating

// --- SCREENS IMPORT ---
import EditVehicleScreen from "../screens//Main Screen/EditVehicleScreem";
import DocumentVefityscreen from "../screens/DocumnetVefityScreen";
import EditProfileScreen from "../screens/Main Screen/EditProfileScreen";
import TripDetailsScreen from "../screens/Main Screen/TripDetailsScreen";
import NotificationScreen from "../screens/NotificationScreen";
import ProfileSetScreen from "../screens/ProfileSetupScreen";
import VehicleDetailsScreen from "../screens/VehicleDeatilsScreem";
import VerificationScreen from "../screens/VerificationScreen";
import DocumentsScreen from "../screens/Main Screen/DocumentsScreen";
import BankDetailsScreen from "../screens/Main Screen/BankDetailsScreen";
import DocumentPreviewScreen from "../screens/Main Screen/DocumentPreviewScreen";
import ComingSoonScreen from "../screens/ComingSoonScreen";
import RideDetailsScreen from "../screens/Ride/RideDetailsScreen";
import PickupNavigationScreen from "../screens/Ride/PickupNavigationScreen";
import ArrivedAtPickupScreen from "../screens/Ride/ArrivedAtPickupScreen";
import TripInProgressScreen from "../screens/Ride/TripInProgressScreen";
import TripCompletedScreen from "../screens/Ride/TripCompletedScreen";


import BottomTabs from "./BottomTabs";
import { fetchMaintenanceMode } from "../services/appSettings";

const Stack = createNativeStackNavigator();

const MainNavigator = ({
  isNewUser = false,
  setIsNewUser,
  driverStatus,
  setIsLoggedIn,
  setDriverStatus,
  driver = null,
}) => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loadingMaintenanceMode, setLoadingMaintenanceMode] = useState(true); // Gating state
  const navigationRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Function to check maintenance mode dynamically
  const checkMaintenanceMode = async () => {
    try {
      const result = await fetchMaintenanceMode();
      const newMaintenanceMode = result.maintenanceMode || false;
      setMaintenanceMode(newMaintenanceMode);

      // If maintenance mode was turned OFF and we're stuck on ComingSoon, move forward immediately
      if (!newMaintenanceMode && driverStatus?.toLowerCase() === "approved") {
        navigationRef.current?.navigate("MainTabs");
      }
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
    }
  };

  // Check maintenance mode on initial mount before creating navigation hierarchy
  useEffect(() => {
    const initializeMaintenanceMode = async () => {
      try {
        const result = await fetchMaintenanceMode();
        setMaintenanceMode(result.maintenanceMode || false);
      } catch (error) {
        console.error('Error checking maintenance mode:', error);
        setMaintenanceMode(false);
      } finally {
        setLoadingMaintenanceMode(false); // Clear gate safely
      }
    };

    initializeMaintenanceMode();
  }, []);

  // Poll maintenance mode changes every 5 seconds
  useEffect(() => {
    pollIntervalRef.current = setInterval(() => {
      checkMaintenanceMode();
    }, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [driverStatus]);

  const handleExitToGetStarted = () => {
    setIsLoggedIn(false);
    setIsNewUser?.(false);
    setDriverStatus?.(null);
  };

  // Evaluates data completeness to safely direct initial routing paths
  const getInitialRoute = () => {
    const status = driverStatus?.toLowerCase();

    // If maintenance mode is active, lock down approved users to the coming soon screen
    if (maintenanceMode && status === "approved") {
      return "ComingSoon";
    }

    if (driver) {
      const profileComplete = !!driver.license_number && !!driver.address;
      const hasVehicle = driver.vehicles && driver.vehicles.length > 0;
      const vehicleComplete =
        hasVehicle &&
        (!!driver.vehicles[0].vehicle_number || !!driver.vehicles[0].brand);

      const documentsComplete =
        !!driver.license_front_path && !!driver.license_back_path;

      if (!profileComplete) return "ProfileSet";
      if (!vehicleComplete) return "VehicleDetails";
      if (!documentsComplete) return "Documentscreen";

      if (status === "show_approved_screen") return "Verification";
      
      // FIX HERE: If maintenance is off, return MainTabs directly instead of ComingSoon fallback!
      if (status === "approved") return "MainTabs"; 
      if (status === "pending" || status === "rejected") return "Verification";
    }

    if (status === "show_approved_screen") return "Verification";
    if (status === "approved") return "MainTabs";
    if (isNewUser) return "ProfileSet";
    if (status === "pending" || status === "rejected") return "Verification";

    return "Verification";
  };

  // Prevent routing calculations while we load system maintenance conditions
  if (loadingMaintenanceMode) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0B1220", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#00A859" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      ref={navigationRef}
      initialRouteName={getInitialRoute()}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* ==================== ONBOARDING FLOW ==================== */}
      <Stack.Screen name="ProfileSet">
        {(props) => (
          <ProfileSetScreen
            {...props}
            setIsLoggedIn={setIsLoggedIn}
            setIsNewUser={setIsNewUser}
            setDriverStatus={setDriverStatus}
            onExit={handleExitToGetStarted}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="VehicleDetails">
        {(props) => (
          <VehicleDetailsScreen
            {...props}
            setIsLoggedIn={setIsLoggedIn}
            setIsNewUser={setIsNewUser}
            setDriverStatus={setDriverStatus}
            onExit={handleExitToGetStarted}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Documentscreen">
        {(props) => (
          <DocumentVefityscreen
            {...props}
            setIsLoggedIn={setIsLoggedIn}
            setIsNewUser={setIsNewUser}
            setDriverStatus={setDriverStatus}
            onExit={handleExitToGetStarted}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="Verification">
        {(props) => (
          <VerificationScreen
            {...props}
            setIsLoggedIn={setIsLoggedIn}
            setDriverStatus={setDriverStatus}
            setIsNewUser={setIsNewUser}
          />
        )}
      </Stack.Screen>

      {/* ==================== MAIN CORE APP ==================== */}
      <Stack.Screen name="ComingSoon">
        {(props) => (
          <ComingSoonScreen
            {...props}
            setIsLoggedIn={setIsLoggedIn}
            setIsNewUser={setIsNewUser}
            setDriverStatus={setDriverStatus}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="MainTabs">
        {(props) => (
          <BottomTabs
            {...props}
            setIsLoggedIn={setIsLoggedIn}
            setIsNewUser={setIsNewUser}
            setDriverStatus={setDriverStatus}
            maintenanceMode={maintenanceMode}
            driverStatus={driverStatus}
          />
        )}
      </Stack.Screen>

      {/* ==================== SUB-PAGES ==================== */}
      <Stack.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{ animation: "slide_from_right" }}
      />

      <Stack.Screen
        name="TripDetails"
        component={TripDetailsScreen}
        options={{ animation: "slide_from_right" }}
      />

      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ animation: "slide_from_right" }}
      />

      <Stack.Screen
        name="EditVehicle"
        component={EditVehicleScreen}
        options={{ animation: "slide_from_right" }}
      />

      <Stack.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{ animation: "slide_from_right" }}
      />

      <Stack.Screen
        name="DocumentPreview"
        component={DocumentPreviewScreen}
        options={{ animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="BankDetails"
        component={BankDetailsScreen}
        options={{ animation: "slide_from_right" }}
      />

      <Stack.Screen
  name="RideDetails"
  component={RideDetailsScreen}
  options={{
    animation: "slide_from_right",
  }}
/>

     <Stack.Screen
  name="PickupNavigation"
  component={PickupNavigationScreen}
  options={{
    animation: "slide_from_right",
  }}
/>

     <Stack.Screen
  name="ArrivedAtPickupScreen"
  component={ArrivedAtPickupScreen}
  options={{
    animation: "slide_from_right",
  }}
/>

<Stack.Screen
name="TripInProgressScreen"
component={TripInProgressScreen}
options={{
  animation: "slide_from_right",
}}
/>

<Stack.Screen
name="TripCompletedScreen"
component={TripCompletedScreen}
options={{
  animation: "slide_from_right",
}}
/>
    </Stack.Navigator>
  );
};

export default MainNavigator;