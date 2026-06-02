import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Image,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const DRIVER_COORDS = { latitude: 7.285, longitude: 80.629 };
const PICKUP_COORDS = { latitude: 7.2906, longitude: 80.6337 };
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

const ArrivedAtPickupScreen = ({ navigation, route }) => {
  const mapRef = useRef(null);
  const ride = route?.params?.ride || {};

  const customerName = ride?.customerName || "John David";
  const pickup = ride?.pickup || "Kandy City Center";
  const rating = ride?.rating || "4.9";

  // 1. Setup active state for tracking elapsed seconds
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Map Fitting Side-Effect
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates([DRIVER_COORDS, PICKUP_COORDS], {
          edgePadding: {
            top: 180,
            right: 70,
            bottom: 300,
            left: 70,
          },
          animated: true,
        });
      }, 600);
    }
  }, []);

  // 2. Active Interval Timer Hook (Increments every 1000ms)
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsElapsed((prevSeconds) => prevSeconds + 1);
    }, 1000);

    // Clean up the interval loop when component unmounts to prevent memory leaks
    return () => clearInterval(interval);
  }, []);

  // 3. Helper function to format raw seconds integers into clean MM:SS strings
  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const paddedMins = mins < 10 ? `0${mins}` : mins;
    const paddedSecs = secs < 10 ? `0${secs}` : secs;
    return `${paddedMins}:${paddedSecs}`;
  };

const handlePassengerOnBoard = () => {
  console.log("Trip Starting: Passenger is on board.");

  navigation.navigate("TripInProgressScreen", {
    ride,
  });
};

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

      {/* MAP VIEWPORT */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: (DRIVER_COORDS.latitude + PICKUP_COORDS.latitude) / 2,
          longitude: (DRIVER_COORDS.longitude + PICKUP_COORDS.longitude) / 2,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
      >
        <MapViewDirections
          origin={DRIVER_COORDS}
          destination={PICKUP_COORDS}
          apikey={GOOGLE_MAPS_API_KEY}
          strokeWidth={5}
          strokeColor="#00A859"
          optimizeWaypoints={true}
        />

        {/* DRIVER CAR VEHICLE MARKER */}
        <Marker 
          coordinate={DRIVER_COORDS} 
          anchor={{ x: 0.5, y: 0.8 }}
          flat={true}
          rotation={38}
          style={styles.markerFix}
        >
          <Image 
            source={require('../../assets/car3d.png')} 
            style={styles.driver3DVehicle}
            resizeMode="contain"
          />
        </Marker>

        {/* PICKUP TARGET LOCATION MARKER */}
        <Marker coordinate={PICKUP_COORDS} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.pickupMarkerOuter}>
            <View style={styles.pickupMarkerInner} />
          </View>
        </Marker>
      </MapView>

      {/* ARRIVED STATUS FLOATING ALERT BADGE UI CARD OVERLAY */}
      <View style={styles.arrivedStatusCardContainer} pointerEvents="box-none">
        <View style={styles.arrivedStatusCard}>
          <View style={styles.successIconCircle}>
            <Feather name="check" size={24} color="#FFF" />
          </View>
          <Text style={styles.arrivedStatusTitle}>You ve arrived</Text>
          <Text style={styles.arrivedStatusSubtitle}>at pickup location</Text>
          
          <View style={styles.inlineAddressRow}>
            <Ionicons name="location" size={14} color="#00A859" />
            <Text style={styles.inlineAddressText} numberOfLines={1}>{pickup}</Text>
          </View>
        </View>
      </View>

      {/* HEADER CONTROLS NAVIGATION ACTION ROW */}
      <SafeAreaView style={styles.header} pointerEvents="box-none">
        <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color="#0F172A" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.circleBtn} activeOpacity={0.7}>
          <Feather name="phone" size={20} color="#0F172A" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* INTERACTIVE ACTIONS ZONE BOTTOM SHEET */}
      <View style={styles.bottomSheetWrapper}>
        <View style={styles.bottomSheetContent}>
          <View style={styles.handle} />

          {/* CUSTOMER META INFO LINE ROW PANEL */}
          <View style={styles.customerRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={26} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{customerName}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color="#0F172A" style={{ marginRight: 4 }} />
                <Text style={styles.ratingText}>{rating} Customer Rating</Text>
              </View>
            </View>
          </View>

          {/* WAITING TIMING COUNTER METRIC BOX BAR CONTAINER */}
          <View style={styles.waitingTimerBar}>
            <Text style={styles.waitingLabel}>Waiting for passenger</Text>
            {/* 4. Swapped static text out for dynamic formatting helper output */}
            <Text style={styles.waitingClockTimer}>{formatTimer(secondsElapsed)}</Text>
          </View>

          {/* PROGRESSIVE PRIMARY CTA SUBMIT WORKFLOW ELEMENT */}
          <TouchableOpacity style={styles.actionBtnPrimary} onPress={handlePassengerOnBoard} activeOpacity={0.9}>
            <Text style={styles.actionBtnPrimaryText}>Passenger On Board</Text>
            <View style={styles.innerBtnArrowCircle}>
              <Feather name="chevrons-right" size={20} color="#00A859" />
            </View>
          </TouchableOpacity>
        </View>
        <SafeAreaView edges={["bottom"]} style={styles.blackBottomSafeArea} />
      </View>
    </View>
  );
};

export default ArrivedAtPickupScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  map: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 10,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  circleBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 5,
  },
  markerFix: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  driver3DVehicle: {
    width: 100,
    height: 100,
  },
  pickupMarkerOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0, 168, 89, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickupMarkerInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#00A859",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  arrivedStatusCardContainer: {
    position: "absolute",
    top: 130,
    left: 20,
    right: 20,
    zIndex: 99,
    alignItems: "center",
  },
  arrivedStatusCard: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    maxWidth: 340,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 18,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  successIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#00A859",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  arrivedStatusTitle: {
    color: "#0F172A",
    fontWeight: "800",
    fontSize: 22,
    letterSpacing: -0.3,
  },
  arrivedStatusSubtitle: {
    color: "#64748B",
    fontSize: 15,
    fontWeight: "500",
    marginTop: 2,
  },
  inlineAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 16,
    width: "100%",
  },
  inlineAddressText: {
    marginLeft: 6,
    color: "#334155",
    fontWeight: "600",
    fontSize: 13,
  },
  bottomSheetWrapper: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 24,
  },
  bottomSheetContent: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 24,
  },
  handle: {
    width: 48,
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 20,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#00A859",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  customerName: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  waitingTimerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    marginBottom: 24,
  },
  waitingLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  waitingClockTimer: {
    fontSize: 20,
    fontWeight: "800",
    color: "#00A859",
    fontVariant: ["tabular-nums"], // Keeps numbers stable and stops visual shifting layout jitters as text increments
  },
  actionBtnPrimary: {
    height: 58,
    backgroundColor: "#00A859",
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  actionBtnPrimaryText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  innerBtnArrowCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    right: 8,
  },
  blackBottomSafeArea: {
    backgroundColor: "#000000",
  },
});