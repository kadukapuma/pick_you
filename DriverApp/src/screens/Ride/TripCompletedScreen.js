import React, { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import api from "../../services/api";

const TripCompletedScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const lottieRef = useRef(null);
  
  // State to handle the intermediate loading/success transition
  const [isProcessingCash, setIsProcessingCash] = useState(false);

  const ride = route?.params?.ride || {};
  const customerName = ride?.customerName || "John David";
  const pickupLocation = ride?.pickup || "Kandy City Center";
  const dropLocation = ride?.drop || "Peradeniya Junction";
  const fareAmount =
    ride?.final_fare || ride?.estimated_fare || ride?.fare || "Rs. 850";
  const numericFare = Number(ride?.final_fare || ride?.estimated_fare || 0);
  const distanceKm = Number(
    ride?.actual_distance_km || ride?.estimated_distance_km || ride?.distance_km || 0,
  );
  const durationMinutes = Number(
    ride?.actual_duration_minutes || ride?.estimated_duration_minutes || 0,
  );
  const extraDistanceKm = Number(ride?.extra_distance_km || 0);
  const waitingFare = Number(ride?.waiting_fare || 0);
  const formattedFare =
    typeof fareAmount === "number"
      ? `Rs. ${fareAmount.toFixed(2)}`
      : numericFare > 0
        ? `Rs. ${numericFare.toFixed(2)}`
        : fareAmount;

  // Chosen by the passenger at booking. Getting this wrong on a card ride means
  // the driver collects cash for a fare the gateway also charges.
  const paymentMethod = (ride?.payment_method || "cash").toLowerCase();
  const isCash = paymentMethod === "cash";
  const paymentStatus = String(
    ride?.payment?.payment_status || ride?.payment_status || "PENDING",
  ).toUpperCase();
  const isCardPaid = !isCash && paymentStatus === "COMPLETED";
  const isCardFailed =
    !isCash && ["FAILED", "DECLINED", "CANCELLED", "EXPIRED"].includes(paymentStatus);

  const commissionAmount = Number(ride?.commission_amount || 0);
  const driverEarning = Number(ride?.driver_earning || 0);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );

    return () => subscription.remove();
  }, []);

  const handleCashCollected = async () => {
    if (!ride?.id || isProcessingCash) return;

    if (!isCash) {
      navigation.reset({
        index: 0,
        routes: [{ name: "MainTabs" }],
      });
      return;
    }

    setIsProcessingCash(true);
    try {
      // The server derives the method from the ride itself; sending it here
      // would only ever disagree with what the passenger actually chose.
      await api.post(`/payments/${ride.id}`);

      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: "MainTabs" }],
        });
      }, 2500);
    } catch (error) {
      console.log("Error confirming cash:", error.response?.data || error);
      alert(
        error.response?.data?.message ||
          "Failed to confirm cash payment. Please try again.",
      );
      setIsProcessingCash(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#064E3B" />

      {/* --- TOP EMERALD HEADER (Dynamic conditional layout switches) --- */}
      <View style={[styles.emeraldHeaderFrame, { paddingTop: insets.top + 20 }]}>
        <View style={styles.animationCenterWrapper}>
          {!isProcessingCash ? (
            /* Standard Initial Finished Trip State Asset */
            <LottieView
              source={require("../../assets/Upload Complete.json")} 
              autoPlay
              loop={false}
              style={styles.lottieFileCanvas}
            />
          ) : (
            /* 🔥 MINI SUCCESS CASH CONFIRMATION ANIMATION
               Swapping seamlessly to a distinct small validation loader file 
            */
            <LottieView
              ref={lottieRef}
              source={require("../../assets/Car Animation.json")} 
              autoPlay
              loop={true}
              style={styles.miniCashLottieCanvas}
            />
          )}
        </View>

        {/* Dynamic primary status titles */}
        <Text style={styles.mainTitleText}>
          {!isProcessingCash ? "Trip Completed" : "Earnings Added!"}
        </Text>
        <Text style={styles.subTitleText}>
          {!isProcessingCash
            ? "Great job!"
            : driverEarning > 0
              ? `Rs. ${driverEarning.toFixed(2)} added to your account`
              : "Updating your account..."}
        </Text>
      </View>

      {/* --- LOWER SUMMARY SHEET --- */}
      <View style={[styles.summaryCardSheet, { paddingBottom: insets.bottom || 24 }]}>
        <Text style={styles.sectionHeaderLabel}>Trip Summary</Text>
        
        <View style={styles.tableBlockWrapper}>
          <View style={styles.dataRowMetric}>
            <Text style={styles.rowLabelField}>Customer Name</Text>
            <Text style={styles.rowValueHighlight}>{customerName}</Text>
          </View>

          <View style={styles.dataRowMetric}>
            <Text style={styles.rowLabelField}>Total Fare</Text>
            <Text style={styles.rowValueHighlight}>{formattedFare}</Text>
          </View>

          <View style={styles.dataRowMetric}>
            <Text style={styles.rowLabelField}>Payment Method</Text>
            <View style={[styles.methodPill, isCash ? styles.methodPillCash : styles.methodPillCard]}>
              <MaterialCommunityIcons
                name={isCash ? "cash" : "credit-card-outline"}
                size={14}
                color={isCash ? "#B45309" : "#1D4ED8"}
              />
              <Text style={[styles.methodPillText, { color: isCash ? "#B45309" : "#1D4ED8" }]}>
                {isCash ? "Cash" : "Card"}
              </Text>
            </View>
          </View>

          {commissionAmount > 0 ? (
            <>
              <View style={styles.dataRowMetric}>
                <Text style={styles.rowLabelField}>PickU Commission</Text>
                <Text style={styles.rowValueDeduction}>
                  - Rs. {commissionAmount.toFixed(2)}
                </Text>
              </View>

              <View style={styles.dataRowMetric}>
                <Text style={styles.rowLabelField}>Your Earnings</Text>
                <Text style={styles.rowValueHighlight}>
                  Rs. {driverEarning.toFixed(2)}
                </Text>
              </View>
            </>
          ) : null}

          <View style={styles.dataRowMetric}>
            <Text style={styles.rowLabelField}>Distance</Text>
            <Text style={styles.rowValueNormal}>
              {distanceKm > 0 ? `${distanceKm.toFixed(1)} km` : "Pending"}
            </Text>
          </View>

          <View style={styles.dataRowMetric}>
            <Text style={styles.rowLabelField}>Duration</Text>
            <Text style={styles.rowValueNormal}>
              {durationMinutes > 0 ? `${durationMinutes.toFixed(0)} min` : "Pending"}
            </Text>
          </View>

          {extraDistanceKm > 0 ? (
            <View style={styles.dataRowMetric}>
              <Text style={styles.rowLabelField}>Extra Distance</Text>
              <Text style={styles.rowValueNormal}>{extraDistanceKm.toFixed(2)} km</Text>
            </View>
          ) : null}

          {waitingFare > 0 ? (
            <View style={styles.dataRowMetric}>
              <Text style={styles.rowLabelField}>Waiting Charge</Text>
              <Text style={styles.rowValueNormal}>Rs. {waitingFare.toFixed(2)}</Text>
            </View>
          ) : null}

          {/* Timeline Route Segment */}
          <View style={styles.routeTimelineSegment}>
            <View style={styles.timelineNodeAxis}>
              <View style={styles.greenNodeDot} />
              <View style={styles.dashedLinkLine} />
              <View style={styles.redNodeDot} />
            </View>

            <View style={styles.timelineAddressBlock}>
              <View style={styles.addressMetaGroup}>
                <Text style={styles.addressTitleLabel}>Pickup Location</Text>
                <Text style={styles.addressValueText} numberOfLines={1}>
                  {pickupLocation}
                </Text>
              </View>

              <View style={[styles.addressMetaGroup, { marginTop: 12 }]}>
                <Text style={styles.addressTitleLabel}>Drop Location</Text>
                <Text style={styles.addressValueText} numberOfLines={1}>
                  {dropLocation}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* --- SYSTEM ACTION BLOCK FOOTER --- */}
        <View style={styles.actionSectionContainer}>
          {!isProcessingCash && !isCash && (
            <View style={styles.cardNoticeBanner}>
              <MaterialCommunityIcons name="information" size={18} color="#1D4ED8" />
              <Text style={styles.cardNoticeText}>
                {isCardPaid
                  ? "Paid by card. Do not collect any cash from the passenger."
                  : isCardFailed
                    ? "Card payment was not completed. The passenger must retry or choose another payment option."
                    : "Waiting for the passenger to complete the card payment. Do not collect cash unless the payment method is changed."}
              </Text>
            </View>
          )}

          <Text style={styles.paymentInstructionMessage}>
            {isProcessingCash
              ? "Updating your account..."
              : isCash
                ? `Collect ${formattedFare} cash from passenger`
                : isCardPaid
                  ? "Nothing to collect"
                  : isCardFailed
                    ? "Card payment needs passenger attention"
                    : "Card payment is pending"}
          </Text>

          <TouchableOpacity
            style={[
              styles.primaryActionButton,
              isProcessingCash && styles.buttonDisabledState
            ]}
            onPress={handleCashCollected}
            disabled={isProcessingCash}
            activeOpacity={0.85}
          >
            <View style={{ width: 24 }} />
            <Text style={styles.primaryActionLabel}>
              {isProcessingCash
                ? "Updating Earnings..."
                : isCash
                  ? "Cash Collected"
                  : isCardPaid
                    ? "Finish Trip"
                    : "Return to Home"}
            </Text>
            <View style={styles.actionButtonIconFrame}>
              <MaterialCommunityIcons
                name={
                  isProcessingCash
                    ? "wallet-outline"
                    : isCash
                      ? "cash-register"
                      : "check-circle-outline"
                }
                size={20}
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default TripCompletedScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#064E3B",
  },
  emeraldHeaderFrame: {
    flex: 4.8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  animationCenterWrapper: {
    width: 190,
    height: 190,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  lottieFileCanvas: {
    width: "180%",
    height: "180%",
  },
  // Scale constraints calibrated specifically for the mini processing transition asset path
  miniCashLottieCanvas: {
    width: "100%",
    height: "100%",
  },
  mainTitleText: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.8,
    textAlign: "center",
  },
  subTitleText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  summaryCardSheet: {
    flex: 7.2,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionHeaderLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
    letterSpacing: -0.1,
  },
  tableBlockWrapper: {
    flex: 1,
  },
  dataRowMetric: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  rowLabelField: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
  },
  rowValueNormal: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  rowValueDeduction: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
  methodPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  methodPillCash: {
    backgroundColor: "#FEF3C7",
  },
  methodPillCard: {
    backgroundColor: "#DBEAFE",
  },
  methodPillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  cardNoticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DBEAFE",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  cardNoticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#1D4ED8",
    lineHeight: 18,
  },
  rowValueHighlight: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  routeTimelineSegment: {
    flexDirection: "row",
    marginTop: 14,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  timelineNodeAxis: {
    alignItems: "center",
    marginRight: 12,
    paddingVertical: 4,
  },
  greenNodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00A859",
  },
  dashedLinkLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 4,
  },
  redNodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  timelineAddressBlock: {
    flex: 1,
  },
  addressMetaGroup: {
    justifyContent: "center",
  },
  addressTitleLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  addressValueText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginTop: 1,
  },
  actionSectionContainer: {
    marginTop: "auto",
    alignItems: "center",
    paddingTop: 10,
  },
  paymentInstructionMessage: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
    letterSpacing: -0.1,
  },
  primaryActionButton: {
    width: "100%",
    height: 54,
    backgroundColor: "#00A859",
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    shadowColor: "#00A859",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabledState: {
    backgroundColor: "#047857", // Darker tint when processing inputs to look locked out
    opacity: 0.85,
  },
  primaryActionLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  actionButtonIconFrame: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
});
