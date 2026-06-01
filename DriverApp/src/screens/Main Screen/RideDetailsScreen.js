import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // Optimized for proper notch & gesture bar management
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const RideDetailsScreen = ({ navigation, route }) => {
  // Safe extraction of params passed down from home dashboard context
  const ride = route?.params?.ride || {};

  // Clean data properties or clean local user fallbacks
  const customerName = ride?.customerName || "John David";
  const customerRating = ride?.rating || "4.9";
  const pickupLocation = ride?.pickup || "Kandy City Center";
  const dropoffLocation = ride?.drop || "Peradeniya Junction";
  const totalDistance = ride?.distance || "5.4 km";
  const estimatedTime = ride?.time || "18 min";
  const paymentMethod = ride?.paymentMode || "Cash";
  const totalFare = ride?.price || 850;

  // Split-fare distribution logic matching the itemized receipt layout
  const parsedFare = parseFloat(totalFare) || 850;
  const baseFare = Math.round(parsedFare * 0.76); // ~Rs. 650 equivalent
  const distanceFare = parsedFare - baseFare;    // ~Rs. 200 balance split

  const handleStartTrip = () => {
    console.log("Trip initialized for code record ID:", ride?.id);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* --- APPLICATION NAVIGATION HEADER --- */}
      <View style={styles.appHeader}>
        <TouchableOpacity 
          style={styles.backCircleBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.appHeaderTitle}>Trip Details</Text>

        <TouchableOpacity 
          style={styles.phoneCircleBtn}
          onPress={() => console.log("Dialing:", customerName)}
          activeOpacity={0.7}
        >
          <Feather name="phone" size={20} color="#00A859" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* --- PREMIUM GRADIENT USER BLOCK --- */}
        <LinearGradient
          colors={["#0A2E2B", "#0F1E21"]} 
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientUserCard}
        >
          <View style={styles.profileMainRow}>
            {/* Emerald User Avatar */}
            <View style={styles.avatarGreenCircle}>
              <Ionicons name="person" size={32} color="#FFFFFF" />
            </View>

            {/* Profile Context metadata */}
            <View style={styles.profileIdentityBlock}>
              <Text style={styles.customerNameText}>{customerName}</Text>
              
              <View style={styles.ratingInlineBadge}>
                <Ionicons name="star" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={styles.ratingLabelText}>{customerRating} Customer Rating</Text>
              </View>

              {/* Verified Visual Tag */}
              <View style={styles.verifiedTagRow}>
                <MaterialCommunityIcons name="shield-check" size={13} color="#00A859" />
                <Text style={styles.verifiedTagText}>Verified Customer</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* --- SEPARATE CARD: ROUTE INTERFACE BLOCK --- */}
        <View style={styles.modularWhiteCard}>
          {/* Pickup Block */}
          <View style={styles.locationTimelineRow}>
            <View style={styles.timelineVisualColumn}>
              <View style={[styles.nodeCircle, { backgroundColor: "#00A859" }]} />
              <View style={styles.dashedLinkLine} />
            </View>

            <View style={styles.addressLabelBlock}>
              <Text style={[styles.addressStatusTag, { color: "#00A859" }]}>PICKUP</Text>
              <Text style={styles.addressMainText} numberOfLines={1}>{pickupLocation}</Text>
              <Text style={styles.addressSubText}>Kandy, Sri Lanka</Text>
            </View>

            <TouchableOpacity style={styles.actionNavCircle} activeOpacity={0.7}>
              <Feather name="navigation" size={16} color="#00A859" />
            </TouchableOpacity>
          </View>

          {/* Dropoff Block */}
          <View style={[styles.locationTimelineRow, { marginBottom: 0 }]}>
            <View style={styles.timelineVisualColumn}>
              <View style={[styles.nodeCircle, { backgroundColor: "#EF4444", borderRadius: 2 }]} />
            </View>

            <View style={styles.addressLabelBlock}>
              <Text style={[styles.addressStatusTag, { color: "#EF4444" }]}>DROPOFF</Text>
              <Text style={styles.addressMainText} numberOfLines={1}>{dropoffLocation}</Text>
              <Text style={styles.addressSubText}>Peradeniya, Sri Lanka</Text>
            </View>

            <TouchableOpacity style={styles.actionNavCircle} activeOpacity={0.7}>
              <Feather name="navigation" size={16} color="#00A859" />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- METRIC GRID ROW (TRIPLE SEPARATE SMALL BLOCKS) --- */}
        <View style={styles.metricsGridRow}>
          <View style={styles.smallMetricCard}>
            <View style={styles.iconCircleBg}>
              <MaterialCommunityIcons name="map-marker-distance" size={18} color="#00A859" />
            </View>
            <Text style={styles.metricLabel}>Distance</Text>
            <Text style={styles.metricValueText}>{totalDistance}</Text>
          </View>

          <View style={styles.smallMetricCard}>
            <View style={styles.iconCircleBg}>
              <Feather name="clock" size={16} color="#00A859" />
            </View>
            <Text style={styles.metricLabel}>Est. Time</Text>
            <Text style={styles.metricValueText}>{estimatedTime}</Text>
          </View>

          <View style={styles.smallMetricCard}>
            <View style={styles.iconCircleBg}>
              <Ionicons name="wallet-outline" size={16} color="#00A859" />
            </View>
            <Text style={styles.metricLabel}>Payment</Text>
            <Text style={styles.metricValueText}>{paymentMethod}</Text>
          </View>
        </View>

        {/* --- RIDE FARE SUMMARY BILLING CARD --- */}
        <View style={styles.modularWhiteCard}>
          <View style={styles.summaryHeaderTitleRow}>
            <MaterialCommunityIcons name="file-document-edit-outline" size={18} color="#00A859" style={{ marginRight: 8 }} />
            <Text style={styles.summaryHeadingText}>Ride Summary</Text>
          </View>

          <View style={styles.receiptLineItem}>
            <Text style={styles.receiptLabel}>Base Fare</Text>
            <Text style={styles.receiptValue}>Rs. {baseFare}</Text>
          </View>

          <View style={styles.receiptLineItem}>
            <Text style={styles.receiptLabel}>Distance Fare</Text>
            <Text style={styles.receiptValue}>Rs. {distanceFare}</Text>
          </View>

          <View style={styles.receiptDottedDivider} />

          <View style={[styles.receiptLineItem, { marginBottom: 0, marginTop: 4 }]}>
            <Text style={styles.totalFareLabelText}>Total Fare</Text>
            <Text style={styles.totalFarePriceText}>Rs. {totalFare}</Text>
          </View>
        </View>
      </ScrollView>

      {/* --- FOOTER FIXED PRIMARY ACTION CONTAINER --- */}
      <View style={styles.stickyFooterContainer}>
        <TouchableOpacity 
          style={styles.primaryActionBtn}
          onPress={handleStartTrip}
          activeOpacity={0.9}
        >
          <View style={styles.innerBtnArrowCircle}>
            <Feather name="arrow-right" size={20} color="#00A859" />
          </View>
          <Text style={styles.primaryActionBtnText}>Start Trip</Text>
          <View style={{ width: 36 }} /> 
        </TouchableOpacity>

        {/* Safe Distance Disclaimer text overlay */}
        <View style={styles.disclaimerWrapper}>
          <MaterialCommunityIcons name="shield-check-outline" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
          <Text style={styles.disclaimerText}>Make sure you ve arrived at the pickup location</Text>
        </View>
      </View>

      {/* --- PURE BLACK SAFE AREA FOOTER EXCLUSIVITY --- */}
      <SafeAreaView edges={["bottom"]} style={styles.blackBottomSafeArea} />
    </View>
  );
};

export default RideDetailsScreen;

/* ================= SCREEN ARCHITECTURE STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", 
  },
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  backCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  appHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  phoneCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  gradientUserCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    overflow: "hidden",
  },
  profileMainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarGreenCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#00A859",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 18,
    shadowColor: "#00A859",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  profileIdentityBlock: {
    flex: 1,
  },
  customerNameText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  ratingInlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  ratingLabelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E2E8F0",
  },
  verifiedTagRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 168, 89, 0.15)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 0.5,
    borderColor: "rgba(0, 168, 89, 0.3)",
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#00A859",
    marginLeft: 4,
    letterSpacing: 0.2,
  },
  modularWhiteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  locationTimelineRow: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "center",
  },
  timelineVisualColumn: {
    width: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  nodeCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dashedLinkLine: {
    width: 1.5,
    height: 48,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    position: "absolute",
    top: 14,
  },
  addressLabelBlock: {
    flex: 1,
    justifyContent: "center",
  },
  addressStatusTag: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  addressMainText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  addressSubText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  actionNavCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
  },
  metricsGridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  smallMetricCard: {
    backgroundColor: "#FFFFFF",
    width: (SCREEN_WIDTH - 44) / 3,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconCircleBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  metricValueText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  summaryHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    paddingBottom: 10,
  },
  summaryHeadingText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  receiptLineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  receiptLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  receiptValue: {
    fontSize: 13,
    color: "#1E293B",
    fontWeight: "700",
  },
  receiptDottedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    marginVertical: 12,
  },
  totalFareLabelText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#00A859",
  },
  totalFarePriceText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#00A859",
  },
  stickyFooterContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
  },
  primaryActionBtn: {
    backgroundColor: "#00A859",
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    shadowColor: "#00A859",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  innerBtnArrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryActionBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  disclaimerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  disclaimerText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  blackBottomSafeArea: {
    backgroundColor: "#000000", // Pure black safe segment assignment
  },
});