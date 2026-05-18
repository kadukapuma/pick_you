import { createNativeStackNavigator } from "@react-navigation/native-stack";

import DocumentVefityscreen from "../screens/DocumnetVefityScreen";
import ProfileSetScreen from "../screens/ProfileSetupScreen";
import VehicleDetailsScreen from "../screens/VehicleDeatilsScreem";
import VerificationScreen from "../screens/VerificationScreen";
import NotificationScreen from "../screens/NotificationScreen";
import TripDetailsScreen from "../screens/Main Screen/TripDetailsScreen";

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
  const handleExitToGetStarted = () => {
    setIsLoggedIn(false);
    setIsNewUser?.(false);
    setDriverStatus?.(null);
  };

  // Logic: if they are "new" (onboarding) but status is already "pending",
  // it means they submitted docs and should go to Verification screen.
  const getInitialRoute = () => {
    const status = driverStatus?.toLowerCase();

    // If we have the full driver object, prefer checking completeness
    if (driver) {
      const profileComplete = !!driver.license_number && !!driver.address;

      const hasVehicle = driver.vehicles && driver.vehicles.length > 0;
      const vehicleComplete = hasVehicle && (!!driver.vehicles[0].vehicle_number || !!driver.vehicles[0].brand);

      const documentsComplete = !!driver.license_front_path && !!driver.license_back_path;

      // If profile missing, send to profile setup
      if (!profileComplete) return "ProfileSet";

      // If vehicle missing, send to vehicle details
      if (!vehicleComplete) return "VehicleDetails";

      // If docs missing, send to document upload
      if (!documentsComplete) return "Documentscreen";

      // If all complete and approved, go to main
      if (status === "approved") return "MainTabs";

      // Otherwise show verification for pending/rejected
      if (status === "pending" || status === "rejected") return "Verification";
    }

    // Fallbacks when driver object isn't available
    if (status === "approved") return "MainTabs";
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
      {/* Setup Flow */}
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

      {/* Main App */}
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

      {/* App Sub-Pages */}
      <Stack.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{
          animation: "slide_from_right", // Smooth transition
        }}
      />
      <Stack.Screen
        name="TripDetails"
        component={TripDetailsScreen}
        options={{
          animation: "slide_from_right", // Smooth transition
        }}
      />
    </Stack.Navigator>
  );
};

export default MainNavigator;
