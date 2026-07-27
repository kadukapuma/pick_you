import { Feather, Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  StatusBar,
  StyleSheet,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import GoogleRideMap from "../../components/map/GoogleRideMap";
import PassengerCancellationNotice from "../../components/PassengerCancellationNotice";
import { useDriverLocation } from "../../hooks/useDriverLocation";
import { useGoogleRoute } from "../../hooks/useGoogleRoute";
import api from "../../services/api";
import { getPickupCoordinate } from "../../utils/rideLocation";
import { getVehicleMapIcon } from "../../utils/vehicleMapIcons";

const DEFAULT_COORD = { latitude: 6.9271, longitude: 79.8612 };

const formatTimer = (totalSeconds) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const paddedMins = mins < 10 ? `0${mins}` : mins;
  const paddedSecs = secs < 10 ? `0${secs}` : secs;
  return `${paddedMins}:${paddedSecs}`;
};

const WaitingTimer = memo(function WaitingTimer() {
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsElapsed((prevSeconds) => prevSeconds + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Text style={styles.waitingClockTimer}>
      {formatTimer(secondsElapsed)}
    </Text>
  );
});

const ArrivedAtPickupScreen = ({ navigation, route }) => {
  const ride = route?.params?.ride || {};
  const pickupLat = ride?.pickupLat;
  const pickupLng = ride?.pickupLng;
  const pickupCoord = useMemo(
    () => getPickupCoordinate({ pickupLat, pickupLng }),
    [pickupLat, pickupLng],
  );
  const { location: driverCoord } = useDriverLocation();
  const cameraRef = useRef(null);
  const hasDriverLocation = Boolean(driverCoord);

  const origin = useMemo(
    () => driverCoord ?? pickupCoord ?? DEFAULT_COORD,
    [driverCoord, pickupCoord],
  );
  const destination = useMemo(
    () => pickupCoord ?? origin,
    [pickupCoord, origin],
  );
  const { directions } = useGoogleRoute(origin, destination, {
    enabled: hasDriverLocation,
  });
  const vehicleImage = useMemo(
    () => getVehicleMapIcon(ride?.vehicle_type),
    [ride?.vehicle_type],
  );

  const customerName = ride?.customerName || "John David";
  const customerProfilePicture = ride?.customerProfilePicture;
  const pickup = ride?.pickup || "Pickup";

  const minimizeToHome = useCallback(() => {
    navigation.navigate("MainTabs");
    return true;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        minimizeToHome,
      );

      return () => subscription.remove();
    }, [minimizeToHome]),
  );

  const routeCoordinates = useMemo(
    () =>
      directions?.polyline?.length > 0
        ? directions.polyline
        : pickupCoord
          ? [origin, pickupCoord]
          : [origin],
    [directions?.polyline, pickupCoord, origin],
  );
  const mapPadding = useMemo(
    () => ({ top: 180, right: 70, bottom: 300, left: 70 }),
    [],
  );

  const [isStartingRide, setIsStartingRide] = useState(false);
  const [followVehicle, setFollowVehicle] = useState(true);

  const handleRecenter = useCallback(() => {
    setFollowVehicle(true);
    cameraRef.current?.setCamera({
      centerCoordinate: [origin.longitude, origin.latitude],
      pitch: 45,
      zoomLevel: 16,
      animationDuration: 350,
    });
  }, [origin]);

  const handlePassengerOnBoard = async () => {
    if (!ride?.id || isStartingRide) return;

    setIsStartingRide(true);
    try {
      const response = await api.post(`/rides/${ride.id}/start`);
      const updatedRide = response.data?.data ?? response.data ?? ride;

      navigation.navigate("TripInProgressScreen", {
        ride: { ...ride, ...updatedRide },
      });
    } catch (error) {
      console.log("Error starting ride:", error);
      alert(
        error.response?.data?.message ||
        "Failed to start the ride. Please try again.",
      );
    } finally {
      setIsStartingRide(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />

      {/* MAP VIEWPORT */}
      <GoogleRideMap
        cameraRef={cameraRef}
        style={styles.map}
        origin={origin}
        destination={destination}
        routeCoordinates={routeCoordinates}
        showRoute={hasDriverLocation}
        routeColor="#00A859"
        destinationColor="#00A859"
        vehicleImage={vehicleImage}
        vehicleSize={46}
        edgePadding={mapPadding}
        followVehicle={followVehicle}
        followZoom={16}
        followPitch={45}
        onFollowStateChange={setFollowVehicle}
      />

      {!followVehicle ? (
        <TouchableOpacity
          style={styles.recenterButton}
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={22} color="#0F172A" />
        </TouchableOpacity>
      ) : null}

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
            <Text style={styles.inlineAddressText} numberOfLines={1}>
              {pickup}
            </Text>
          </View>
        </View>
      </View>

      {/* HEADER CONTROLS NAVIGATION ACTION ROW */}
      <SafeAreaView style={styles.header} pointerEvents="box-none">
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
              {customerProfilePicture ? (
                <Image source={{ uri: customerProfilePicture }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={26} color="#FFF" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{customerName}</Text>
            </View>
          </View>

          {/* WAITING TIMING COUNTER METRIC BOX BAR CONTAINER */}
          <View style={styles.waitingTimerBar}>
            <Text style={styles.waitingLabel}>Waiting for passenger</Text>
            <WaitingTimer />
          </View>

          {/* PROGRESSIVE PRIMARY CTA SUBMIT WORKFLOW ELEMENT */}
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={handlePassengerOnBoard}
            activeOpacity={0.9}
            disabled={isStartingRide}
          >
            <Text style={styles.actionBtnPrimaryText}>
              {isStartingRide ? "Starting Trip..." : "Passenger On Board"}
            </Text>
            <View style={styles.innerBtnArrowCircle}>
              <Feather name="chevrons-right" size={20} color="#00A859" />
            </View>
          </TouchableOpacity>
        </View>
        <SafeAreaView edges={["bottom"]} style={styles.blackBottomSafeArea} />
      </View>
      <PassengerCancellationNotice
        rideId={ride?.id}
        navigation={navigation}
        customerName={customerName}
      />
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
  recenterButton: {
    position: "absolute",
    right: 20,
    top: 190,
    zIndex: 12,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
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
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
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
