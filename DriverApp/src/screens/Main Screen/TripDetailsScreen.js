import React, { useMemo } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { normalizeRidePayload } from "../../utils/rideLocation";

const formatDateTime = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const money = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? `Rs.${amount.toFixed(2)}` : "Rs.0.00";
};

const statusLabel = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Trip";
  }
};

const statusTone = (status) =>
  String(status || "").toUpperCase() === "CANCELLED"
    ? { bg: "#FEE2E2", text: "#DC2626" }
    : { bg: "#DCFCE7", text: "#16A34A" };

const readRideTime = (ride) =>
  ride.completed_at ||
  ride.cancelled_at ||
  ride.started_at ||
  ride.arrived_at ||
  ride.accepted_at ||
  ride.requested_at ||
  ride.updated_at;

const TripDetailsScreen = ({ route, navigation }) => {
  const trip = useMemo(
    () => {
      const rawTrip = route.params?.trip || {};
      return { ...rawTrip, ...normalizeRidePayload(rawTrip) };
    },
    [route.params?.trip],
  );
  const status = String(trip.status || "").toUpperCase();
  const tone = statusTone(status);
  const fare = trip.final_fare ?? trip.estimated_fare ?? trip.price;
  const paymentMethod = trip.paymentMode || "Not recorded";
  const cancellationReason = trip.cancel_reason || trip.cancelReason;
  const cancelledBy = trip.cancelled_by || trip.cancelledBy;

  const DetailRow = ({ icon, label, value, color = "#1E293B" }) => (
    <View style={styles.detailRow}>
      <View style={styles.iconCircle}>
        <Feather name={icon} size={18} color="#00A859" />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, { color }]}>{value || "N/A"}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.mainWrapper}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        <LinearGradient
          colors={["#00A859", "#007A41"]}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={["top"]}>
            <View style={styles.navRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Trip Details</Text>
              <View style={styles.headerSpacer} />
            </View>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.routeCard}>
            <View style={styles.locationRow}>
              <View style={styles.dotGreen} />
              <View style={styles.locationCopy}>
                <Text style={styles.detailLabel}>Pickup Location</Text>
                <Text style={styles.locationValue} numberOfLines={2}>
                  {trip.pickup || "Pickup"}
                </Text>
              </View>
            </View>
            <View style={styles.locationLine} />
            <View style={styles.locationRow}>
              <View style={styles.dotRed} />
              <View style={styles.locationCopy}>
                <Text style={styles.detailLabel}>Destination</Text>
                <Text style={styles.locationValue} numberOfLines={2}>
                  {trip.drop || "Destination"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.fareCard}>
            <Text style={styles.fareLabel}>Total Fare</Text>
            <Text style={styles.fareAmount}>{money(fare)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
              <Text style={[styles.statusText, { color: tone.text }]}>
                {statusLabel(status)}
              </Text>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <DetailRow icon="calendar" label="Date & Time" value={formatDateTime(readRideTime(trip))} />
            <DetailRow icon="navigation" label="Distance" value={trip.distance || "0.0 km"} />
            <DetailRow icon="user" label="Passenger" value={trip.customerName || "Passenger"} />
            <DetailRow icon="credit-card" label="Payment Method" value={paymentMethod} />
            {status === "CANCELLED" ? (
              <>
                <DetailRow
                  icon="x-circle"
                  label="Cancelled By"
                  value={cancelledBy || "Not recorded"}
                  color="#DC2626"
                />
                <DetailRow
                  icon="message-square"
                  label="Cancellation Reason"
                  value={cancellationReason || "No reason provided"}
                  color="#92400E"
                />
              </>
            ) : null}
          </View>

          <TouchableOpacity style={styles.helpButton}>
            <Text style={styles.helpButtonText}>Report an issue with this trip</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <SafeAreaView edges={["bottom"]} style={styles.bottomSafeArea} />
    </View>
  );
};

export default TripDetailsScreen;

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#000" },
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  bottomSafeArea: { backgroundColor: "#000" },
  headerGradient: {
    paddingHorizontal: 16,
    paddingBottom: 25,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerSpacer: { width: 40 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  routeCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  locationRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  locationCopy: { flex: 1, minWidth: 0 },
  locationValue: { fontSize: 15, fontWeight: "800", color: "#1E293B", lineHeight: 21 },
  locationLine: { width: 2, height: 28, backgroundColor: "#E2E8F0", marginLeft: 5, marginVertical: 5 },
  dotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#00A859", marginTop: 4 },
  dotRed: { width: 12, height: 12, borderRadius: 2, backgroundColor: "#EF4444", marginTop: 4 },
  fareCard: {
    backgroundColor: "#FFF",
    padding: 24,
    borderRadius: 24,
    alignItems: "center",
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  fareLabel: { color: "#64748B", fontSize: 14, marginBottom: 4 },
  fareAmount: { fontSize: 36, fontWeight: "800", color: "#1E293B", marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: "700" },
  detailsContainer: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 16,
    elevation: 2,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  detailCopy: { flex: 1, minWidth: 0 },
  detailLabel: { fontSize: 12, color: "#64748B", marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  helpButton: { padding: 16, alignItems: "center" },
  helpButtonText: { color: "#64748B", fontWeight: "600", fontSize: 14, textDecorationLine: "underline" },
});
