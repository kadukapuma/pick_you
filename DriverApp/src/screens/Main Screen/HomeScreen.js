import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  StatusBar,
  Platform,
  ActivityIndicator,
} from "react-native";

import MapView, { PROVIDER_GOOGLE, Marker, AnimatedRegion } from "react-native-maps";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import { Feather, Ionicons } from "@expo/vector-icons";
import { MotiView, AnimatePresence } from "moti";
import api from "../../services/api";

const HomeScreen = () => {
  const mapRef = useRef(null);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [isOnline, setIsOnline] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // --- REFINED PREMIUM TOAST SYSTEM ---
  const [toast, setToast] = useState({ visible: false, type: "success", message: "" });

  const showCustomToast = (type, message) => {
    setToast({ visible: true, type, message });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3500);
  };

  const [region] = useState(
    new AnimatedRegion({
      latitude: 6.9271,
      longitude: 79.8612,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    })
  );

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle("dark-content", true);
      StatusBar.setBackgroundColor("#fff", true);
      StatusBar.setTranslucent(false);
      StatusBar.setHidden(false);

      fetchDriverData();
      return () => {};
    }, [])
  );

  const fetchDriverData = async () => {
    try {
      const response = await api.get("/user");
      const driverAvailability = response.data?.driver?.availability;
      setIsOnline(driverAvailability === 1);
    } catch (error) {
      console.log("Error fetching driver data:", error);
    }
  };

  const handleToggleAvailability = async (newValue) => {
    setIsToggling(true);
    try {
      await api.put('/driver/availability', {
        is_active: newValue,
      });

      setIsOnline(newValue);
      showCustomToast(
        "success",
        newValue
          ? "You are now online. Searching for trips..."
          : "You are now offline. Enjoy your break!"
      );
    } catch (error) {
      console.log("Error updating driver availability:", error);
      setIsOnline(!newValue);

      const errorMessage =
        error.response?.data?.message ||
        "Failed to update availability. Please try again.";

      showCustomToast("error", errorMessage);
    } finally {
      setIsToggling(false);
    }
  };

  const goToMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      region.timing(newRegion).start();
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={false} />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 6.9271,
          longitude: 79.8612,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        <Marker.Animated coordinate={region}>
          <View style={styles.markerContainer}>
            <View style={styles.driverIcon}>
              <Feather name="navigation" size={20} color="#1E293B" />
            </View>
          </View>
        </Marker.Animated>
      </MapView>

      {/* --- TOP HEADER ROW --- */}
      <SafeAreaView style={[styles.topContainer, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.locationButton}>
            <Feather name="navigation" size={16} color="#00A859" />
            <Text style={styles.locationText}>Downtown Area</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Feather name="bell" size={20} color="#0F172A" />
            <View style={styles.dot} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* --- RIGHT SIDE FLOATING CONTROLS --- */}
      <View style={[styles.rightButtons, { bottom: 250 + insets.bottom }]}>
        <TouchableOpacity style={styles.floatingBtn} onPress={goToMyLocation}>
          <Feather name="navigation" size={20} color="#0F172A" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.floatingBtn}>
          <Feather name="refresh-cw" size={18} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* --- ANCHORED PREMIUM BANNER (SHIFTS DYNAMICALLY ABOVE THE BOTTOM STATUS CARD) --- */}
      <AnimatePresence>
        {toast.visible && (
          <MotiView
            from={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: "spring", damping: 20, stiffness: 150 }}
            style={[
              styles.toastCard,
              { bottom: Platform.OS === "android" ? 210 : 190 + insets.bottom }
            ]}
          >
            <View style={[
              styles.statusIndicatorIndicator, 
              { backgroundColor: toast.type === "error" ? "#EF4444" : "#00A859" }
            ]} />
            <View style={styles.toastContentContainer}>
              <Text style={styles.toastTitleText}>
                {toast.type === "error" ? "System Update Fail" : "Status Changed"}
              </Text>
              <Text style={styles.toastBodyText}>{toast.message}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setToast((prev) => ({ ...prev, visible: false }))} 
              style={styles.toastCloseBtn}
            >
              <Ionicons name="close" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </MotiView>
        )}
      </AnimatePresence>

      {/* --- YOUR PERFECT POSITIONED STATUS CARD --- */}
      <SafeAreaView
        edges={["bottom"]}
        style={[
          styles.bottomContainer,
          { bottom: Platform.OS === "android" ? 60 : 40 + insets.bottom },
        ]}
      >
        <View style={styles.statusCard}>
          <View>
            <Text style={styles.statusTitle}>
              {isOnline ? "You're Online" : "You're Offline"}
            </Text>
            <Text style={styles.statusSubtitle}>
              {isOnline ? "Searching for trips..." : "Go online to start earning"}
            </Text>
          </View>

          {isToggling ? (
            <ActivityIndicator size="large" color="#00A859" />
          ) : (
            <Switch
              trackColor={{ false: "#CBD5E1", true: "#86EFAC" }}
              thumbColor={isOnline ? "#00A859" : "#FFF"}
              onValueChange={handleToggleAvailability}
              value={isOnline}
              disabled={isToggling}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

export default HomeScreen;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  map: {
    flex: 1,
  },
  /* --- REFINED CUSTOM PLACEMENT TOAST STYLING --- */
  toastCard: {
    position: "absolute",
    left: "5%",
    right: "5%",
    width: "90%",
    backgroundColor: "#1E293B", 
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 999,
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  statusIndicatorIndicator: {
    width: 4,
    height: 28,
    borderRadius: 2,
    marginRight: 12,
  },
  toastContentContainer: {
    flex: 1,
    justifyContent: "center",
  },
  toastTitleText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  toastBodyText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
    lineHeight: 16,
  },
  toastCloseBtn: {
    padding: 4,
    marginLeft: 8,
  },
  topContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    elevation: 4,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  notificationButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  dot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  rightButtons: {
    position: "absolute",
    right: 18,
  },
  floatingBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    elevation: 4,
  },
  bottomContainer: {
    position: "absolute",
    width: "100%",
    alignItems: "center",
  },
  statusCard: {
    width: "90%",
    backgroundColor: "#FFF",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 6,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  statusSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
  },
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  driverIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#12cd76",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
});