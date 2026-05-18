import React, { useRef, useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  StatusBar,
} from "react-native";

import MapView, { PROVIDER_GOOGLE, Marker } from "react-native-maps";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import api from "../../services/api";

const HomeScreen = () => {
  const mapRef = useRef(null);
  const insets = useSafeAreaInsets(); // ✅ FIX 1: safe area control

  const navigation = useNavigation();

  const [isOnline, setIsOnline] = useState(false);
  const [driverId, setDriverId] = useState(null);

  useEffect(() => {
    fetchDriverInfo();
  }, []);

  const fetchDriverInfo = async () => {
    try {
      const response = await api.get("/user");
      if (response.data?.driver) {
        setDriverId(response.data.driver.id);
        // Assuming the backend returns is_active or similar in driver or user
        setIsOnline(response.data.is_active || false);
      }
    } catch (error) {
      console.log("Error fetching driver info:", error);
    }
  };

  const toggleOnlineStatus = async (value) => {
    if (!driverId) return;
    
    setIsOnline(value);
    try {
      await api.put(`/drivers/${driverId}/active-status`, {
        is_active: value
      });
    } catch (error) {
      console.log("Error updating status:", error);
      setIsOnline(!value); // Revert on failure
    }
  };

  const [region, setRegion] = useState({
    latitude: 6.9271,
    longitude: 79.8612,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const goToMyLocation = async () => {
    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") return;

      const location =
        await Location.getCurrentPositionAsync({});

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* ================= MAP ================= */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
      >
        <Marker coordinate={region} />
      </MapView>

      {/* ================= TOP ================= */}
      <SafeAreaView edges={["top"]} style={styles.topContainer}>
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

      {/* ================= RIGHT BUTTONS ================= */}
      <View
        style={[
          styles.rightButtons,
          { bottom: 220 + insets.bottom }, // ✅ FIX 2: safe spacing
        ]}
      >
        <TouchableOpacity
          style={styles.floatingBtn}
          onPress={goToMyLocation}
        >
          <Feather name="navigation" size={20} color="#0F172A" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.floatingBtn}>
          <Feather name="refresh-cw" size={18} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* ================= BOTTOM CARD ================= */}
      <SafeAreaView
        edges={["bottom"]}
        style={[
          styles.bottomContainer,
          {
            bottom: 40 + 60, // ✅ FIX 3: nav bar + gap spacing
          },
        ]}
      >
        <View style={styles.statusCard}>
          <View>
            <Text style={styles.statusTitle}>
              {isOnline ? "You're Online" : "You're Offline"}
            </Text>

            <Text style={styles.statusSubtitle}>
              {isOnline
                ? "Searching for trips..."
                : "Go online to start earning"}
            </Text>
          </View>

          <Switch
            trackColor={{ false: "#CBD5E1", true: "#86EFAC" }}
            thumbColor={isOnline ? "#00A859" : "#FFF"}
            onValueChange={toggleOnlineStatus}
            value={isOnline}
          />
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
    backgroundColor: "#000", // ✅ FIX 4: safe area black background fix
  },

  map: {
    flex: 1,
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
    paddingTop: 10,
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
});