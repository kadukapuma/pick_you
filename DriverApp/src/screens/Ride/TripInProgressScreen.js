import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    BackHandler,
    Dimensions,
    Image,
    Linking,
    PanResponder,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { useFocusEffect } from "@react-navigation/native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useDriverLocation } from "../../hooks/useDriverLocation";
import { useGoogleRoute } from "../../hooks/useGoogleRoute";
import api from "../../services/api";
import { clearActiveRideLocationSync } from "../../services/driverLocationSync";
import {
    getDestinationCoordinate,
    getDropCoordinate,
    getPickupCoordinate,
    isReturnTrip,
} from "../../utils/rideLocation";
import { getVehicleMapIcon } from "../../utils/vehicleMapIcons";
import GoogleRideMap from "../../components/map/GoogleRideMap";
import PassengerCancellationNotice from "../../components/PassengerCancellationNotice";

const { width, height } = Dimensions.get("window");

const DEFAULT_COORD = { latitude: 6.9271, longitude: 79.8612 };

// Dynamic constraints for the slider mechanics
const SLIDER_WIDTH = width - 40; // Adjusted for padding calculation (20px on each side)
const THUMB_SIZE = 50;

const formatRideDurationMinutes = (minutes) => {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return null;

  const rounded = Math.max(1, Math.round(value));
  return rounded === 1 ? "1 min" : `${rounded} mins`;
};

const getRideDurationFallback = (ride) =>
  ride?.durationText ||
  ride?.duration_text ||
  ride?.time ||
  formatRideDurationMinutes(
    ride?.actual_duration_minutes || ride?.estimated_duration_minutes,
  );

const splitDurationText = (durationText) => {
  const text = String(durationText || "").trim();
  if (!text || text.toLowerCase() === "updating") {
    return { value: "--", unit: "min" };
  }

  const compactLessThanMinute = text.match(/^<\s*1\s*(min|mins|minute|minutes)$/i);
  if (compactLessThanMinute) {
    return { value: "<1", unit: "min" };
  }

  const numericMinutes = text.match(/^(\d+)\s*(min|mins|minute|minutes)$/i);
  if (numericMinutes) {
    return { value: numericMinutes[1], unit: numericMinutes[2].startsWith("minute") ? "min" : numericMinutes[2] };
  }

  const [value, ...unitParts] = text.split(/\s+/);
  return { value, unit: unitParts.join(" ") };
};

const TripInProgressScreen = ({ navigation, route }) => {
  useKeepAwake();
  const insets = useSafeAreaInsets();

  const ride = route?.params?.ride || {};
  const customerName = ride?.customerName || "John David";
  const customerProfilePicture = ride?.customerProfilePicture;
  const customerPhone = ride?.customerPhone;
  const isReturn = isReturnTrip(ride);

  // Return trip lifecycle, driven by the backend (not GPS proximity) - the
  // driver explicitly marks arrival at the destination, then either starts
  // the return leg or the passenger ends the ride there. See
  // return_trip_feature.md and RideStateMachine.php (WAITING/RETURNING).
  const [rideStatus, setRideStatus] = useState(ride?.status || "STARTED");
  const phase = !isReturn
    ? "oneway"
    : rideStatus === "WAITING"
      ? "at_destination"
      : rideStatus === "RETURNING"
        ? "returning"
        : "to_destination";

  const handleCallCustomer = useCallback(() => {
    if (!customerPhone) {
      Alert.alert("Unavailable", "Passenger phone number is not available yet.");
      return;
    }
    Linking.openURL(`tel:${customerPhone}`);
  }, [customerPhone]);
  const summaryDistanceKm = Number(
    ride?.actual_distance_km || ride?.estimated_distance_km || ride?.distance_km || 0,
  );
  const summaryFare = Number(ride?.final_fare || ride?.estimated_fare || 0);
  const dropLat = ride?.dropLat;
  const dropLng = ride?.dropLng;
  const destinationLat = ride?.destinationLat;
  const destinationLng = ride?.destinationLng;
  const pickupLat = ride?.pickupLat;
  const pickupLng = ride?.pickupLng;
  const dropCoord = useMemo(
    () => getDropCoordinate({ dropLat, dropLng }),
    [dropLat, dropLng],
  );
  const destinationCoord = useMemo(
    () => getDestinationCoordinate({ destinationLat, destinationLng }),
    [destinationLat, destinationLng],
  );
  const pickupCoord = useMemo(
    () => getPickupCoordinate({ pickupLat, pickupLng }),
    [pickupLat, pickupLng],
  );
  const { location: driverCoord } = useDriverLocation();
  const cameraRef = useRef(null);
  // No active navigation while parked at the destination - there's nowhere
  // to route to until the driver starts the return leg.
  const hasRouteOrigin = phase !== "at_destination" && Boolean(driverCoord || pickupCoord);

  // Where the driver is actually headed right now, and what to call it.
  // - to_destination: driving to the return-trip destination
  // - at_destination: parked, waiting for "Start Return" or an early end
  // - returning: driving back to the pickup point
  // - oneway: the normal one-way drop
  const navTargetCoord =
    phase === "to_destination" || phase === "at_destination"
      ? destinationCoord
      : phase === "returning"
        ? pickupCoord
        : dropCoord;
  const destinationLabel =
    phase === "to_destination" || phase === "at_destination"
      ? ride?.destination || "Destination"
      : phase === "returning"
        ? "Pickup (return)"
        : ride?.drop || "Destination";

  // The map pin at navTargetCoord must not be styled as a generic "drop" pin
  // for a return trip: the mid-trip stop is a waypoint the driver comes back
  // from (not a drop), and the final stop is pickup and drop at once, since
  // a return trip's drop_* is always forced equal to pickup_* server-side.
  const navMarkerColor =
    phase === "to_destination" || phase === "at_destination"
      ? "#7C3AED"
      : phase === "returning"
        ? "#00A859"
        : "#EF4444";
  const navMarkerLabel =
    phase === "to_destination" || phase === "at_destination"
      ? "RETURN POINT"
      : phase === "returning"
        ? "PICKUP & DROP"
        : "DROP";

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

  const origin = useMemo(
    () => driverCoord ?? pickupCoord ?? DEFAULT_COORD,
    [driverCoord, pickupCoord],
  );
  const destination = useMemo(
    () => navTargetCoord ?? origin,
    [navTargetCoord, origin],
  );
  const { directions } = useGoogleRoute(origin, destination, {
    enabled: hasRouteOrigin,
  });
  const vehicleImage = useMemo(
    () => getVehicleMapIcon(ride?.vehicle_type),
    [ride?.vehicle_type],
  );
  const currentStep = directions?.currentStep || directions?.steps?.[0] || null;
  const durationText =
    directions?.durationText ||
    getRideDurationFallback(ride) ||
    "Updating";
  const etaDisplay = splitDurationText(durationText);
  const remainingDistanceText =
    directions?.distanceText ||
    (summaryDistanceKm > 0 ? `${summaryDistanceKm.toFixed(1)} km` : "Distance pending");
  const maneuverDistanceText =
    currentStep?.distanceText ||
    directions?.distanceText ||
    "Updating";
  const maneuverInstruction =
    phase === "at_destination"
      ? "Waiting to start the return leg"
      : currentStep?.instruction ||
        (directions?.distanceText
          ? `Continue to ${destinationLabel}`
          : "Calculating route to destination");

  const routeCoordinates = useMemo(
    () =>
      directions?.polyline?.length > 0
        ? directions.polyline
        : navTargetCoord
          ? [origin, navTargetCoord]
          : [origin],
    [directions?.polyline, navTargetCoord, origin],
  );
  const mapPadding = useMemo(
    () => ({ top: 160, right: 50, bottom: 220, left: 50 }),
    [],
  );

  // --- SLIDER MECHANICS & ANIMATIONS ---
  const slideX = useRef(new Animated.Value(0)).current;
  const [isActionRunning, setIsActionRunning] = useState(false);
  const completedRef = useRef(false);
  const actionInFlightRef = useRef(false);
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

  const progressWidth = slideX.interpolate({
    inputRange: [0, SLIDER_WIDTH - THUMB_SIZE - 10],
    outputRange: [0, SLIDER_WIDTH],
    extrapolate: "clamp",
  });

  const resetSlider = useCallback(() => {
    completedRef.current = false;
    Animated.spring(slideX, {
      toValue: 0,
      useNativeDriver: false,
      tension: 40,
      friction: 7,
    }).start();
  }, [slideX]);

  const handleCompleteTrip = useCallback(async () => {
    if (!ride?.id || actionInFlightRef.current) return;

    actionInFlightRef.current = true;
    setIsActionRunning(true);
    try {
      const response = await api.post(`/rides/${ride.id}/complete`);
      const completedRide = response.data?.data ?? response.data ?? ride;

      // Tracking cleanup must not block a successfully completed ride from
      // reaching its receipt/payment screen.
      clearActiveRideLocationSync().catch((cleanupError) => {
        console.log("Could not stop active ride location tracking:", cleanupError);
      });

      navigation.replace("TripCompletedScreen", {
        ride: { ...ride, ...completedRide },
      });
    } catch (error) {
      console.log("Error completing ride:", error.response?.data || error);
      alert(
        error.response?.data?.message ||
          "Failed to complete ride. Please try again.",
      );
      resetSlider();
    } finally {
      actionInFlightRef.current = false;
      setIsActionRunning(false);
    }
  }, [navigation, resetSlider, ride]);

  const handleEndAtDestination = useCallback(() => {
    if (!ride?.id || actionInFlightRef.current) return;

    Alert.alert(
      "End ride here?",
      "The passenger will be charged only for the distance to this point — not the return leg. Confirm the passenger has agreed to end the trip here.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "End Ride Here", style: "destructive", onPress: handleCompleteTrip },
      ],
    );
  }, [handleCompleteTrip, ride?.id]);

  const handleArriveDestination = useCallback(async () => {
    if (!ride?.id || actionInFlightRef.current) return;

    actionInFlightRef.current = true;
    setIsActionRunning(true);
    try {
      const response = await api.post(`/rides/${ride.id}/arrive-destination`);
      const updated = response.data?.data ?? response.data;
      setRideStatus(updated?.status || "WAITING");
      resetSlider();
    } catch (error) {
      console.log("Error marking arrival at destination:", error.response?.data || error);
      alert(
        error.response?.data?.message ||
          "Could not mark arrival at the destination. Please try again.",
      );
      resetSlider();
    } finally {
      actionInFlightRef.current = false;
      setIsActionRunning(false);
    }
  }, [resetSlider, ride?.id]);

  const handleStartReturn = useCallback(async () => {
    if (!ride?.id || actionInFlightRef.current) return;

    actionInFlightRef.current = true;
    setIsActionRunning(true);
    try {
      const response = await api.post(`/rides/${ride.id}/start-return`);
      const updated = response.data?.data ?? response.data;
      setRideStatus(updated?.status || "RETURNING");
      // The slider was last left parked at the far right from the earlier
      // "arrived at destination" slide (see handleArriveDestination) - this
      // phase reuses that same slider for "Slide to Complete Trip", so it
      // must be explicitly reset or the thumb renders stuck on the right.
      resetSlider();
    } catch (error) {
      console.log("Error starting return leg:", error.response?.data || error);
      alert(
        error.response?.data?.message ||
          "Could not start the return leg. Please try again.",
      );
    } finally {
      actionInFlightRef.current = false;
      setIsActionRunning(false);
    }
  }, [resetSlider, ride?.id]);

  // The slider always drives the single "forward" action for the current
  // phase - mark arrived at the destination, or complete the trip. Starting
  // the return leg and ending early at the destination are separate buttons
  // shown only in the at_destination phase (see the render below).
  const handleSliderAction = phase === "to_destination" ? handleArriveDestination : handleCompleteTrip;

  // panResponder below is created once (useRef) but the action it should
  // trigger changes across phases - route through a ref so its closure
  // always calls the current handler without recreating the gesture
  // responder.
  const handleSliderActionRef = useRef(handleSliderAction);
  useEffect(() => {
    handleSliderActionRef.current = handleSliderAction;
  }, [handleSliderAction]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderMove: (_, gestureState) => {
        if (completedRef.current || actionInFlightRef.current) return;

        let dx = gestureState.dx;
        const maxSlide = SLIDER_WIDTH - THUMB_SIZE - 10; // offset account for inner padding boundaries

        if (dx < 0) dx = 0;
        if (dx > maxSlide) dx = maxSlide;

        slideX.setValue(dx);
      },

      onPanResponderRelease: (_, gestureState) => {
        if (completedRef.current || actionInFlightRef.current) return;

        const maxSlide = SLIDER_WIDTH - THUMB_SIZE - 10;
        const reachedEnd = gestureState.dx > SLIDER_WIDTH * 0.7;

        if (reachedEnd) {
          Animated.timing(slideX, {
            toValue: maxSlide,
            duration: 200,
            useNativeDriver: false,
          }).start(async () => {
            completedRef.current = true;
            // Trigger physical haptic response frame execution
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );

            handleSliderActionRef.current();
          });
        } else {
          Animated.spring(slideX, {
            toValue: 0,
            useNativeDriver: false,
            tension: 40,
            friction: 7,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <View style={styles.container}>
      {/* Hides device taskbar information values completely */}
      <StatusBar hidden={true} />

      {/* TOP NAVIGATION HUD OVERLAY */}
      <SafeAreaView
        style={[styles.navHeaderContainer, { paddingTop: insets.top || 12 }]}
        pointerEvents="box-none"
      >
        <View style={styles.googleNavBanner}>
          <View style={styles.maneuverIconContainer}>
            <MaterialCommunityIcons
              name="arrow-split-vertical"
              size={32}
              color="#FFFFFF"
              style={styles.turnIconFlip}
            />
          </View>
          <View style={styles.maneuverTextContainer}>
            <Text style={styles.maneuverDistance}>{maneuverDistanceText}</Text>
            <Text style={styles.maneuverInstruction} numberOfLines={1}>
              {maneuverInstruction}
            </Text>
          </View>
          <TouchableOpacity style={styles.navPhoneBtn} activeOpacity={0.7} onPress={handleCallCustomer}>
            <Feather name="phone" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.floatingTripStateBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.floatingBadgeText}>
            {phase === "at_destination"
              ? "AT DESTINATION"
              : phase === "returning"
                ? "RETURNING TO PICKUP"
                : "ON TRIP"}
          </Text>
        </View>
      </SafeAreaView>

      {/* MAP VIEWER INTERACTIVE SYSTEM */}
      <GoogleRideMap
        cameraRef={cameraRef}
        style={styles.mapViewport}
        origin={origin}
        destination={destination}
        routeCoordinates={routeCoordinates}
        showRoute={hasRouteOrigin}
        routeColor="#2F80ED"
        destinationColor={navMarkerColor}
        destinationLabel={navMarkerLabel}
        vehicleImage={vehicleImage}
        vehicleSize={46}
        edgePadding={mapPadding}
        followVehicle={followVehicle}
        followZoom={16}
        followPitch={45}
        onFollowStateChange={setFollowVehicle}
      />

      {/* FLOATING ACTION UTILITIES */}
      <View style={styles.mapFloatingControls} pointerEvents="box-none">
        <TouchableOpacity style={styles.mapUtilityBtn} activeOpacity={0.8}>
          <MaterialCommunityIcons
            name="layers-outline"
            size={22}
            color="#334155"
          />
        </TouchableOpacity>
        {!followVehicle ? (
          <TouchableOpacity
            style={styles.mapUtilityBtn}
            activeOpacity={0.8}
            onPress={handleRecenter}
          >
            <Ionicons name="locate" size={22} color="#334155" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* DRIVER NAVIGATION BOTTOM CARD */}
      <View style={[styles.navBottomSheet, { bottom: insets.bottom || 16 }]}>
        {/* Customer Basic Details Meta Deck */}
        <View style={styles.customerTopHeaderRow}>
          <View style={styles.customerAvatarMiniFrame}>
            {customerProfilePicture ? (
              <Image source={{ uri: customerProfilePicture }} style={styles.customerAvatarMiniImage} />
            ) : (
              <Ionicons name="person" size={14} color="#475569" />
            )}
          </View>
          <Text style={styles.customerHeaderNameText} numberOfLines={1}>
            {customerName}
          </Text>
        </View>

        {/* Journey Duration & Distance Row */}
        <View style={styles.navSummaryRow}>
          <View style={styles.etaContainer}>
            <Text style={styles.etaTextValue}>{etaDisplay.value}</Text>
            <Text style={styles.etaUnitLabel}>{etaDisplay.unit}</Text>
          </View>

          <View style={styles.summaryMetaContainer}>
            <Text style={styles.summaryMetaText}>
              {remainingDistanceText} • Rs.{" "}
              {summaryFare > 0 ? summaryFare.toFixed(2) : "0.00"}
            </Text>
            <Text style={styles.summaryDestinationName} numberOfLines={1}>
              To: {destinationLabel}
            </Text>
          </View>

          <View style={styles.closeMapBtnPlaceholder} />
        </View>

        <View style={styles.sheetDivider} />

        {phase === "at_destination" ? (
          /* AT DESTINATION: start the return leg, or the passenger ends
             the trip here instead - billed only for the outbound distance. */
          <View style={styles.atDestinationActions}>
            <TouchableOpacity
              style={[styles.startReturnBtn, isActionRunning && styles.disabledBtn]}
              onPress={handleStartReturn}
              disabled={isActionRunning}
              activeOpacity={0.85}
            >
              {isActionRunning ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="corner-up-left" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.startReturnBtnText}>Start Return Trip</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.endHereBtn}
              onPress={handleEndAtDestination}
              disabled={isActionRunning}
              activeOpacity={0.7}
            >
              <Text style={styles.endHereBtnText}>Passenger ending trip here</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* SWIPABLE INTERACTION TRACK ELEMENT */
          <View style={styles.sliderContainer}>
            <View style={styles.sliderTrack}>
              <Text style={styles.sliderText}>
                {phase === "to_destination"
                  ? "Slide when Arrived at Destination"
                  : "Slide to Complete Trip"}
              </Text>

              {/* Glowing inner colored progress layout fill */}
              <Animated.View
                style={[styles.sliderGlowFill, { width: progressWidth }]}
              />

              {/* Interactive Thumb Trigger Element */}
              <Animated.View
                style={[
                  styles.sliderThumb,
                  { transform: [{ translateX: slideX }] },
                ]}
                {...panResponder.panHandlers}
              >
                {isActionRunning ? (
                  <ActivityIndicator size="small" color="#00A859" />
                ) : (
                  <Feather name="chevrons-right" size={22} color="#00A859" />
                )}
              </Animated.View>
            </View>
          </View>
        )}
      </View>

      {/* Pure black backdrop alignment plate to isolate dynamic software notch fields */}
      <View
        style={[
          styles.safeAreaBottomFillBlack,
          { height: insets.bottom || 16 },
        ]}
      />
      <PassengerCancellationNotice
        rideId={ride?.id}
        navigation={navigation}
        customerName={customerName}
      />
    </View>
  );
};

export default TripInProgressScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  mapViewport: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  navHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 12,
  },
  googleNavBanner: {
    backgroundColor: "#00A859",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  maneuverIconContainer: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  turnIconFlip: {
    transform: [{ scaleX: -1 }],
  },
  maneuverTextContainer: {
    flex: 1,
  },
  maneuverDistance: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  maneuverInstruction: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 1,
  },
  navPhoneBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  floatingTripStateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginLeft: 8,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2F80ED",
    marginRight: 6,
  },
  floatingBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  navigationLocationArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2F80ED",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  navDestPinOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(239, 68, 68, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  navDestPinInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  mapFloatingControls: {
    position: "absolute",
    right: 16,
    top: height * 0.3,
    zIndex: 5,
  },
  mapUtilityBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  navBottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 24,
  },
  customerTopHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 14,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  customerAvatarMiniFrame: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    overflow: "hidden",
  },
  customerAvatarMiniImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  customerHeaderNameText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    maxWidth: width * 0.5,
  },
  navSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  etaContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginRight: 16,
  },
  etaTextValue: {
    fontSize: 32,
    fontWeight: "900",
    color: "#00A859",
    letterSpacing: -1,
  },
  etaUnitLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00A859",
    marginLeft: 2,
  },
  summaryMetaContainer: {
    flex: 1,
  },
  summaryMetaText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  summaryDestinationName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 1,
  },
  closeMapBtnPlaceholder: {
    width: 36,
    height: 36,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 14,
  },
  // --- INTEGRATED INTERACTIVE SWIPE SLIDER STYLES ---
  sliderContainer: {
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  sliderTrack: {
    width: SLIDER_WIDTH,
    height: 56,
    backgroundColor: "#0F172A",
    borderRadius: 16,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  sliderText: {
    position: "absolute",
    alignSelf: "center",
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "700",
    zIndex: 2,
  },
  sliderGlowFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 168, 89, 0.35)",
    borderRadius: 16,
  },
  sliderThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    left: 5,
    top: 3,
    zIndex: 3,
    shadowColor: "#00A859",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  atDestinationActions: {
    paddingTop: 4,
    paddingBottom: 8,
    gap: 10,
  },
  startReturnBtn: {
    flexDirection: "row",
    backgroundColor: "#00A859",
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00A859",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  disabledBtn: {
    opacity: 0.55,
  },
  startReturnBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  endHereBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  endHereBtnText: {
    color: "#94A3B8",
    fontWeight: "600",
    fontSize: 13,
    textDecorationLine: "underline",
  },
  safeAreaBottomFillBlack: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9,
    backgroundColor: "#000000",
  },
});
