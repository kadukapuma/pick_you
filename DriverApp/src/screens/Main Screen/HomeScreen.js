import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { AnimatePresence, MotiView } from "moti";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import IncomingRideModal from "../../components/IncomingRideModel";
import GoogleRideMap from "../../components/map/GoogleRideMap";
import { useDriverLocation } from "../../hooks/useDriverLocation";
import api from "../../services/api";
import {
  setActiveRideLocationSync,
  startDriverLocationSync,
  stopDriverLocationSync,
} from "../../services/driverLocationSync";
import {
  connectRideRealtime,
  disconnectRideRealtime,
  enableRideFallbackSync,
  syncPendingRideOnce,
} from "../../services/rideRealtime";
import { normalizeRidePayload } from "../../utils/rideLocation";
import { getVehicleMapIcon } from "../../utils/vehicleMapIcons";

const DEFAULT_DRIVER_COORD = { latitude: 6.9271, longitude: 79.8612 };
const IS_AVAILABILITY_TOGGLE_DISABLED = false;

const getActiveVehicleType = (driver) => {
  const activeVehicle =
    driver?.vehicles?.find((vehicle) => vehicle?.is_active) ??
    driver?.vehicles?.[0];

  return (
    activeVehicle?.vehicle_type ||
    activeVehicle?.vehicleType?.name ||
    driver?.vehicle_type ||
    null
  );
};

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const cameraRef = useRef(null);
  const {
    location: driverCoord,
    loading: isLocationLoading,
    error: locationError,
  } = useDriverLocation();
  const mapOrigin = driverCoord ?? DEFAULT_DRIVER_COORD;

  const [isOnline, setIsOnline] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState("disconnected");
  const [showRideModal, setShowRideModal] = useState(false);
  const [rideData, setRideData] = useState(null);
  const [isRideHandled, setIsRideHandled] = useState(false);
  const [isAcceptingRide, setIsAcceptingRide] = useState(false);
  const [driverId, setDriverId] = useState(null);
  const [driverVehicleType, setDriverVehicleType] = useState(null);
  const [screenError, setScreenError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const toastTimerRef = useRef(null);
  const lastNotifiedRideIdRef = useRef(null);
  const isRideHandledRef = useRef(false);

  useEffect(() => {
    isRideHandledRef.current = isRideHandled;
  }, [isRideHandled]);

  // --- REFINED PREMIUM TOAST SYSTEM ---
  const [toast, setToast] = useState({
    visible: false,
    type: "success",
    message: "",
  });

  const showCustomToast = (type, message, duration = 35000) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ visible: true, type, message });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, duration);
  };

  useFocusEffect(
    useCallback(() => {
      try {
        StatusBar.setBarStyle("dark-content", true);
        StatusBar.setBackgroundColor("#fff", true);
        StatusBar.setTranslucent(false);
        StatusBar.setHidden(false);

        // Reset ride handling refs when screen comes into focus
        lastNotifiedRideIdRef.current = null;
        setIsRideHandled(false);
        isRideHandledRef.current = false;

        fetchDriverData();
      } catch (err) {
        console.error("❌ useFocusEffect error:", err);
        setScreenError("Failed to initialize home screen");
      }
      return () => {};
    }, []),
  );

  const presentIncomingRide = useCallback((ride) => {
    if (!ride?.id) {
      if (__DEV__) console.warn("presentIncomingRide: missing ride id", ride);
      return;
    }

    const rideId = Number(ride.id);
    if (
      isRideHandledRef.current ||
      Number(lastNotifiedRideIdRef.current) === rideId
    ) {
      if (__DEV__) {
        console.log("presentIncomingRide: skipped duplicate/handled", rideId);
      }
      return;
    }

    if (__DEV__)
      console.log("presentIncomingRide: showing modal for ride", rideId);

    // Show UI first — do not wait for sound or network
    setShowRideModal(true);
    setRideData(ride);
    setIsAcceptingRide(false);
    lastNotifiedRideIdRef.current = rideId;
    setIsRideHandled(false);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setShowRideModal(false);
      setRideData(null);
      lastNotifiedRideIdRef.current = null;
    }, 12000);
  }, []);

  // WebSocket-first ride delivery (no 5s polling — scales to large fleets)
  // WebSocket + GPS while online (socket stays warm — popup is instant when a ride is broadcast)
  useEffect(() => {
    if (!isOnline || !driverId) {
      try {
        disconnectRideRealtime();
        stopDriverLocationSync();
      } catch (err) {
        console.log("Error disconnecting services:", err);
      }
      setWsConnected(false);
      setRealtimeStatus("disconnected");
      lastNotifiedRideIdRef.current = null;
      return;
    }

    let cancelled = false;

    const startOnlineServices = async () => {
      try {
        startDriverLocationSync();

        await connectRideRealtime(driverId, {
          onRide: (ride) => {
            if (!cancelled) presentIncomingRide(ride);
          },
          onConnectionChange: (connected) => {
            if (!cancelled) setWsConnected(connected);
          },
          onStatusChange: (status) => {
            if (!cancelled) setRealtimeStatus(status);
          },
        });
      } catch (err) {
        console.log("Ride realtime connect error:", err?.message || err);
        if (!cancelled) {
          setWsConnected(false);
          setRealtimeStatus("fallback");
          try {
            enableRideFallbackSync();
            await syncPendingRideOnce();
          } catch (fallbackErr) {
            console.log("Fallback sync error:", fallbackErr);
          }
        }
      }
    };

    startOnlineServices();

    return () => {
      cancelled = true;
      try {
        disconnectRideRealtime();
        stopDriverLocationSync();
      } catch (err) {
        console.log("Error in cleanup:", err);
      }
    };
  }, [isOnline, driverId, presentIncomingRide]);

  // Clean up any pending timers when component unmounts
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const getStatusSubtitle = () => {
    if (!isOnline) return "Go online to start earning";
    if (wsConnected) return "Live - trips arrive instantly";
    if (realtimeStatus === "auth_error") return "Live auth failed - checking trips...";
    if (realtimeStatus === "fallback") return "Looking for trips...";
    return "Connecting to live trips...";
  };

  const fetchDriverData = async () => {
    try {
      console.log("🔵 Fetching driver data...");
      const response = await api.get("/user");
      const payload = response.data?.data ?? response.data ?? {};
      const userObj = payload.user ?? payload;
      const driverObj = payload.driver ?? userObj.driver;
      console.log("✅ Driver data fetched:", driverObj?.id);

      if (!driverObj) {
        throw new Error("No driver data returned from server");
      }

      setIsOnline(false);
      setDriverId(driverObj?.id || null);
      setDriverVehicleType(getActiveVehicleType(driverObj));
      setScreenError(null);
    } catch (error) {
      console.error("❌ Error fetching driver data:", error.message || error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      setScreenError(error.message || "Failed to load driver data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRide = async () => {
    if (!rideData?.id || isAcceptingRide) return;
    const rideId = rideData.id;
    setIsAcceptingRide(true);

    try {
      const acceptRes = await api.post(`/rides/${rideId}/accept`);
      const acceptedRide = acceptRes.data?.data ?? acceptRes.data;
      const rideForNav = acceptedRide
        ? normalizeRidePayload({ ...rideData, ...acceptedRide })
        : rideData;

      setShowRideModal(false);
      setRideData(null);
      setIsAcceptingRide(false);
      lastNotifiedRideIdRef.current = null;
      setIsRideHandled(true);
      navigation.navigate("RideDetails", { ride: rideForNav });

      setActiveRideLocationSync(rideId).catch((syncErr) => {
        console.log("Could not start active ride location sync:", syncErr);
      });

      api.get(`/rides/${rideId}`).catch((detailErr) => {
        console.log("Could not refresh ride details:", detailErr);
      });
    } catch (error) {
      console.log("Error accepting ride:", error);
      setIsAcceptingRide(false);
      showCustomToast(
        "error",
        error.response?.data?.message || "Failed to accept ride.",
      );
    }
  };

  const handleRejectRide = async () => {
    if (!rideData?.id || isAcceptingRide) return;
    const rideId = rideData.id;

    // Dismiss modal and prevent re‑showing this ride request
    setShowRideModal(false);
    setRideData(null);
    setIsAcceptingRide(false);
    lastNotifiedRideIdRef.current = null;
    setIsRideHandled(true); // mark as handled to stop looping

    try {
      console.log("🔔 Driver rejecting ride request:", rideId);
      await api.post(`/rides/${rideId}/reject`);
    } catch (error) {
      console.log("Error rejecting ride request on backend:", error);
    }
  };

  const handleToggleAvailability = async (newValue) => {
    if (IS_AVAILABILITY_TOGGLE_DISABLED) return;

    setIsToggling(true);
    try {
      await api.put("/driver/availability", {
        is_active: newValue,
      });

      setIsOnline(newValue);
      showCustomToast(
        "success",
        newValue
          ? "You are now online. Searching for trips..."
          : "You are now offline. Enjoy your break!",
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

  // Center Map Viewport cleanly over Driver Coordinates
  const handleCenterLocation = () => {
    if (cameraRef.current && mapOrigin) {
      cameraRef.current.setCamera({
        centerCoordinate: [mapOrigin.longitude, mapOrigin.latitude],
        zoomLevel: 15,
        animationDuration: 600,
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#fff"
        translucent={false}
      />

      {/* ERROR STATE */}
      {screenError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Error Loading Home</Text>
          <Text style={styles.errorMessage}>{screenError}</Text>
          <TouchableOpacity
            style={styles.errorRetryBtn}
            onPress={() => {
              setScreenError(null);
              fetchDriverData();
            }}
          >
            <Text style={styles.errorRetryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* LOADING STATE */}
      {isLoading && !screenError && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00A859" />
          <Text style={styles.loadingText}>Loading home screen...</Text>
        </View>
      )}

      {/* MAIN CONTENT - Only show if no error and not loading */}
      {!screenError && !isLoading && (
        <>
          {/* MAP VIEWPORT */}
          <View style={styles.map}>
            <GoogleRideMap
              cameraRef={cameraRef}
              style={styles.map}
              origin={mapOrigin}
              routeCoordinates={[mapOrigin]}
              vehicleImage={getVehicleMapIcon(
                rideData?.vehicle_type || driverVehicleType,
              )}
              vehicleHeading={mapOrigin.heading ?? 0}
              vehicleSize={70}
            />

            {(isLocationLoading || locationError) && (
              <View style={styles.mapStatusPill} pointerEvents="none">
                {isLocationLoading ? (
                  <ActivityIndicator size="small" color="#00A859" />
                ) : (
                  <Feather name="map-pin" size={14} color="#EF4444" />
                )}
                <Text style={styles.mapStatusText} numberOfLines={1}>
                  {isLocationLoading
                    ? "Finding your location..."
                    : "Location unavailable"}
                </Text>
              </View>
            )}
          </View>

          {/* --- TOP HEADER ROW --- */}
          <SafeAreaView
            style={[styles.topContainer, { paddingTop: insets.top }]}
          >
            <View style={styles.headerRow}>
              {/* TODAY'S EARNINGS DISPLAY SHEET */}
              <View style={styles.earningsCard}>
                <Text style={styles.earningsLabel}>Todays Earnings</Text>
                <Text style={styles.earningsAmount}>LKR 0.00</Text>
              </View>

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
          <View style={[styles.rightButtons, { bottom: 265 + insets.bottom }]}>
            <TouchableOpacity style={styles.floatingBtn} onPress={handleCenterLocation}>
              <Ionicons name="locate" size={22} color="#00A859" />
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
                  {
                    bottom:
                      Platform.OS === "android" ? 225 : 205 + insets.bottom,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusIndicatorIndicator,
                    {
                      backgroundColor:
                        toast.type === "error" ? "#EF4444" : "#00A859",
                    },
                  ]}
                />
                <View style={styles.toastContentContainer}>
                  <Text style={styles.toastTitleText}>
                    {toast.type === "error"
                      ? "System Update Fail"
                      : "Status Changed"}
                  </Text>
                  <Text style={styles.toastBodyText}>{toast.message}</Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    setToast((prev) => ({ ...prev, visible: false }))
                  }
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
              { bottom: Platform.OS === "android" ? 82 : 62 + insets.bottom },
            ]}
          >
            <View style={styles.statusCard}>
              <View>
                <Text style={styles.statusTitle}>
                  {isOnline ? "You're Online" : "You're Offline"}
                </Text>
                <Text style={styles.statusSubtitle}>{getStatusSubtitle()}</Text>
              </View>

              {isToggling ? (
                <ActivityIndicator size="large" color="#00A859" />
              ) : (
                <Switch
                  trackColor={{ false: "#CBD5E1", true: "#86EFAC" }}
                  thumbColor={isOnline ? "#00A859" : "#FFF"}
                  onValueChange={handleToggleAvailability}
                  value={isOnline}
                  disabled={IS_AVAILABILITY_TOGGLE_DISABLED || isToggling}
                />
              )}
            </View>
          </SafeAreaView>

          {/* --- INCOMING RIDE REQUEST SHEET OVERLAY --- */}
          <IncomingRideModal
            visible={showRideModal}
            rideData={rideData}
            onAccept={handleAcceptRide}
            onReject={handleRejectRide}
            isAccepting={isAcceptingRide}
          />
        </>
      )}
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
    backgroundColor: "#f5f5f5",
  },
  mapStatusPill: {
    position: "absolute",
    top: 112,
    alignSelf: "center",
    maxWidth: "78%",
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  mapStatusText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
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
  earningsCard: {
    backgroundColor: "#FFF",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    alignItems: "flex-start",
    minWidth: 150,
  },
  earningsLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  earningsAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  notificationButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
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
    gap: 2,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
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
  requestContainer: {
    position: "absolute",
    width: "100%",
    alignItems: "center",
  },
  requestCard: {
    width: "90%",
    backgroundColor: "#0F172A",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    elevation: 8,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  requestTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  requestSubtitle: {
    marginTop: 2,
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  requestDetails: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 14,
  },
  requestLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 10,
  },
  requestValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 3,
  },
  requestMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  requestMeta: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "700",
  },
  requestActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  viewRequestBtn: {
    flex: 1,
    backgroundColor: "#1E293B",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  viewRequestText: {
    color: "#E2E8F0",
    fontWeight: "800",
  },
  acceptRequestBtn: {
    flex: 1,
    backgroundColor: "#00A859",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
  },
  acceptRequestText: {
    color: "#FFF",
    fontWeight: "800",
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
  errorContainer: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#EF4444",
    marginBottom: 12,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  errorRetryBtn: {
    backgroundColor: "#00A859",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  errorRetryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 16,
  },
});
