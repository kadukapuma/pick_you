import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Image,
  PanResponder,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRideSearch } from "../../state/booking/RideBookingContext";
import { apiClient } from "../../services/api/client";
import {
  subscribeToRideLocation,
  type DriverLocationUpdate,
  type TrackingStatus,
} from "../../services/rides/rideRealtime";
import GoogleRideMap from "../../features/ride-booking/map/GoogleRideMap";
import RideMap from "../../features/ride-booking/map/RideMap";
import DriverOnTheWaySheet from "../../features/ride-tracking/DriverOnTheWaySheet";
import ActiveRideHeader from "../../features/ride-tracking/ActiveRideHeader";
import OnTripSheet from "../../features/ride-tracking/OnTripSheet";
import RideEventModal from "../../features/ride-tracking/RideEventModal";
import { useNearbyVehicles } from "../../services/rides/nearbyVehicles";
import { getVehicleMapIcon } from "../../utils/vehicleMapIcons";
import { getVehicleRideImage } from "../../utils/vehicleRideImages";
import {
  getRideDropoffCoordinate,
  getRidePickupCoordinate,
} from "../../features/ride-support/rideUtils";
import type { DirectionsResult } from "../../services/maps/directionsApi";
import {
  loadTripStartCoordinate,
  saveTripStartCoordinate,
  type RideSessionCoordinate,
} from "../../services/rides/rideLocationSession";
import { getRebookLocationsFromRide, saveRebookDraft } from "../../services/rides/rebookDraft";

const GREEN = "#20B768";
const DARK_GREEN = "#0b9e54";
const SCREEN_HEIGHT = Dimensions.get("window").height;
const SEARCH_COLLAPSED_HEIGHT = 350;
const SEARCH_EXPANDED_HEIGHT = Math.min(SCREEN_HEIGHT * 0.72, 700);

const SEARCH_STEPS = [
  {
    title: "Ride request sent",
    subtitle: "We are checking available drivers around your pickup.",
    footer: "Nearest drivers first",
    radius: "0.8 km",
    icon: "paper-plane" as const,
  },
  {
    title: "Searching nearby drivers",
    subtitle: "Looking for the nearest available selected vehicle.",
    footer: "Matching selected vehicle only",
    radius: "1.5 km",
    icon: "search" as const,
  },
  {
    title: "Expanding search area",
    subtitle: "Nearby selected vehicles are busy, widening the match radius.",
    footer: "Still keeping pickup time low",
    radius: "3 km",
    icon: "radio" as const,
  },
  {
    title: "Confirming a driver",
    subtitle: "A matching driver may be reviewing your trip.",
    footer: "Almost there",
    radius: "Best match",
    icon: "shield-checkmark" as const,
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
const mergeRideData = (previous: any, next: any) => {
  const merged = {
    ...(previous || {}),
    ...(next || {}),
    vehicle_type:
      next?.vehicle?.vehicle_type ||
      next?.vehicle?.vehicleType?.name ||
      next?.driver?.vehicle?.vehicle_type ||
      next?.driver?.vehicle?.vehicleType?.name ||
      next?.vehicle_type ||
      next?.fare_config?.vehicle_type ||
      next?.fareConfig?.vehicle_type ||
      previous?.vehicle_type,
  };

  // Deep-preserve driver.user: the broadcast event loads it, but the
  // HTTP poll (/rides/{id}) does not — so never overwrite a known user
  // with a null/absent one.
  if (previous?.driver?.user && !next?.driver?.user) {
    merged.driver = {
      ...(merged.driver || {}),
      user: previous.driver.user,
    };
  }

  // Same for vehicle details: keep them if poll returns vehicle without fields.
  if (
    previous?.vehicle &&
    next?.vehicle &&
    !next.vehicle.brand &&
    previous.vehicle.brand
  ) {
    merged.vehicle = {
      ...previous.vehicle,
      ...next.vehicle,
    };
  }

  return merged;
};

function getDriverName(rideData: any): string {
  // Backend: driver → user { first_name, last_name }
  const user = rideData?.driver?.user;
  if (user) {
    const full = [user.first_name, user.last_name].filter(Boolean).join(" ");
    if (full.trim()) return full.trim();
  }
  return rideData?.driver?.name || rideData?.driverName || "Your Driver";
}

function getDriverRating(rideData: any): string {
  const r =
    rideData?.driver?.rating ||
    rideData?.driver?.average_rating ||
    rideData?.driverRating;
  return r ? parseFloat(r).toFixed(1) : "4.8";
}

function getPlateNumber(rideData: any): string {
  // Backend Vehicle model field is `vehicle_number`
  return (
    rideData?.vehicle?.vehicle_number ||
    rideData?.vehicle?.plate_number ||
    rideData?.vehicle?.license_plate ||
    rideData?.driver?.vehicle?.vehicle_number ||
    rideData?.driver?.vehicle?.plate_number ||
    rideData?.driver?.vehicle?.license_plate ||
    rideData?.vehicle_number ||
    rideData?.plate_number ||
    rideData?.license_plate ||
    ""
  );
}

function getVehicleDesc(rideData: any): string {
  // Backend: Ride->vehicle is a direct relation with fields: brand, model, color, vehicle_type (appended)
  const vehicle = rideData?.vehicle || rideData?.driver?.vehicle || {};
  const brand = vehicle?.brand || vehicle?.make || "";
  const model = vehicle?.model || vehicle?.vehicle_model || "";
  const color = vehicle?.color || vehicle?.vehicle_color || "";
  const type =
    vehicle?.vehicle_type ||
    vehicle?.vehicleType?.name ||
    rideData?.driver?.vehicle?.vehicle_type ||
    rideData?.driver?.vehicle?.vehicleType?.name ||
    rideData?.vehicle_type ||
    rideData?.fare_config?.vehicle_type ||
    "";
  const parts = [color, brand, model, type].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Standard Vehicle";
}

function getEta(rideData: any): string {
  const mins =
    rideData?.eta_minutes ||
    rideData?.etaMinutes ||
    rideData?.pickup_eta ||
    rideData?.driver?.eta_minutes;
  return mins ? `${Math.round(mins)} min to pickup` : "On the way";
}

const normalizeVehicleLabel = (value?: string | null) => {
  const normalized = String(value || "car")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

  if (
    ["tuk", "tuk-tuk", "threewheel", "three-wheel", "three-wheeler"].includes(
      normalized,
    )
  )
    return "Tuk Tuk";
  if (["bike", "motorbike", "motorcycle"].includes(normalized))
    return "Motorbike";
  if (["mini", "mini-car", "minicar"].includes(normalized)) return "Mini Car";
  if (["suv", "van", "minivan"].includes(normalized)) return "Van";
  return "Car";
};

const isFreshDriverLocation = (
  location?: DriverLocationUpdate | null,
): location is DriverLocationUpdate => {
  if (
    !location ||
    location.is_stale ||
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude)
  ) return false;

  const recordedAt = Date.parse(location.recorded_at || "");
  const isRecent = !Number.isFinite(recordedAt) || Date.now() - recordedAt <= 45_000;
  const accuracy = Number(location.accuracy);
  const isAccurate = !Number.isFinite(accuracy) || accuracy <= 200;
  return isRecent && isAccurate;
};
// ─── Main Component ───────────────────────────────────────────────────────────
export default function SearchingScreen() {
  const params = useLocalSearchParams();
  const initialRideData = useMemo(
    () => (params.rideData ? JSON.parse(params.rideData as string) : null),
    [params.rideData],
  );
  const [rideData, setRideData] = useState<any>(initialRideData);
  const [searchStepIndex, setSearchStepIndex] = useState(0);
  const [isMapFocused, setIsMapFocused] = useState(false);
  const [followAcceptedVehicle, setFollowAcceptedVehicle] = useState(false);
  const [tripStartCoordinate, setTripStartCoordinate] =
    useState<RideSessionCoordinate | null>(null);
  const [activeRouteInfo, setActiveRouteInfo] =
    useState<DirectionsResult | null>(null);
  const [eventStatus, setEventStatus] = useState<string | null>(null);
  const terminalRedirectRef = useRef(false);
  const [isSearchSheetExpanded, setIsSearchSheetExpanded] = useState(false);
  const searchSheetHeight = useRef(new Animated.Value(SEARCH_COLLAPSED_HEIGHT)).current;
  const searchSheetGestureStart = useRef(SEARCH_COLLAPSED_HEIGHT);
  const [driverLocation, setDriverLocation] =
    useState<DriverLocationUpdate | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>({
    connected: false,
    stale: true,
  });
  const alertShownRef = useRef(false);
  const latestDriverLocationRef = useRef<DriverLocationUpdate | null>(null);
  const capturedTripStartRef = useRef(false);
  const lastEventStatusRef = useRef(
    initialRideData?.status
      ? String(initialRideData.status).toUpperCase()
      : "REQUESTED",
  );
  const rideId = Number(rideData?.id || initialRideData?.id || 0);
  const insets = useSafeAreaInsets();
  const {
    setActiveRide,
    setIsSearchingForDriver,
    resetTrip,
    outboundTrip,
    setOutboundPickup,
    setOutboundDropoff,
    paymentMethod,
    promoCode,
  } = useRideSearch();

  const rideStatus = String(rideData?.status || "REQUESTED").toUpperCase();
  const paymentStatus = String(rideData?.payment?.payment_status || "").toUpperCase();
  const isAccepted = ["ACCEPTED", "ARRIVED", "STARTED"].includes(rideStatus);
  const isCancelled = ["CANCELLED", "CANCELED"].includes(rideStatus);
  const isTerminal = rideStatus === "COMPLETED" || paymentStatus === "COMPLETED";
  const captureTripStart = useCallback(
    (location?: DriverLocationUpdate | null) => {
      if (capturedTripStartRef.current || !isFreshDriverLocation(location)) return;
      const startedAt = Date.parse(rideData?.started_at || rideData?.startedAt || "" );
      const recordedAt = Date.parse(location.recorded_at || "" );
      if (
        Number.isFinite(startedAt) &&
        Number.isFinite(recordedAt) &&
        recordedAt + 5_000 < startedAt
      ) return;
      const coordinate = {
        latitude: location.latitude,
        longitude: location.longitude,
      };
      capturedTripStartRef.current = true;
      setTripStartCoordinate(coordinate);
      void saveTripStartCoordinate(rideId, coordinate);
    },
    [rideData?.startedAt, rideData?.started_at, rideId],
  );

  useEffect(() => {
    if (lastEventStatusRef.current === rideStatus) return;
    lastEventStatusRef.current = rideStatus;
    if (rideStatus === "STARTED") {
      setFollowAcceptedVehicle(true);
      setIsMapFocused(false);
      captureTripStart(latestDriverLocationRef.current);

    }
  }, [captureTripStart, rideId, rideStatus]);

  useEffect(() => {
    if (rideStatus === "STARTED") setFollowAcceptedVehicle(true);
  }, [rideStatus]);

  useEffect(() => {
    let cancelled = false;
    capturedTripStartRef.current = false;
    if (!rideId) return;
    loadTripStartCoordinate(rideId).then((coordinate) => {
      if (!cancelled && coordinate && !capturedTripStartRef.current) {
        setTripStartCoordinate(coordinate);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [rideId]);

  useEffect(() => {
    if (rideStatus !== "STARTED") return;
    captureTripStart(driverLocation);
  }, [captureTripStart, driverLocation, rideStatus]);

  const setSearchSheetPosition = useCallback((expanded: boolean) => {
    setIsSearchSheetExpanded(expanded);
    Animated.spring(searchSheetHeight, {
      toValue: expanded ? SEARCH_EXPANDED_HEIGHT : SEARCH_COLLAPSED_HEIGHT,
      damping: 24,
      stiffness: 210,
      mass: 0.9,
      useNativeDriver: false,
    }).start();
  }, [searchSheetHeight]);

  const searchSheetPanResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > 7 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderGrant: () => {
        searchSheetHeight.stopAnimation();
        searchSheetGestureStart.current = isSearchSheetExpanded
          ? SEARCH_EXPANDED_HEIGHT
          : SEARCH_COLLAPSED_HEIGHT;
      },
      onPanResponderMove: (_, gesture) => {
        const nextHeight = searchSheetGestureStart.current - gesture.dy;
        searchSheetHeight.setValue(
          Math.max(
            SEARCH_COLLAPSED_HEIGHT,
            Math.min(SEARCH_EXPANDED_HEIGHT, nextHeight),
          ),
        );
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -45 || gesture.vy < -0.35) setSearchSheetPosition(true);
        else if (gesture.dy > 45 || gesture.vy > 0.35) setSearchSheetPosition(false);
        else setSearchSheetPosition(isSearchSheetExpanded);
      },
      onPanResponderTerminate: () => setSearchSheetPosition(isSearchSheetExpanded),
    }),
    [isSearchSheetExpanded, searchSheetHeight, setSearchSheetPosition],
  );

  useEffect(() => {
    if (!isAccepted && isMapFocused) setIsMapFocused(false);
  }, [isAccepted, isMapFocused]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!isMapFocused) return false;
      setIsMapFocused(false);
      return true;
    });
    return () => subscription.remove();
  }, [isMapFocused]);

  const currentSearchStep = SEARCH_STEPS[searchStepIndex];
  const requestedVehicleType =
    rideData?.vehicle_type ||
    outboundTrip.selectedRide?.id ||
    outboundTrip.selectedRide?.name ||
    "car";
  const requestedVehicleLabel = normalizeVehicleLabel(requestedVehicleType);

  // ── Search animations ────────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 1500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 0,
          useNativeDriver: false,
        }),
      ]),
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [pulseAnim]);

  useEffect(() => {
    if (isAccepted || isCancelled || isTerminal) return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const nextIndex = Math.min(
        SEARCH_STEPS.length - 1,
        elapsedSeconds < 6
          ? 0
          : elapsedSeconds < 14
            ? 1
            : elapsedSeconds < 26
              ? 2
              : 3,
      );
      setSearchStepIndex(nextIndex);
    }, 1000);

    return () => clearInterval(timer);
  }, [isAccepted, isCancelled, isTerminal]);
  // ── Ride polling ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!rideId) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const acceptRideUpdate = (ride: any) => {
      if (cancelled || !ride) return;
      const status = String(ride.status || "").toUpperCase();
      setRideData((previous: any) => {
        const merged = mergeRideData(previous, ride);
        if (status === "COMPLETED" && !terminalRedirectRef.current) {
          terminalRedirectRef.current = true;
          const nextPaymentStatus = String(merged?.payment?.payment_status || "").toUpperCase();
          const nextEventStatus = nextPaymentStatus === "COMPLETED" ? "PAID" : status;
          setTimeout(() => {
            router.replace({
              pathname: "/ride-tracking",
              params: {
                rideData: JSON.stringify({
                  ...merged,
                  selected_payment_method:
                    merged?.selected_payment_method || paymentMethod,
                }),
                eventStatus: nextEventStatus,
              },
            });
          }, 0);
        }
        if (
          ["CANCELLED", "CANCELED"].includes(status) &&
          merged?.cancelled_by === "driver" &&
          !terminalRedirectRef.current &&
          !alertShownRef.current
        ) {
          setEventStatus(status);
        }
        return merged;
      });
      setActiveRide(rideId, status);
      if (
        ["ACCEPTED", "ARRIVED", "STARTED", "COMPLETED", "CANCELLED", "CANCELED"].includes(
          status,
        )
      ) {
        setIsSearchingForDriver(false);
        if (!alertShownRef.current) {
          alertShownRef.current = true;
        }
      }
    };

    subscribeToRideLocation(
      rideId,
      (location) => {
        latestDriverLocationRef.current = location;
        setDriverLocation(location);
      },
      setTrackingStatus,
      acceptRideUpdate,
    )
      .then((cleanup) => {
        unsubscribe = cleanup;
      })
      .catch((e) => console.log("Realtime setup failed:", e));

    const fetchRide = async () => {
      const response = await apiClient.get<any>(`/rides/${rideId}`, {
        suppressErrorLog: true,
      });
      if (response.success && response.data) acceptRideUpdate(response.data);
    };

    fetchRide();
    const pollTimer = setInterval(fetchRide, 5000);
    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      unsubscribe?.();
    };
  }, [paymentMethod, rideId, setActiveRide, setIsSearchingForDriver]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleShowDriver = () => {
    if (!rideData || !isAccepted) return;
    setIsMapFocused(true);
  };

  const handleCancel = async () => {
    if (!rideId || rideStatus === "STARTED") return;
    router.push({
      pathname: "/ride-booking/cancel-reason",
      params: { rideId: String(rideId) },
    });
  };

  const handleBookAnother = async () => {
    if (!isCancelled) {
      resetTrip();
      router.replace("/(app)/(tabs)/home");
      return;
    }

    const { pickup, destination } = getRebookLocationsFromRide(rideData);
    if (pickup && destination) {
      await saveRebookDraft(pickup, destination);
      setOutboundPickup(pickup);
      setOutboundDropoff(destination);
      setActiveRide(null, null);
      setIsSearchingForDriver(false);
      router.replace({
        pathname: "/ride-booking/select-vehicle",
        params: {
          pickup: JSON.stringify(pickup),
          destination: JSON.stringify(destination),
          rebook: "1",
        },
      });
      return;
    }

    resetTrip();
    router.replace("/ride-booking");
  };

  // ── Progress segments ─────────────────────────────────────────────────────
  const ProgressSegments = () => (
    <View
      style={styles.segmentsWrap}
      accessibilityRole="progressbar"
      accessibilityLabel="Searching for a driver"
    >
      <View style={styles.segmentsRow}>
      {SEARCH_STEPS.map((step, i) => {
        const isDone = i < searchStepIndex;
        const isCurrent = i === searchStepIndex;
        return (
          <View
            key={step.title}
            style={[
              styles.progressSegment,
              isDone && styles.progressSegmentDone,
              isCurrent && styles.progressSegmentCurrent,
            ]}
          />
        );
      })}
      </View>
      <View style={styles.progressCaptionRow}>
        <View style={styles.progressLiveDot} />
        <Text style={styles.progressCaption}>Searching securely nearby</Text>
      </View>
    </View>
  );

  const pickupCoord = useMemo(
    () =>
      getRidePickupCoordinate(rideData) ||
      outboundTrip.pickup ||
      { latitude: 6.9271, longitude: 79.8612 },
    [outboundTrip.pickup, rideData],
  );
  const dropoffCoord = useMemo(
    () => getRideDropoffCoordinate(rideData) || outboundTrip.dropoff || null,
    [outboundTrip.dropoff, rideData],
  );
  const acceptedVehicleLocation = useMemo(() => {
    if (
      driverLocation &&
      Number.isFinite(driverLocation.latitude) &&
      Number.isFinite(driverLocation.longitude)
    ) return driverLocation;
    return null;
  }, [driverLocation]);
  const searchingNearbyVehicles = useNearbyVehicles(
    pickupCoord,
    rideData?.vehicle_type || outboundTrip.selectedRide?.id,
  );
  const acceptedDriverVehicle = useMemo(
    () =>
      acceptedVehicleLocation
        ? [
            {
              id: `accepted-driver-${rideId || "active"}`,
              coordinate: acceptedVehicleLocation,
              vehicleType: requestedVehicleType,
              heading: acceptedVehicleLocation.heading ?? 0,
            },
          ]
        : [],
    [acceptedVehicleLocation, requestedVehicleType, rideId],
  );
  const driverName = getDriverName(rideData);
  const driverRating = getDriverRating(rideData);
  const plateNumber = getPlateNumber(rideData);
  const vehicleDesc = getVehicleDesc(rideData);
  const eta = getEta(rideData);
  const pickupAddress =
    rideData?.pickup_address ||
    rideData?.pickup?.address ||
    outboundTrip.pickup?.address ||
    "Pickup Location";
  const dropoffAddress =
    rideData?.drop_address ||
    rideData?.dropoff_address ||
    rideData?.dropoff?.address ||
    outboundTrip.dropoff?.address ||
    "Destination";
  const handleRouteInfoChange = useCallback(
    (route: DirectionsResult | null) => setActiveRouteInfo(route),
    [],
  );

  // ── Sheet translateY (slides up from bottom) ──────────────────────────────
  // ── Status header color ───────────────────────────────────────────────────
  const statusLabel =
    rideStatus === "ARRIVED"
      ? "Driver arrived"
      : rideStatus === "STARTED"
        ? "Trip started"
        : "Driver on the way";

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ── MAP BACKGROUND ────────────────────────────────────────────── */}
      <View style={styles.mapWrap}>
        {isAccepted ? (
          <RideMap
            style={styles.map}
            location={pickupCoord}
            destination={rideStatus === "STARTED" ? dropoffCoord : null}
            driverLocation={acceptedVehicleLocation}
            nearbyVehicles={acceptedDriverVehicle}
            rideStatus={rideStatus}
            followVehicle={followAcceptedVehicle && !!acceptedVehicleLocation}
            onFollowStateChange={setFollowAcceptedVehicle}
            showFocusControls
            focusControlsTop={rideStatus === "STARTED" ? 166 : 150}
            showDriverMarker={false}
            vehicleImage={getVehicleMapIcon(
              rideData?.vehicle?.vehicle_type ||
                rideData?.vehicle?.vehicleType?.name ||
                rideData?.driver?.vehicle?.vehicle_type ||
                rideData?.driver?.vehicle?.vehicleType?.name ||
                rideData?.vehicle_type,
            )}
            tripStartCoordinate={tripStartCoordinate}
            includePickupInFocus={rideStatus !== "STARTED"}
            onRouteInfoChange={handleRouteInfoChange}
            fitEdgePadding={
              isMapFocused
                ? { top: 110, right: 55, bottom: 130, left: 55 }
                : rideStatus === "STARTED"
                  ? { top: 170, right: 55, bottom: 225, left: 55 }
                  : { top: 120, right: 65, bottom: 330, left: 65 }
            }
          />
        ) : (
          <GoogleRideMap
            style={styles.map}
            pickup={pickupCoord}
            routeCoordinates={[]}
            nearbyVehicles={searchingNearbyVehicles}
            fitEdgePadding={{ top: 120, right: 80, bottom: 360, left: 80 }}
          />
        )}
        {!isAccepted && !isCancelled && !isTerminal && (
          <>
            <Animated.View
              style={[
                styles.pulseCircle,
                {
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.5],
                    outputRange: [0.6, 0],
                  }),
                },
              ]}
            />
            <View style={styles.pickupMarker}>
              <View style={styles.pickupDot} />
              <View style={styles.pickupLabel}>
                <Text style={styles.pickupLabelText}>Pickup</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* ── TOP BAR ───────────────────────────────────────────────────── */}
      {rideStatus === "STARTED" ? (
        <ActiveRideHeader
          title={
            activeRouteInfo?.durationText
              ? `${activeRouteInfo.durationText} remaining`
              : "Trip in progress"
          }
          subtitle={`Heading to ${dropoffAddress}`}
          distanceText={activeRouteInfo?.distanceText}
          onBack={() => router.replace("/(app)/(tabs)/trips")}
          onCall={() =>
            router.push({
              pathname: "/ride-tracking/contact-driver",
              params: { rideData: JSON.stringify(rideData) },
            })
          }
        />
      ) : (
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            if (isMapFocused) {
              setIsMapFocused(false);
              return;
            }
            if (isAccepted) {
              router.replace("/(app)/(tabs)/home");
              return;
            }
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        {!isAccepted && !isTerminal && (
          <TouchableOpacity style={styles.pillBtn} onPress={handleBookAnother}>
            <Text style={styles.pillBtnText}>Book Another Ride</Text>
          </TouchableOpacity>
        )}
        {!isAccepted && !isCancelled && !isTerminal && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
      )}

      {/* ── SEARCHING BOTTOM SHEET (shown when !isAccepted) ──────────── */}
      {!isAccepted && !isCancelled && !isTerminal && (
        <Animated.View
          style={[
            styles.searchSheet,
            {
              height: searchSheetHeight,
              paddingBottom: 16,
            },
          ]}
        >
          <View {...searchSheetPanResponder.panHandlers} style={styles.searchSheetHandleArea}>
            <View style={styles.searchSheetHandle} />
            <View style={styles.searchSheetHintRow}>
              <Ionicons
                name={isSearchSheetExpanded ? "chevron-down" : "chevron-up"}
                size={14}
                color={GREEN}
              />
              <Text style={styles.searchSheetHintText}>
                {isSearchSheetExpanded ? "Show less" : "More search details"}
              </Text>
            </View>
          </View>
          <View style={styles.sheetTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusEyebrow}>
                Ride request #{rideId || "new"}
              </Text>
              <Text style={styles.statusTitle}>{currentSearchStep.title}</Text>
              <Text
                style={styles.statusSubtitle}
                numberOfLines={isSearchSheetExpanded ? undefined : 1}
              >
                {currentSearchStep.subtitle}
              </Text>
            </View>
            <View style={styles.roundIcon}>
              <Ionicons name={currentSearchStep.icon} size={24} color={GREEN} />
              <View style={styles.magnifierWrap}>
                <Ionicons name="search" size={12} color={GREEN} />
              </View>
            </View>
          </View>

          <ProgressSegments />

          {isSearchSheetExpanded && (
            <View style={styles.searchMetaRow}>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Search radius</Text>
                <Text style={styles.metaValue}>{currentSearchStep.radius}</Text>
              </View>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>Pickup</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {pickupAddress.split(",")[0]}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.selectedVehicleCard}>
            <View style={styles.selectedVehicleIconWrap}>
              <Image
                source={getVehicleRideImage(requestedVehicleType)}
                style={styles.selectedVehicleImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.selectedVehicleTextWrap}>
              <Text style={styles.selectedVehicleLabel}>Selected ride</Text>
              <Text style={styles.selectedVehicleName} numberOfLines={1}>
                {requestedVehicleLabel}
              </Text>
            </View>
            <View style={styles.matchingBadge}>
              <View style={styles.matchingDot} />
              <Text style={styles.matchingBadgeText}>Matching</Text>
            </View>
          </View>

          {isSearchSheetExpanded && (
            <View style={styles.footerRow}>
              <Text style={styles.footerSub}>{currentSearchStep.footer}</Text>
              <Text style={styles.footerVehicleText}>
                {requestedVehicleLabel} drivers only
              </Text>
            </View>
          )}
        </Animated.View>
      )}

      {isCancelled && (
        <View
          style={[styles.searchSheet, { paddingBottom: 26 }]}
        >
          <View style={styles.cancelledStateCard}>
            <View style={styles.cancelledIconWrap}>
              <Ionicons name="alert-circle-outline" size={30} color="#B45309" />
            </View>
            <Text style={styles.cancelledTitle}>
              {rideData?.cancelled_by === "driver" ? "Driver Cancelled" : "No driver accepted"}
            </Text>
            <Text style={styles.cancelledMessage}>
              {rideData?.cancelled_by === "driver"
                ? "Unfortunately, the driver has cancelled the ride."
                : `Your ${requestedVehicleLabel} request was closed before a driver accepted it. Try again with a nearby pickup or another vehicle type.`}
            </Text>
            <TouchableOpacity
              style={styles.cancelledPrimaryButton}
              activeOpacity={0.86}
              onPress={handleBookAnother}
            >
              <Text style={styles.cancelledPrimaryText}>Book another ride</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Driver accepted / on the way sheet */}
      {isAccepted && rideStatus !== "STARTED" && (
        <DriverOnTheWaySheet
          rideData={rideData}
          statusLabel={statusLabel}
          eta={eta}
          driverName={driverName}
          driverRating={driverRating}
          plateNumber={plateNumber}
          vehicleDesc={vehicleDesc}
          vehicleType={requestedVehicleType}
          pickupAddress={pickupAddress}
          dropoffAddress={dropoffAddress}
          paymentMethod={paymentMethod}
          promoCode={promoCode}
          fareAmount={
            outboundTrip.selectedRide?.price ||
            rideData?.estimated_fare ||
            rideData?.fare_estimate
          }
          distanceText={
            rideData?.distance_text || rideData?.distanceText || null
          }
          durationText={
            rideData?.duration_text || rideData?.durationText || null
          }
          bottomInset={0}
          trackingConnected={trackingStatus.connected}
          trackingStale={trackingStatus.stale}
          mapFocused={isMapFocused}
          rideStatus={rideStatus}
          onCancelTrip={handleCancel}
          onShowDetails={() => setIsMapFocused(false)}
        />
      )}
      {rideStatus === "STARTED" && (
        <OnTripSheet
          destination={dropoffAddress}
          durationText={activeRouteInfo?.durationText}
          distanceText={activeRouteInfo?.distanceText}
          driverName={driverName}
          plateNumber={plateNumber}
          connected={trackingStatus.connected}
          stale={trackingStatus.stale}
          onSafety={() => router.push("/ride-tracking/safety")}
          onDriver={() =>
            router.push({
              pathname: "/ride-tracking/driver-profile",
              params: { rideData: JSON.stringify(rideData) },
            })
          }
          onDetails={() =>
            router.push({
              pathname: "/ride-details/[rideId]",
              params: { rideId: String(rideId) },
            })
          }
        />
      )}
      <RideEventModal
        visible={Boolean(eventStatus)}
        status={eventStatus}
        cancelledBy={rideData?.cancelled_by}
        onClose={() => setEventStatus(null)}
        primaryLabel={rideData?.cancelled_by === "driver" ? "Book again" : undefined}
        onPrimary={() => {
          if (rideData?.cancelled_by === "driver") {
            void handleBookAnother();
            return;
          }
          setEventStatus(null);
        }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  mapWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  map: { ...StyleSheet.absoluteFillObject },

  pulseCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(32, 183, 104, 0.25)",
    position: "absolute",
  },
  pickupMarker: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  pickupDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GREEN,
    borderWidth: 3,
    borderColor: "#fff",
  },
  pickupLabel: {
    backgroundColor: GREEN,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
  },
  pickupLabelText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Top Bar
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  pillBtn: {
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 4,
    marginHorizontal: 8,
  },
  pillBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  cancelBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 4,
  },
  cancelText: { color: "#374151", fontSize: 13, fontWeight: "700" },

  // Searching sheet
  searchSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 8,
    paddingHorizontal: 24,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  searchSheetHandleArea: {
    alignItems: "center",
    paddingBottom: 7,
  },
  searchSheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D7E2DE",
  },
  searchSheetHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },
  searchSheetHintText: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
  },
  sheetTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  statusEyebrow: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  searchMetaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    marginBottom: 12,
  },
  metaCard: {
    flex: 1,
    minHeight: 62,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  metaLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 3,
  },
  metaValue: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
  cancelledStateCard: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelledIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cancelledTitle: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  cancelledMessage: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  cancelledPrimaryButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  cancelledPrimaryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  selectedVehicleCard: {
    minHeight: 68,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(32,183,104,0.22)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 12,
  },
  selectedVehicleIconWrap: {
    width: 64,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#E8F8F0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  selectedVehicleImage: {
    width: 58,
    height: 40,
  },
  selectedVehicleTextWrap: {
    flex: 1,
  },
  selectedVehicleLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 2,
  },
  selectedVehicleName: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
  },
  matchingBadge: {
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E8F8F0",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  matchingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  matchingBadgeText: {
    color: "#0B3D2E",
    fontSize: 11,
    fontWeight: "900",
  },
  vehicleChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  vehicleChip: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  vehicleChipActive: {
    backgroundColor: "#E8F8F0",
    borderColor: "rgba(32,183,104,0.22)",
  },
  vehicleChipText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
  },
  vehicleChipTextActive: {
    color: "#0B3D2E",
  },
  innerActiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  stepNow: {
    color: GREEN,
    fontSize: 11,
    fontWeight: "900",
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  statusSubtitle: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    paddingRight: 8,
  },
  searchStepsList: {
    gap: 10,
    marginTop: -8,
    marginBottom: 18,
  },
  searchStepRow: {
    minHeight: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchStepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  searchStepDotActive: {
    backgroundColor: GREEN,
    shadowColor: GREEN,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  searchStepDotDone: {
    backgroundColor: DARK_GREEN,
  },
  searchStepText: {
    flex: 1,
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700",
  },
  searchStepTextActive: {
    color: "#111827",
    fontWeight: "900",
  },
  roundIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  magnifierWrap: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  segmentsWrap: {
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  segmentsRow: {
    flexDirection: "row",
    gap: 7,
  },
  progressSegment: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#E7EEEB",
    overflow: "hidden",
  },
  progressSegmentCurrent: {
    backgroundColor: GREEN,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 2,
  },
  progressSegmentDone: {
    backgroundColor: DARK_GREEN,
  },
  progressCaptionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 7,
  },
  progressLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  progressCaption: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
  },
  footerSub: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  footerVehicleText: { fontSize: 12, color: GREEN, fontWeight: "900" },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  retryText: { fontSize: 13, fontWeight: "700", color: "#B45309" },

  // Driver bottom sheet (animated)
  driverSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 24,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    overflow: "hidden",
  },
  handleArea: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },

  // Collapsed card area
  collapsedCard: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  statusHeaderRow: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
  },
  driverStatusTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  driverEta: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F3F4F6",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  vehicleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  plateText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.5,
  },
  vehicleDescText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },
  actionBtns: {
    flexDirection: "row",
    gap: 10,
    marginLeft: 8,
  },
  actionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E8F5EE",
    justifyContent: "center",
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  driverNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  ratingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },

  // Expanded section
  expandedContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  tripCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  tripCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  tripCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  editTripBtn: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  editTripText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  upChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: DARK_GREEN,
    justifyContent: "center",
    alignItems: "center",
  },
  numChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
  },
  numChipText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  tripAddressText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },

  cancelTripBtn: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  cancelTripText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },

  // Info rows
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
  },
  infoRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  infoRowText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  changeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },

  // Tip
  tipSection: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  tipSub: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 14,
  },
  tipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tipChip: {
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  tipChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  tipChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  tipChipTextActive: {
    color: "#fff",
  },

  // View map button
  viewMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: DARK_GREEN,
    borderRadius: 24,
    paddingVertical: 14,
    marginTop: 20,
  },
  viewMapText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});

