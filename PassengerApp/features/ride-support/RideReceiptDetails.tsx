import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  firstPositiveNumber,
  getDriverName,
  getDriverProfilePicture,
  getRideStatus,
  getVehicleNumber,
  money,
  rideTheme,
} from "./rideUtils";

type Props = {
  ride: any;
  initialTab?: "receipt" | "help";
};

const readNumber = (...values: any[]) => firstPositiveNumber(...values);
const formatLkr = (value: any) => `LKR ${money(value)}`;

const formatDate = (value: any) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value: any) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDuration = (minutes: any) => {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return "Not recorded";

  const totalSeconds = Math.round(value * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  if (mins <= 0) return `${secs} sec`;
  if (secs <= 0) return `${mins} min`;
  return `${mins} min ${secs} sec`;
};

const formatDistance = (km: any) => {
  const value = Number(km);
  if (!Number.isFinite(value) || value <= 0) return "Not recorded";
  return `${value.toFixed(2)} km`;
};

const getPassengerName = (ride: any) => {
  const user = ride?.passenger?.user;
  const full = [user?.first_name, user?.last_name].filter(Boolean).join(" ");
  return full || user?.name || ride?.passenger_name || "Passenger";
};

const getPassengerPhone = (ride: any) =>
  ride?.passenger?.user?.phone || ride?.passenger_phone || "";

const statusText = (ride: any) => {
  const status = getRideStatus(ride);
  if (status === "COMPLETED") return "Completed";
  if (status === "CANCELLED" || status === "CANCELED") return "Cancelled";
  if (status === "STARTED") return "In progress";
  if (status === "ARRIVED") return "Driver arrived";
  if (status === "ACCEPTED") return "Driver assigned";
  return "Ride";
};

const getStatusColor = (ride: any) => {
  const status = getRideStatus(ride);
  if (status === "CANCELLED" || status === "CANCELED") return rideTheme.danger;
  if (status === "COMPLETED") return rideTheme.green;
  return rideTheme.darkGreen;
};

const getVehicleType = (ride: any) => {
  const vehicle = ride?.vehicle || {};
  const rawType = vehicle.vehicle_type;

  return (
    vehicle.vehicleType?.display_name ||
    vehicle.vehicleType?.name ||
    (typeof rawType === "string" ? rawType : rawType?.display_name || rawType?.name) ||
    ride?.vehicle_type ||
    "Vehicle"
  );
};

const getVehicleModel = (ride: any) => {
  const vehicle = ride?.vehicle || {};
  return [vehicle.color, vehicle.brand, vehicle.model].filter(Boolean).join(" ");
};

const getRideDateTime = (ride: any) =>
  ride?.completed_at ||
  ride?.cancelled_at ||
  ride?.started_at ||
  ride?.accepted_at ||
  ride?.requested_at ||
  ride?.created_at;

const getPickupTime = (ride: any) =>
  ride?.accepted_at || ride?.requested_at || ride?.created_at;

const getDropTime = (ride: any) =>
  ride?.completed_at || ride?.cancelled_at || ride?.updated_at || ride?.started_at;

const paymentLabel = (method: any) => {
  const text = String(method || "Cash");
  return text.toLowerCase() === "cash"
    ? "Cash"
    : text.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const buildReceipt = (ride: any) => {
  const estimatedFare = readNumber(ride?.estimated_fare, ride?.fare_total);
  const extraDistanceFare = readNumber(ride?.extra_distance_fare);
  const waitingFare = readNumber(ride?.waiting_fare);
  const totalFare = readNumber(
    ride?.final_fare,
    ride?.fare_total,
    ride?.payment?.amount,
    ride?.estimated_fare,
  );
  const paidAmount = readNumber(ride?.payment?.amount, totalFare);
  const estimatedDistance = readNumber(ride?.estimated_distance_km, ride?.distance_km);
  const actualDistance = readNumber(
    ride?.actual_distance_km,
    ride?.distance_km,
    ride?.estimated_distance_km,
  );
  const estimatedDuration = readNumber(ride?.estimated_duration_minutes);
  const actualDuration = readNumber(
    ride?.actual_duration_minutes,
    ride?.estimated_duration_minutes,
  );

  return {
    estimatedFare,
    extraDistanceFare,
    waitingFare,
    totalFare,
    paidAmount,
    estimatedDistance,
    actualDistance,
    estimatedDuration,
    actualDuration,
  };
};

function ReceiptRow({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <View style={styles.receiptRow}>
      <Text style={[styles.receiptLabel, strong && styles.receiptStrong, muted && styles.mutedText]}>
        {label}
      </Text>
      <Text style={[styles.receiptValue, strong && styles.receiptStrong, muted && styles.mutedText]}>
        {value}
      </Text>
    </View>
  );
}

export default function RideReceiptDetails({ ride, initialTab = "receipt" }: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"receipt" | "help">(initialTab);
  const receipt = useMemo(() => buildReceipt(ride), [ride]);
  const tripId = ride?.ride_code || ride?.id || "";
  const rideDate = getRideDateTime(ride);
  const pickupTime = getPickupTime(ride);
  const dropTime = getDropTime(ride);
  const driverPhoto = getDriverProfilePicture(ride);
  const driverRating = Number(ride?.driver?.rating || ride?.driver_rating || 0);
  const paymentMethod = paymentLabel(ride?.payment?.payment_method || ride?.payment_method);
  const paymentAllocations = Array.isArray(ride?.payment?.allocations)
    ? ride.payment.allocations.filter((allocation: any) =>
        ["COMPLETED", "RESERVED"].includes(
          String(allocation?.status || "").toUpperCase(),
        ),
      )
    : [];
  const vehicleType = getVehicleType(ride);
  const vehicleModel = getVehicleModel(ride);
  const helpRideId = String(ride?.id || "");
  const statusColor = getStatusColor(ride);

  const mailReceipt = async () => {
    const message = [
      `Trip ID: ${tripId}`,
      `Passenger: ${getPassengerName(ride)}`,
      `Status: ${statusText(ride)}`,
      `Pickup: ${ride?.pickup_address || "Pickup"}`,
      `Drop-off: ${ride?.drop_address || "Destination"}`,
      `Total: ${formatLkr(receipt.totalFare)}`,
      `Paid by: ${paymentMethod}`,
    ].join("\n");

    try {
      await Share.share({ title: `Receipt ${tripId}`, message });
    } catch (error) {
      if (__DEV__) console.warn("Could not share receipt:", error);
    }
  };

  const openHelp = () => {
    if (helpRideId) {
      router.push({ pathname: "/ride-help/[rideId]", params: { rideId: helpRideId } });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color={rideTheme.ink} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={[styles.statusPillText, { color: statusColor }]}>{statusText(ride)}</Text>
          <Text style={styles.tripTitle} numberOfLines={1}>Trip #{tripId}</Text>
          <Text style={styles.passengerLine} numberOfLines={1}>
            {[getPassengerName(ride), getPassengerPhone(ride)].filter(Boolean).join("  ")}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="car-sport" size={20} color={rideTheme.green} />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>Ride receipt</Text>
            <Text style={styles.summarySub}>{formatDate(rideDate)} {formatTime(rideDate)}</Text>
          </View>
          {driverRating > 0 ? (
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={14} color={rideTheme.gold} />
              <Text style={styles.ratingText}>{driverRating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.driverCard}>
          <View style={styles.avatarFrame}>
            {driverPhoto ? (
              <Image source={{ uri: driverPhoto }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={28} color={rideTheme.green} />
            )}
          </View>
          <View style={styles.driverCopy}>
            <Text style={styles.driverLabel}>Driver</Text>
            <Text style={styles.driverName} numberOfLines={1}>{getDriverName(ride)}</Text>
            <Text style={styles.vehicleText} numberOfLines={1}>
              {[vehicleType, vehicleModel].filter(Boolean).join(" - ")}
            </Text>
          </View>
          <View style={styles.plateBlock}>
            <Text style={styles.vehicleNumber} numberOfLines={1}>{getVehicleNumber(ride)}</Text>
            <Text style={styles.plateHint}>Plate</Text>
          </View>
        </View>

        <View style={styles.timelineCard}>
          <View style={styles.timelineRow}>
            <View style={[styles.locationDot, styles.pickupDot]} />
            <View style={styles.locationCopy}>
              <Text style={styles.locationText} numberOfLines={2}>{ride?.pickup_address || "Pickup location"}</Text>
              <Text style={styles.locationTime}>{formatTime(pickupTime) || "Pickup time unavailable"}</Text>
            </View>
          </View>
          <View style={styles.timelineConnector} />
          <View style={styles.timelineRow}>
            <View style={[styles.locationDot, styles.dropDot]} />
            <View style={styles.locationCopy}>
              <Text style={styles.locationText} numberOfLines={2}>{ride?.drop_address || "Destination"}</Text>
              <Text style={styles.locationTime}>{formatTime(dropTime) || "Drop-off time unavailable"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === "receipt" && styles.activeTab]}
            onPress={() => setTab("receipt")}
            activeOpacity={0.86}
          >
            <Text style={[styles.tabText, tab === "receipt" && styles.activeTabText]}>Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === "help" && styles.activeTab]}
            onPress={() => setTab("help")}
            activeOpacity={0.86}
          >
            <Text style={[styles.tabText, tab === "help" && styles.activeTabText]}>Help</Text>
          </TouchableOpacity>
        </View>

        {tab === "receipt" ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Fare breakdown</Text>
            <ReceiptRow label="Estimated fare" value={formatLkr(receipt.estimatedFare)} />
            <ReceiptRow label="Estimated duration" value={formatDuration(receipt.estimatedDuration)} muted />
            <ReceiptRow label="Estimated distance" value={formatDistance(receipt.estimatedDistance)} muted />
            <View style={styles.receiptDivider} />
            <ReceiptRow label="Actual fare" value={formatLkr(receipt.totalFare)} />
            {receipt.extraDistanceFare > 0 ? (
              <ReceiptRow label="Extra distance" value={formatLkr(receipt.extraDistanceFare)} muted />
            ) : null}
            {receipt.waitingFare > 0 ? (
              <ReceiptRow label="Waiting charge" value={formatLkr(receipt.waitingFare)} muted />
            ) : null}
            <ReceiptRow label="Actual duration" value={formatDuration(receipt.actualDuration)} muted />
            <ReceiptRow label="Actual distance" value={formatDistance(receipt.actualDistance)} muted />
            <View style={styles.totalBox}>
              <View>
                <Text style={styles.totalLabel}>Total trip fare</Text>
                <Text style={styles.paidLabel}>Paid amount {formatLkr(receipt.paidAmount)}</Text>
              </View>
              <Text style={styles.totalValue}>{formatLkr(receipt.totalFare)}</Text>
            </View>
            {paymentAllocations.length > 0 ? paymentAllocations.map((allocation: any) => {
              const type = String(allocation.type || "").toUpperCase();
              const isPickuCredit = ["CREDIT", "PICKU_CREDIT"].includes(type);
              const label = isPickuCredit ? "PickU credit" : paymentLabel(type);
              const icon = isPickuCredit
                ? "wallet-outline"
                : type === "CARD"
                  ? "credit-card-outline"
                  : "cash";

              return (
                <View style={styles.paymentRow} key={allocation.id || `${type}-${allocation.amount}`}>
                  <View style={styles.paymentMethod}>
                    <MaterialCommunityIcons name={icon} size={24} color={rideTheme.green} />
                    <Text style={styles.paymentMethodText}>{label}</Text>
                  </View>
                  <Text style={styles.paymentAmount}>
                    {formatLkr(Number(allocation.amount || 0))}
                  </Text>
                </View>
              );
            }) : (
              <View style={styles.paymentRow}>
                <View style={styles.paymentMethod}>
                  <MaterialCommunityIcons name="cash" size={24} color={rideTheme.green} />
                  <Text style={styles.paymentMethodText}>{paymentMethod}</Text>
                </View>
                <Text style={styles.paymentAmount}>{formatLkr(receipt.paidAmount)}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.helpIcon}>
              <Ionicons name="help-circle-outline" size={24} color={rideTheme.green} />
            </View>
            <Text style={styles.helpTitle}>Need help with this ride?</Text>
            <Text style={styles.helpText}>
              Open ride support to report an issue, ask about payment, or request help with this trip.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={openHelp} activeOpacity={0.86}>
              <Text style={styles.primaryButtonText}>Open Ride Help</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={openHelp} activeOpacity={0.86}>
            <Ionicons name="information-circle-outline" size={18} color={rideTheme.darkGreen} />
            <Text style={styles.secondaryButtonText}>Help</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={mailReceipt} activeOpacity={0.86}>
            <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Mail Receipt</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: rideTheme.bg },
  header: {
    minHeight: 86,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: rideTheme.line,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: { flex: 1, minWidth: 0 },
  statusPillText: { fontSize: 12, lineHeight: 16, fontWeight: "900", textTransform: "uppercase" },
  tripTitle: { color: rideTheme.ink, fontSize: 22, lineHeight: 28, fontWeight: "900", letterSpacing: 0 },
  passengerLine: { color: rideTheme.muted, fontSize: 13, lineHeight: 18, fontWeight: "700", marginTop: 2 },
  scrollContent: { paddingHorizontal: 16, gap: 12 },
  summaryCard: {
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: rideTheme.line,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: rideTheme.softGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryText: { flex: 1, minWidth: 0 },
  summaryTitle: { color: rideTheme.ink, fontSize: 15, lineHeight: 20, fontWeight: "900" },
  summarySub: { color: rideTheme.muted, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 2 },
  ratingPill: {
    height: 32,
    minWidth: 62,
    borderRadius: 16,
    backgroundColor: "#FFF7DB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
  },
  ratingText: { color: rideTheme.ink, fontSize: 13, fontWeight: "900" },
  driverCard: {
    minHeight: 104,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: rideTheme.line,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarFrame: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: rideTheme.softGreen,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  driverCopy: { flex: 1, minWidth: 0 },
  driverLabel: { color: rideTheme.muted, fontSize: 11, lineHeight: 15, fontWeight: "900", textTransform: "uppercase" },
  driverName: { color: rideTheme.ink, fontSize: 16, lineHeight: 21, fontWeight: "900", marginTop: 2 },
  vehicleText: { color: rideTheme.muted, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 3 },
  plateBlock: { alignItems: "flex-end", maxWidth: 112 },
  vehicleNumber: { color: rideTheme.darkGreen, fontSize: 20, lineHeight: 25, fontWeight: "900" },
  plateHint: { color: rideTheme.muted, fontSize: 11, lineHeight: 15, fontWeight: "800", marginTop: 2 },
  timelineCard: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: rideTheme.line,
    padding: 14,
  },
  timelineRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  locationDot: { width: 14, height: 14, borderRadius: 7, marginTop: 4 },
  pickupDot: { backgroundColor: rideTheme.green },
  dropDot: { backgroundColor: rideTheme.darkGreen },
  timelineConnector: {
    width: 1,
    height: 24,
    marginLeft: 6.5,
    marginVertical: 5,
    backgroundColor: rideTheme.line,
  },
  locationCopy: { flex: 1, minWidth: 0 },
  locationText: { color: rideTheme.ink, fontSize: 14, lineHeight: 20, fontWeight: "800" },
  locationTime: { color: rideTheme.muted, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 3 },
  tabs: {
    height: 48,
    padding: 4,
    borderRadius: 16,
    backgroundColor: "#EAF4F0",
    flexDirection: "row",
    gap: 4,
  },
  tab: { flex: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  activeTab: { backgroundColor: "#FFFFFF" },
  tabText: { color: rideTheme.muted, fontSize: 14, fontWeight: "900" },
  activeTabText: { color: rideTheme.darkGreen },
  card: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: rideTheme.line,
    padding: 16,
  },
  sectionTitle: { color: rideTheme.ink, fontSize: 16, lineHeight: 22, fontWeight: "900", marginBottom: 8 },
  receiptRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 7,
  },
  receiptLabel: { flex: 1, color: rideTheme.ink, fontSize: 14, lineHeight: 20, fontWeight: "800" },
  receiptValue: { flex: 1, color: rideTheme.ink, fontSize: 14, lineHeight: 20, fontWeight: "900", textAlign: "right" },
  receiptStrong: { color: rideTheme.ink, fontWeight: "900" },
  mutedText: { color: rideTheme.muted },
  receiptDivider: { height: 1, backgroundColor: rideTheme.line, marginVertical: 10 },
  totalBox: {
    marginTop: 10,
    borderRadius: 16,
    backgroundColor: rideTheme.softGreen,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  totalLabel: { color: rideTheme.darkGreen, fontSize: 14, lineHeight: 19, fontWeight: "900" },
  paidLabel: { color: rideTheme.muted, fontSize: 12, lineHeight: 17, fontWeight: "700", marginTop: 2 },
  totalValue: { color: rideTheme.darkGreen, fontSize: 17, lineHeight: 22, fontWeight: "900", textAlign: "right" },
  paymentRow: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: rideTheme.line,
    marginTop: 12,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  paymentMethod: { flexDirection: "row", alignItems: "center", gap: 9, flex: 1, minWidth: 0 },
  paymentMethodText: { color: rideTheme.ink, fontSize: 14, lineHeight: 19, fontWeight: "900" },
  paymentAmount: { color: rideTheme.ink, fontSize: 14, lineHeight: 19, fontWeight: "900" },
  helpIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: rideTheme.softGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  helpTitle: { color: rideTheme.ink, fontSize: 17, lineHeight: 23, fontWeight: "900", marginTop: 12 },
  helpText: { color: rideTheme.muted, fontSize: 13, lineHeight: 20, fontWeight: "700", marginTop: 6 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 2 },
  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: rideTheme.green,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    flex: 1,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: rideTheme.line,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    flex: 1,
  },
  secondaryButtonText: { color: rideTheme.darkGreen, fontSize: 14, fontWeight: "900" },
});
