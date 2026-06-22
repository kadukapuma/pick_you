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

// Using Mapbox for routing - removing react-native-maps to avoid Google Maps API dependency
// import MapView, { Marker, AnimatedRegion } from "react-native-maps";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { AnimatePresence, MotiView } from "moti";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import IncomingRideModal from "../../components/IncomingRideModel";
import api from "../../services/api";
import {
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

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [isOnline, setIsOnline] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [showRideModal, setShowRideModal] = useState(false);
  const [rideData, setRideData] = useState(null);
  const [isRideHandled, setIsRideHandled] = useState(false);
  const [driverId, setDriverId] = useState(null);
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
        });
      } catch (err) {
        console.log("Ride realtime connect error:", err?.message || err);
        if (!cancelled) {
          setWsConnected(false);
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

  const fetchDriverData = async () => {
    try {
      console.log("🔵 Fetching driver data...");
      const response = await api.get("/user");
      console.log("✅ Driver data fetched:", response.data?.driver?.id);

      const driverObj = response.data?.driver;
      if (!driverObj) {
        throw new Error("No driver data returned from server");
      }

      const driverAvailability = driverObj?.availability;
      setIsOnline(driverAvailability === 1);
      setDriverId(driverObj?.id || null);
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
    if (!rideData?.id) return;
    const rideId = rideData.id;
    try {
      await api.post(`/rides/${rideId}/accept`);

      let rideForNav = rideData;
      try {
        const detailRes = await api.get(`/rides/${rideId}`);
        const detail = detailRes.data?.data ?? detailRes.data;
        if (detail) {
          rideForNav = normalizeRidePayload({ ...rideData, ...detail });
        }
      } catch (detailErr) {
        console.log("Could not refresh ride details:", detailErr);
      }

      setShowRideModal(false);
      setRideData(null);
      lastNotifiedRideIdRef.current = null;
      setIsRideHandled(true);
      navigation.navigate("RideDetails", { ride: rideForNav });
    } catch (error) {
      console.log("Error accepting ride:", error);
      showCustomToast(
        "error",
        error.response?.data?.message || "Failed to accept ride.",
      );
    }
  };

  const handleRejectRide = async () => {
    if (!rideData?.id) return;
    const rideId = rideData.id;

    // Dismiss modal and prevent re‑showing this ride request
    setShowRideModal(false);
    setRideData(null);
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
          {/* MAP PLACEHOLDER - Using Mapbox for routing, not display maps */}
          <View style={styles.map}>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>📍 Live Map</Text>
              <Text style={styles.mapPlaceholderSubtext}>
                Powered by Mapbox
              </Text>
            </View>
          </View>

          {/* --- TOP HEADER ROW --- */}
          <SafeAreaView
            style={[styles.topContainer, { paddingTop: insets.top }]}
          >
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
          <View style={[styles.rightButtons, { bottom: 265 + insets.bottom }]}>
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
                <Text style={styles.statusSubtitle}>
                  {isOnline
                    ? wsConnected
                      ? "Live — trips arrive instantly"
                      : "Reconnecting… (backup sync active)"
                    : "Go online to start earning"}
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

          {/* --- INCOMING RIDE REQUEST SHEET OVERLAY --- */}
          <IncomingRideModal
            visible={showRideModal}
            rideData={rideData}
            onAccept={handleAcceptRide}
            onReject={handleRejectRide}
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
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
  },
  mapPlaceholderText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 12,
    color: "#64748B",
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
