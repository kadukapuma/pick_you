import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import LottieView from "lottie-react-native";

const { width } = Dimensions.get("window");

const TripCompletedScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const lottieRef = useRef(null);
  
  // State to handle the intermediate loading/success transition
  const [isProcessingCash, setIsProcessingCash] = useState(false);

  const ride = route?.params?.ride || {};
  const customerName = ride?.customerName || "John David";
  const pickupLocation = ride?.pickup || "Kandy City Center";
  const dropLocation = ride?.drop || "Peradeniya Junction";
  const fareAmount = ride?.fare || "Rs. 850";

  const handleCashCollected = () => {
    // 1. Set state to activate transition UI
    setIsProcessingCash(true);

    // 2. Clear holding delay for 2.5 seconds before returning to home base dashboard
    setTimeout(() => {
      if (navigation.canGoBack()) {
        navigation.popToTop();
      }
    }, 2500);
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
          {!isProcessingCash ? "Great job!" : `Added ${fareAmount} to your profile wallet`}
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
            <Text style={styles.rowValueHighlight}>{fareAmount}</Text>
          </View>

          <View style={styles.dataRowMetric}>
            <Text style={styles.rowLabelField}>Payment Method</Text>
            <Text style={styles.rowValueNormal}>Cash</Text>
          </View>

          <View style={styles.dataRowMetric}>
            <Text style={styles.rowLabelField}>Distance</Text>
            <Text style={styles.rowValueNormal}>6.2 km</Text>
          </View>

          <View style={styles.dataRowMetric}>
            <Text style={styles.rowLabelField}>Duration</Text>
            <Text style={styles.rowValueNormal}>18 min</Text>
          </View>

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
          <Text style={styles.paymentInstructionMessage}>
            {!isProcessingCash ? "Collect cash from passenger" : "Processing wallet deposition..."}
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
              {!isProcessingCash ? "Cash Collected" : "Updating Earnings..."}
            </Text>
            <View style={styles.actionButtonIconFrame}>
              <MaterialCommunityIcons 
                name={!isProcessingCash ? "cash-register" : "wallet-outline"} 
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