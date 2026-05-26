import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./src/services/api";
import { fetchMaintenanceMode } from "./src/services/appSettings"; // Your maintenance endpoint helper

import AppNavigator from "./src/navigation/AppNavigator";
import ComingSoonScreen from "./src/screens/ComingSoonScreen"; // Import your beautiful custom maintenance view

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [driverStatus, setDriverStatus] = useState(null);
  const [driver, setDriver] = useState(null);
  const [isMaintenance, setIsMaintenance] = useState(false); // Global maintenance state
  const [isReady, setIsReady] = useState(false);

  const checkLoginStatus = async () => {
    try {
      // 1. Instantly check if maintenance mode is enabled globally
      const result = await fetchMaintenanceMode().catch(() => ({ maintenanceMode: false }));
      
      if (result?.maintenanceMode === true) {
        setIsMaintenance(true);
        setIsReady(true);
        return; // HALT right here. Do not execute any further checks or log in routines!
      } else {
        setIsMaintenance(false);
      }

      // 2. Clear to proceed: Run your user setup profile calculations
      const token = await AsyncStorage.getItem("userToken");
      if (token) {
        const response = await api.get("/user");
        const drv = response.data?.driver;
        setDriver(drv || null);
        if (drv) {
          const fetchedStatus = drv.status?.toLowerCase() || "pending";

          // Check if seen approved screen before
          const hasSeenKey = `hasSeenApproved_${drv.id}`;
          const hasSeenApproved = await AsyncStorage.getItem(hasSeenKey);

          let finalStatus = fetchedStatus;

          // If they are approved but haven't seen the success screen
          if (fetchedStatus === "approved" && !hasSeenApproved) {
            finalStatus = "show_approved_screen";
          }

          setDriverStatus(finalStatus);
          setIsLoggedIn(true);

          const isProfileComplete = !!drv.address;
          setIsNewUser(fetchedStatus !== "approved" && !isProfileComplete);
        } else {
          // Logged in but no driver profile found at all
          setIsLoggedIn(true);
          setIsNewUser(true);
        }
      }
    } catch (error) {
      console.log("Startup check error:", error);
    } finally {
      setIsReady(true);
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  // While checking database parameters, keep user on a clean, solid background color
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00A859" />
      </View>
    );
  }

  // HARD BARRIER: If maintenance is active, render the screen outside navigation entirely.
  // Flash is physically impossible because HomeScreen never compiles.
  if (isMaintenance) {
    return (
      <ComingSoonScreen 
        setIsLoggedIn={setIsLoggedIn}
        setDriverStatus={setDriverStatus}
        setIsNewUser={setIsNewUser}
        onMaintenanceDisabled={() => checkLoginStatus()} // Callback to wake the app up smoothly
      />
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <AppNavigator
        isLoggedIn={isLoggedIn}
        setIsLoggedIn={setIsLoggedIn}
        isNewUser={isNewUser}
        setIsNewUser={setIsNewUser}
        driverStatus={driverStatus}
        setDriverStatus={setDriverStatus}
        driver={driver}
        setDriver={setDriver}
      />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0B1220", // Matches your ComingSoonScreen theme seamlessly!
    justifyContent: "center",
    alignItems: "center",
  },
});