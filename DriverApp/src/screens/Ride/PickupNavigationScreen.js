import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Image,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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
import { clearActiveRideLocationSync } from "../../services/driverLocationSync";
import { getPickupCoordinate } from "../../utils/rideLocation";
import { getVehicleMapIcon } from "../../utils/vehicleMapIcons";

const DEFAULT_COORD = { latitude: 6.9271, longitude: 79.8612 };

const PickupNavigationScreen = ({ navigation, route }) => {
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
  const [isMarkingArrived, setIsMarkingArrived] = useState(false);
  const [followVehicle, setFollowVehicle] = useState(true);

  // Cancel trip states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const [showCarAnimation, setShowCarAnimation] = useState(false);

  const cancellationReasons = [
    "Customer didn't pick up the phone",
    "Customer didn't come out",
    "Wrong location",
    "Vehicle breakdown",
  ];

  const customerName = ride?.customerName || "John David";
  const customerProfilePicture = ride?.customerProfilePicture;
  const customerPhone = ride?.customerPhone;
  const pickup = ride?.pickup || "Pickup";

  const handleCallCustomer = useCallback(() => {
    if (!customerPhone) {
      Alert.alert("Unavailable", "Passenger phone number is not available yet.");
      return;
    }
    Linking.openURL(`tel:${customerPhone}`);
  }, [customerPhone]);

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
    () => ({ top: 140, right: 70, bottom: 360, left: 70 }),
    [],
  );

  const handleRecenter = useCallback(() => {
    setFollowVehicle(true);
    cameraRef.current?.setCamera({
      centerCoordinate: [origin.longitude, origin.latitude],
      pitch: 45,
      zoomLevel: 16,
      animationDuration: 350,
    });
  }, [origin]);

  const handleArrived = () => {
    const markArrived = async () => {
      if (isMarkingArrived) return;

      if (!ride?.id) {
        navigation.navigate("ArrivedAtPickupScreen", { ride });
        return;
      }

      setIsMarkingArrived(true);
      try {
        const response = await api.post(`/rides/${ride.id}/arrive`);
        const updatedRide = response.data?.data ?? response.data ?? ride;
        navigation.navigate("ArrivedAtPickupScreen", {
          ride: { ...ride, ...updatedRide },
        });
      } catch (error) {
        console.log("Error marking arrived:", error.response?.data || error);
        alert(
          error.response?.data?.message ||
          "Failed to update arrival. Please try again.",
        );
      } finally {
        setIsMarkingArrived(false);
      }
    };

    markArrived();
  };

  const handleCancelTrip = () => {
    setShowCancelModal(true);
  };

  const handleSelectReason = (reason) => {
    setSelectedReason(reason);
    if (reason === "other") {
      setShowOtherInput(true);
    } else {
      setShowOtherInput(false);
      setOtherReason("");
    }
  };

  const handleSubmitCancel = async () => {
    if (!selectedReason) {
      Alert.alert("Error", "Please select a reason for cancellation");
      return;
    }

    if (selectedReason === "other" && !otherReason.trim()) {
      Alert.alert("Error", "Please write a reason in the other field");
      return;
    }

    const finalReason =
      selectedReason === "other" ? otherReason.trim() : selectedReason;

    setIsCancelling(true);
    try {
      // Call API to cancel the trip
      if (ride?.id) {
        await api.post(`/rides/${ride.id}/cancel`, {
          cancelReason: finalReason,
          cancelledBy: "driver",
        });
      }

      await clearActiveRideLocationSync();

      // Close modal
      setShowCancelModal(false);

      // Show completion animation
      setShowCompletionAnimation(true);

      // After animation completes, show car animation then navigate
      setTimeout(() => {
        setShowCompletionAnimation(false);
        setShowCarAnimation(true);

        setTimeout(() => {
          setShowCarAnimation(false);
          // Reset state
          setSelectedReason("");
          setOtherReason("");
          setShowOtherInput(false);
          // Navigate to home
          navigation.navigate("MainTabs");
        }, 3000);
      }, 2500);
    } catch (error) {
      console.log("Error cancelling trip:", error.response?.data || error);
      Alert.alert(
        "Error",
        error.response?.data?.message ||
        "Failed to cancel trip. Please try again.",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCloseCancel = () => {
    setShowCancelModal(false);
    setSelectedReason("");
    setOtherReason("");
    setShowOtherInput(false);
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
          <MaterialCommunityIcons
            name="crosshairs-gps"
            size={22}
            color="#0F172A"
          />
        </TouchableOpacity>
      ) : null}

      {/* FLOATING CORNER ETA STATUS DETAILS */}
      <View style={styles.etaCardContainer} pointerEvents="none">
        <View style={styles.etaCard}>
          <View style={styles.etaLineRow}>
            <MaterialCommunityIcons
              name="car-sports"
              size={18}
              color="#00A859"
              style={styles.etaIconSpace}
            />
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

      {/* INTERACTIVE ACTIONS ZONE BOTTOM SHEET */}
      <View style={styles.bottomSheetWrapper}>
        <View style={styles.bottomSheetContent}>
          <View style={styles.handle} />

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
            <TouchableOpacity
              style={styles.inlineNavCircle}
              onPress={handleRecenter}
              activeOpacity={0.7}
            >
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
              <Text style={styles.pickupText} numberOfLines={1}>
                {pickup}
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleCallCustomer}>
              <Feather name="phone" size={18} color="#0F172A" />
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { borderColor: "#EF4444", borderWidth: 2 },
              ]}
              onPress={handleCancelTrip}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color="#EF4444"
              />
              <Text style={[styles.actionText, { color: "#EF4444" }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.arrivedBtn}
            onPress={handleArrived}
            activeOpacity={0.9}
            disabled={isMarkingArrived}
          >
            <Text style={styles.arrivedText}>
              {isMarkingArrived ? "Updating..." : "Arrived at Pickup"}
            </Text>
            <View style={styles.innerBtnArrowCircle}>
              <Feather name="chevrons-right" size={20} color="#00A859" />
            </View>
          </TouchableOpacity>
        </View>
        <SafeAreaView edges={["bottom"]} style={styles.blackBottomSafeArea} />
      </View>

      {/* CANCEL TRIP MODAL */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cancelModalContent}>
            <View style={styles.cancelModalHeader}>
              <TouchableOpacity onPress={handleCloseCancel}>
                <Feather name="arrow-left" size={24} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.cancelModalTitle}>Cancel Trip</Text>
              <View style={{ width: 24 }} />
            </View>

            <Text style={styles.cancelReasonLabel}>
              Why are you canceling this trip?
            </Text>

            <ScrollView
              style={styles.reasonsContainer}
              showsVerticalScrollIndicator={false}
            >
              {cancellationReasons.map((reason, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.reasonCheckboxRow}
                  onPress={() => handleSelectReason(reason)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      selectedReason === reason && styles.checkboxSelected,
                    ]}
                  >
                    {selectedReason === reason && (
                      <Feather name="check" size={16} color="#00A859" />
                    )}
                  </View>
                  <Text style={styles.reasonText}>{reason}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.reasonCheckboxRow}
                onPress={() => handleSelectReason("other")}
              >
                <View
                  style={[
                    styles.checkbox,
                    selectedReason === "other" && styles.checkboxSelected,
                  ]}
                >
                  {selectedReason === "other" && (
                    <Feather name="check" size={16} color="#00A859" />
                  )}
                </View>
                <Text style={styles.reasonText}>Other</Text>
              </TouchableOpacity>

              {showOtherInput && (
                <TextInput
                  style={styles.otherReasonInput}
                  placeholder="Please explain..."
                  placeholderTextColor="#94A3B8"
                  value={otherReason}
                  onChangeText={setOtherReason}
                  multiline
                  numberOfLines={4}
                />
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitCancelBtn, isCancelling && { opacity: 0.6 }]}
              onPress={handleSubmitCancel}
              disabled={isCancelling}
              activeOpacity={0.9}
            >
              <Text style={styles.submitCancelText}>
                {isCancelling ? "Canceling..." : "Submit"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* COMPLETION ANIMATION MODAL */}
      <Modal visible={showCompletionAnimation} transparent animationType="fade">
        <View style={styles.animationOverlay}>
          <View style={styles.animationContainer}>
            <LottieView
              source={require("../../assets/Upload Complete.json")}
              autoPlay
              loop={false}
              style={styles.completionAnimation}
            />
            <Text style={styles.animationText}>Trip Cancelled</Text>
          </View>
        </View>
      </Modal>

      {/* CAR ANIMATION MODAL */}
      <Modal visible={showCarAnimation} transparent animationType="fade">
        <View style={styles.animationOverlay}>
          <View style={styles.animationContainer}>
            <LottieView
              source={require("../../assets/Car Animation.json")}
              autoPlay
              loop={false}
              style={styles.carAnimation}
            />
          </View>
        </View>
      </Modal>

      <PassengerCancellationNotice
        rideId={ride?.id}
        navigation={navigation}
        customerName={customerName}
      />
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
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
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
    minHeight: 34,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  cancelModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: "80%",
  },
  cancelModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  cancelModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    flex: 1,
    textAlign: "center",
  },
  cancelReasonLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 18,
  },
  reasonsContainer: {
    maxHeight: 320,
    marginBottom: 20,
  },
  reasonCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  checkboxSelected: {
    backgroundColor: "#E0F6EE",
    borderColor: "#00A859",
  },
  reasonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
  },
  otherReasonInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginLeft: 38,
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "500",
    maxHeight: 100,
  },
  submitCancelBtn: {
    backgroundColor: "#EF4444",
    borderRadius: 16,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  submitCancelText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  // Animation styles
  animationOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  animationContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  completionAnimation: {
    width: 240,
    height: 240,
  },
  carAnimation: {
    width: 300,
    height: 300,
  },
  animationText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 20,
  },
});
