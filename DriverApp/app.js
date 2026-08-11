import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { AppState, View, ActivityIndicator, StyleSheet } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./src/services/api";
import { registerForPushNotifications } from "./src/services/pushRegistration";
import { checkDriverAppUpdate, isDriverUpdateRequired } from "./src/services/appUpdate";
import RequiredUpdateScreen from "./src/screens/RequiredUpdateScreen";

import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [driverStatus, setDriverStatus] = useState(null);
  const [driver, setDriver] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [verificationUser, setVerificationUser] = useState(null); // Added to handle unverified users
  const [updatePolicy, setUpdatePolicy] = useState(null);
  const [updateChecked, setUpdateChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      const policy = await checkDriverAppUpdate();
      setUpdatePolicy(policy);
      setUpdateChecked(true);
    };
    check();
    const appState = AppState.addEventListener("change", state => { if (state === "active") check(); });
    const notification = Notifications.addNotificationResponseReceivedListener(response => {
      if (response.notification.request.content.data?.action === "app_update") check();
    });
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response?.notification.request.content.data?.action === "app_update") check();
    });
    return () => { appState.remove(); notification.remove(); };
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (token) {
        const response = await api.get("/user");
        const user = response.data;
        
        if (user && user.is_verified === false) {
          // User is not verified! Store details and keep isLoggedIn false so they are redirected to OTP
          setVerificationUser({
            email: user.email,
            phone: user.phone,
          });
          setIsLoggedIn(false);
        } else {
          setVerificationUser(null);
          const drv = user?.driver;
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

  useEffect(() => {
    if (isLoggedIn) {
      registerForPushNotifications();
    }
  }, [isLoggedIn]);

  // While checking database parameters, keep user on a clean, solid background color
  if (!isReady || !updateChecked) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00A859" />
      </View>
    );
  }

  if (isDriverUpdateRequired(updatePolicy)) {
    return <RequiredUpdateScreen policy={updatePolicy} />;
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
        verificationUser={verificationUser}
        setVerificationUser={setVerificationUser}
      />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0B1220",
    justifyContent: "center",
    alignItems: "center",
  },
});
