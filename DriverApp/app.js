import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./src/services/api";

import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [driverStatus, setDriverStatus] = useState(null);
  const [driver, setDriver] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (token) {
          const response = await api.get("/user");
          const drv = response.data?.driver;
          setDriver(drv || null);
          if (drv) {
            const fetchedStatus = drv.status?.toLowerCase() || "pending";

            // Check if seen approved screen before
            const hasSeenApproved = await AsyncStorage.getItem("hasSeenApproved");

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

    checkLoginStatus();
  }, []);

  if (!isReady) return null;

  return (
    <NavigationContainer>
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
