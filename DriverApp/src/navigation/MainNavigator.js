import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// --- SCREENS IMPORT (Your exact file paths combined) ---
import EditVehicleScreen from "../screens//Main Screen/EditVehicleScreem";
import DocumentVefityscreen from "../screens/DocumnetVefityScreen";
import EditProfileScreen from "../screens/Main Screen/EditProfileScreen";
import TripDetailsScreen from "../screens/Main Screen/TripDetailsScreen";
import NotificationScreen from "../screens/NotificationScreen";
import ProfileSetScreen from "../screens/ProfileSetupScreen";
import VehicleDetailsScreen from "../screens/VehicleDeatilsScreem";
import VerificationScreen from "../screens/VerificationScreen";
import DocumentsScreen from "../screens/Main Screen/DocumentsScreen";
import DocumentPreviewScreen from "../screens/Main Screen/DocumentPreviewScreen";
import ComingSoonScreen from "../screens/ComingSoonScreen";
import BottomTabs from "./BottomTabs";

const Stack = createNativeStackNavigator();

const MainNavigator = ({
  isNewUser = false,
  setIsNewUser,
  driverStatus,
  setIsLoggedIn,
  setDriverStatus,
  driver = null,
}) => {

  // Back-end Exit handler logic
  const handleExitToGetStarted = () => {
    setIsLoggedIn(false);
    setIsNewUser?.(false);
    setDriverStatus?.(null);
  };

  // Back-end Logic: Evaluates data completeness to safely direct user entry routing
  const getInitialRoute = () => {
    const status = driverStatus?.toLowerCase();

    // If we have the full driver object, check data parameter completeness
    if (driver) {
      const profileComplete = !!driver.license_number && !!driver.address;

      const hasVehicle = driver.vehicles && driver.vehicles.length > 0;
      const vehicleComplete =
        hasVehicle &&
        (!!driver.vehicles[0].vehicle_number || !!driver.vehicles[0].brand);

      const documentsComplete =
        !!driver.license_front_path && !!driver.license_back_path;

      // Check step 1: Profile
      if (!profileComplete) return "ProfileSet";

      // Check step 2: Vehicle details
      if (!vehicleComplete) return "VehicleDetails";

      // Check step 3: Initial documents upload flow
      if (!documentsComplete) return "Documentscreen";

      // Validation gates
      if (status === "show_approved_screen") return "Verification";
      if (status === "approved") return "ComingSoon";
      // if (status === "approved") return "MainTabs";
      if (status === "pending" || status === "rejected") return "Verification";
    }

    // Direct Fallbacks when live driver context payload structure isn't populated
    if (status === "show_approved_screen") return "Verification";
    //
    if (status === "approved") return "ComingSoon";
    //  if (status === "approved") return "MainTabs";
    if (isNewUser) return "ProfileSet";
    if (status === "pending" || status === "rejected") return "Verification";

    return "Verification";
  };

  return (
    <Stack.Navigator
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
          />
        )}
      </Stack.Screen>

      {/* ==================== SUB-PAGES (WITH UI ANIMATIONS) ==================== */}
      <Stack.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{
          animation: "slide_from_right",
        }}
      />

      <Stack.Screen
        name="TripDetails"
        component={TripDetailsScreen}
        options={{
          animation: "slide_from_right",
        }}
      />

      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          animation: "slide_from_right",
        }}
      />

      <Stack.Screen
        name="EditVehicle"
        component={EditVehicleScreen}
        options={{
          animation: "slide_from_right",
        }}
      />

      <Stack.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{
          animation: "slide_from_right",
        }}
      />

      <Stack.Screen
        name="DocumentPreview"
        component={DocumentPreviewScreen}
        options={{
          animation: "slide_from_right",
        }}
      />
    </Stack.Navigator>
  );
};

export default MainNavigator;
