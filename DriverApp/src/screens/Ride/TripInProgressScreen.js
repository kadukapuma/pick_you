import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    PanResponder,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
// Using Mapbox for routing - removing react-native-maps to avoid Google Maps API dependency
// import MapView, { Marker, Polyline } from "react-native-maps";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useDriverLocation } from "../../hooks/useDriverLocation";
import { useMapboxRoute } from "../../hooks/useMapboxRoute";
import api from "../../services/api";
import {
    getDropCoordinate,
    getPickupCoordinate,
} from "../../utils/rideLocation";

const { width, height } = Dimensions.get("window");

const DEFAULT_COORD = { latitude: 6.9271, longitude: 79.8612 };

// Dynamic constraints for the slider mechanics
const SLIDER_WIDTH = width - 40; // Adjusted for padding calculation (20px on each side)
const THUMB_SIZE = 50;

const TripInProgressScreen = ({ navigation, route }) => {
  const mapRef = useRef(null);
  const insets = useSafeAreaInsets();

  const ride = route?.params?.ride || {};
  const customerName = ride?.customerName || "John David";
  const destinationLabel = ride?.drop || "Destination";
  const dropCoord = getDropCoordinate(ride);
  const pickupCoord = getPickupCoordinate(ride);
  const { location: driverCoord } = useDriverLocation();

  const origin = driverCoord ?? pickupCoord ?? DEFAULT_COORD;
  const destination = dropCoord ?? origin;
  const { directions } = useMapboxRoute(origin, destination);

  const routeCoordinates =
    directions?.polyline?.length > 0
      ? directions.polyline
      : dropCoord
        ? [origin, dropCoord]
        : [origin];

  useEffect(() => {
    if (!mapRef.current || routeCoordinates.length < 2) return;

    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 160, right: 50, bottom: 220, left: 50 },
        animated: true,
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [directions]);

  // --- SLIDER MECHANICS & ANIMATIONS ---
  const slideX = useRef(new Animated.Value(0)).current;
  const [completed, setCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const progressWidth = slideX.interpolate({
    inputRange: [0, SLIDER_WIDTH - THUMB_SIZE - 10],
    outputRange: [0, SLIDER_WIDTH],
    extrapolate: "clamp",
  });

  const handleCompleteTrip = async () => {
    if (!ride?.id || isCompleting) return;

    setIsCompleting(true);
    try {
      await api.post(`/rides/${ride.id}/complete`);
      navigation.navigate("TripCompletedScreen", { ride });
    } catch (error) {
      console.log("Error completing ride:", error);
      alert(
        error.response?.data?.message ||
          "Failed to complete ride. Please try again.",
      );
      setCompleted(false);
      slideX.setValue(0);
    } finally {
      setIsCompleting(false);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderMove: (_, gestureState) => {
        if (completed) return;

        let dx = gestureState.dx;
        const maxSlide = SLIDER_WIDTH - THUMB_SIZE - 10; // offset account for inner padding boundaries

        if (dx < 0) dx = 0;
        if (dx > maxSlide) dx = maxSlide;

        slideX.setValue(dx);
      },

      onPanResponderRelease: (_, gestureState) => {
        if (completed || isCompleting) return;

        const maxSlide = SLIDER_WIDTH - THUMB_SIZE - 10;
        const reachedEnd = gestureState.dx > SLIDER_WIDTH * 0.7;

        if (reachedEnd) {
          Animated.timing(slideX, {
            toValue: maxSlide,
            duration: 200,
            useNativeDriver: false,
          }).start(async () => {
            setCompleted(true);

            // Trigger physical haptic response frame execution
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );

            handleCompleteTrip();
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
            <Text style={styles.maneuverDistance}>In 500 meters</Text>
            <Text style={styles.maneuverInstruction} numberOfLines={1}>
              Merge onto AB16 / {destinationLabel}
            </Text>
          </View>
          <TouchableOpacity style={styles.navPhoneBtn} activeOpacity={0.7}>
            <Feather name="phone" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.floatingTripStateBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.floatingBadgeText}>ON TRIP</Text>
        </View>
      </SafeAreaView>

      {/* MAP VIEWER INTERACTIVE SYSTEM */}
      <MapView
        ref={mapRef}
        style={styles.mapViewport}
        initialRegion={{
          latitude: (origin.latitude + destination.latitude) / 2,
          longitude: (origin.longitude + destination.longitude) / 2,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }}
      >
        <Polyline
          coordinates={routeCoordinates}
          strokeWidth={6}
          strokeColor="#2F80ED"
          lineCap="round"
          lineJoin="round"
        />

        <Marker coordinate={origin} anchor={{ x: 0.5, y: 0.5 }} rotation={145}>
          <View style={styles.navigationLocationArrow}>
            <MaterialCommunityIcons
              name="navigation"
              size={20}
              color="#FFFFFF"
            />
          </View>
        </Marker>

        {dropCoord ? (
          <Marker coordinate={dropCoord} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.navDestPinOuter}>
              <View style={styles.navDestPinInner} />
            </View>
          </Marker>
        ) : null}
      </MapView>

      {/* FLOATING ACTION UTILITIES */}
      <View style={styles.mapFloatingControls} pointerEvents="box-none">
        <TouchableOpacity style={styles.mapUtilityBtn} activeOpacity={0.8}>
          <MaterialCommunityIcons
            name="layers-outline"
            size={22}
            color="#334155"
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.mapUtilityBtn} activeOpacity={0.8}>
          <Ionicons name="compass-outline" size={22} color="#334155" />
        </TouchableOpacity>
      </View>

      {/* DRIVER NAVIGATION BOTTOM CARD */}
      <View style={[styles.navBottomSheet, { bottom: insets.bottom || 16 }]}>
        {/* Customer Basic Details Meta Deck */}
        <View style={styles.customerTopHeaderRow}>
          <View style={styles.customerAvatarMiniFrame}>
            <Ionicons name="person" size={14} color="#475569" />
          </View>
          <Text style={styles.customerHeaderNameText} numberOfLines={1}>
            {customerName}
          </Text>
        </View>

        {/* Journey Duration & Distance Row */}
        <View style={styles.navSummaryRow}>
          <View style={styles.etaContainer}>
            <Text style={styles.etaTextValue}>12</Text>
            <Text style={styles.etaUnitLabel}>min</Text>
          </View>

          <View style={styles.summaryMetaContainer}>
            <Text style={styles.summaryMetaText}>6.2 km • Rs. 850</Text>
            <Text style={styles.summaryDestinationName} numberOfLines={1}>
              To: {destinationLabel}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeMapBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="x" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.sheetDivider} />

        {/* SWIPABLE INTERACTION TRACK ELEMENT */}
        <View style={styles.sliderContainer}>
          <View style={styles.sliderTrack}>
            <Text style={styles.sliderText}>Slide to Arrive or Complete</Text>

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
              {isCompleting ? (
                <ActivityIndicator size="small" color="#00A859" />
              ) : (
                <Feather name="chevrons-right" size={22} color="#00A859" />
              )}
            </Animated.View>
          </View>
        </View>
      </View>

      {/* Pure black backdrop alignment plate to isolate dynamic software notch fields */}
      <View
        style={[
          styles.safeAreaBottomFillBlack,
          { height: insets.bottom || 16 },
        ]}
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
  closeMapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
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
  safeAreaBottomFillBlack: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9,
    backgroundColor: "#000000",
  },
});
