import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Image,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMapboxRoute } from "../../hooks/useMapboxRoute";
import { useDriverLocation } from "../../hooks/useDriverLocation";
import { getPickupCoordinate } from "../../utils/rideLocation";

const { width, height } = Dimensions.get("window");

const DEFAULT_COORD = { latitude: 6.9271, longitude: 79.8612 };

const PickupNavigationScreen = ({ navigation, route }) => {
  const mapRef = useRef(null);
  const ride = route?.params?.ride || {};
  const pickupCoord = getPickupCoordinate(ride);
  const { location: driverCoord } = useDriverLocation();

  const origin = driverCoord ?? DEFAULT_COORD;
  const destination = pickupCoord ?? origin;
  const { directions } = useMapboxRoute(origin, destination);

  const customerName = ride?.customerName || "John David";
  const pickup = ride?.pickup || "Pickup";
  const rating = ride?.rating || "4.9";

  const routeCoordinates =
    directions?.polyline?.length > 0
      ? directions.polyline
      : pickupCoord
        ? [origin, pickupCoord]
        : [origin];

  useEffect(() => {
    if (!mapRef.current) return;

    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(routeCoordinates, {
        edgePadding: {
          top: 140,
          right: 70,
          bottom: 360,
          left: 70,
        },
        animated: true,
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [directions]);

  const handleArrived = () => {
    navigation.navigate("ArrivedAtPickupScreen", { ride });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

      {/* MAP VIEWPORT */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: (origin.latitude + destination.latitude) / 2,
          longitude: (origin.longitude + destination.longitude) / 2,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
      >
        <Polyline
          coordinates={routeCoordinates}
          strokeWidth={5}
          strokeColor="#00A859"
          lineCap="round"
          lineJoin="round"
        />

        {/* DRIVER CAR VEHICLE MARKER - Explicit size fixed here */}
        <Marker
          coordinate={origin}
          anchor={{ x: 0.5, y: 0.5 }}
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
        {pickupCoord ? (
        <Marker coordinate={pickupCoord} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.pickupMarkerOuter}>
            <View style={styles.pickupMarkerInner} />
          </View>
        </Marker>
        ) : null}
      </MapView>

      {/* FLOATING CORNER ETA STATUS DETAILS */}
      <View style={styles.etaCardContainer} pointerEvents="none">
        <View style={styles.etaCard}>
          <View style={styles.etaLineRow}>
            <MaterialCommunityIcons name="car-sports" size={18} color="#00A859" style={styles.etaIconSpace} />
            <Text style={styles.etaTitle}>Driver Heading To Pickup</Text>
          </View>
          <View style={[styles.etaLineRow, { marginTop: 4, marginLeft: 28 }]}>
            <Text style={styles.etaSubtitle}>
              {directions
                ? `${directions.durationText} away (${directions.distanceText} remaining)`
                : "4 min away (2.3 km remaining)"}
            </Text>
          </View>
        </View>
      </View>

      {/* HEADER CONTROLS NAVIGATION ACTION ROW */}
      <SafeAreaView style={styles.header} pointerEvents="box-none">
        <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color="#0F172A" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* INTERACTIVE ACTIONS ZONE BOTTOM SHEET */}
      <View style={styles.bottomSheetWrapper}>
        <View style={styles.bottomSheetContent}>
          <View style={styles.handle} />

          <View style={styles.customerRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={26} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{customerName}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>{rating} Customer Rating</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.inlineNavCircle} activeOpacity={0.7}>
              <Feather name="navigation" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View style={styles.pickupCard}>
            <View style={styles.pickupIndicatorColumn}>
              <View style={styles.greenDotIndicator} />
              <View style={styles.verticalLineIndicator} />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.pickupLabel}>Pickup Location</Text>
              <Text style={styles.pickupText} numberOfLines={1}>{pickup}</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
              <Feather name="phone" size={18} color="#0F172A" />
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
              <Feather name="message-square" size={18} color="#0F172A" />
              <Text style={styles.actionText}>Message</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.arrivedBtn} onPress={handleArrived} activeOpacity={0.9}>
            <Text style={styles.arrivedText}>Arrived at Pickup</Text>
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

export default PickupNavigationScreen;

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
    width: 80, // Giving explicit structural sizing constraints directly to the Marker component
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  driver3DVehicle: {
    width: 75,
    height: 75,
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
  etaCardContainer: {
    position: "absolute",
    top: 130,
    left: 20,
    right: 20,
    zIndex: 99,
  },
  etaCard: {
    backgroundColor: "#0D1B1E",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    alignSelf: "flex-start",
  },
  etaLineRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  etaIconSpace: {
    marginRight: 10,
  },
  etaTitle: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: -0.1,
  },
  etaSubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
  },
  handle: {
    width: 48,
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 18,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#00A859",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  customerName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  inlineNavCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  pickupCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pickupIndicatorColumn: {
    alignItems: "center",
    justifyContent: "center",
    width: 16,
  },
  greenDotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00A859",
  },
  verticalLineIndicator: {
    width: 1.5,
    height: 12,
    backgroundColor: "#E2E8F0",
    marginTop: 4,
  },
  pickupLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  pickupText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  actionBtn: {
    width: "48%",
    height: 52,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: {
    marginLeft: 8,
    fontWeight: "700",
    fontSize: 14,
    color: "#0F172A",
  },
  arrivedBtn: {
    height: 56,
    backgroundColor: "#00A859",
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  arrivedText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  innerBtnArrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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