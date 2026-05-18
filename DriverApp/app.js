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
            const status = drv.status?.toLowerCase() || "pending";
            setDriverStatus(status);
            setIsLoggedIn(true);

            // A user is only "new" if they haven't filled out their profile (e.g., no address)
            // AND they aren't approved yet.
            const isProfileComplete = !!drv.address;
            setIsNewUser(status !== "approved" && !isProfileComplete);
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
