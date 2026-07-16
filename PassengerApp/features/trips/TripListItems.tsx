import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { TripListItem, TripStatus } from "./tripTypes";
import { getTripStatusLabel, toRideDetailsPayload } from "./tripTypes";

const GREEN = "#0B8F62";
const DARK = "#18231F";
const DEEP = "#063D31";
const BG = "#F2FBF8";
const LINE = "rgba(153,177,169,0.38)";
const MUTED = "#697872";

function statusTone(status: TripStatus) {
  if (["ACCEPTED", "ARRIVED", "STARTED", "SEARCHING"].includes(status)) {
    return { bg: "rgba(11,143,98,0.10)", color: GREEN };
  }
  if (status === "COMPLETED") return { bg: "rgba(11,143,98,0.08)", color: "#08784F" };
  if (status === "CANCELLED") return { bg: "rgba(107,114,128,0.08)", color: "#6B7280" };
  if (status === "COMPLAINT") return { bg: "rgba(180,83,9,0.10)", color: "#B45309" };
  return { bg: "rgba(6,61,49,0.08)", color: DEEP };
}

export function openTripDetails(trip: TripListItem) {
  router.push({
    pathname: "/ride-details/[rideId]",
    params: {
      rideId: String(trip.id),
      rideData: JSON.stringify(toRideDetailsPayload(trip)),
    },
  });
}

export function TripSectionHeader({ title }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export function TripRow({ trip }: { trip: TripListItem }) {
  const tone = statusTone(trip.status);
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.86} onPress={() => openTripDetails(trip)}>
      <View style={styles.iconWrap}>
        <Ionicons name="car-sport-outline" size={21} color={DEEP} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.routeText} numberOfLines={1}>{trip.dropoff}</Text>
          <Text style={styles.fareText} numberOfLines={1}>{trip.fare || trip.distance || "View"}</Text>
        </View>
        <Text style={styles.pickupText} numberOfLines={1}>{trip.pickup}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText} numberOfLines={1}>{[trip.date, trip.time].filter(Boolean).join("  ")}</Text>
          <View style={[styles.badge, { backgroundColor: tone.bg }]}>
            <Text style={[styles.badgeText, { color: tone.color }]}>{getTripStatusLabel(trip.status)}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9AA9A4" />
    </TouchableOpacity>
  );
}

export function LiveTripCard({
  title,
  subtitle,
  pickup,
  dropoff,
  status,
  actionLabel = "Track",
  onAction,
  onCancel,
}: {
  title: string;
  subtitle: string;
  pickup: string;
  dropoff: string;
  status: TripStatus;
  actionLabel?: string;
  onAction: () => void;
  onCancel?: () => void;
}) {
  const tone = statusTone(status);
  return (
    <View style={styles.liveCard}>
      <View style={styles.liveTop}>
        <View style={styles.liveCopy}>
          <Text style={styles.liveTitle}>{title}</Text>
          <Text style={styles.liveSubtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: tone.bg }]}>
          <Text style={[styles.badgeText, { color: tone.color }]}>{getTripStatusLabel(status)}</Text>
        </View>
      </View>

      <View style={styles.timelineBlock}>
        <View style={styles.timelineRail}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineLine} />
          <View style={[styles.timelineDot, styles.timelineDotDark]} />
        </View>
        <View style={styles.timelineTextBlock}>
          <Text style={styles.timelineLabel}>Pickup</Text>
          <Text style={styles.timelineValue} numberOfLines={1}>{pickup}</Text>
          <Text style={[styles.timelineLabel, styles.dropLabel]}>Drop-off</Text>
          <Text style={styles.timelineValue} numberOfLines={1}>{dropoff}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        {onCancel ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onCancel} activeOpacity={0.85}>
            <Text style={styles.secondaryText}>Cancel</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.primaryBtn} onPress={onAction} activeOpacity={0.88}>
          <Ionicons name="navigate" size={16} color="#FFFFFF" />
          <Text style={styles.primaryText}>{actionLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function TripList({ trips }: { trips: TripListItem[] }) {
  return (
    <View style={styles.listStack}>
      {trips.map((trip) => <TripRow key={trip.id} trip={trip} />)}
    </View>
  );
}

export const tripColors = { GREEN, DARK, DEEP, BG, LINE, MUTED };

const styles = StyleSheet.create({
  sectionHeader: { marginBottom: 10, paddingHorizontal: 2 },
  sectionTitle: { color: DARK, fontSize: 16, fontWeight: "900" },
  listStack: { gap: 10 },
  row: {
    minHeight: 86,
    borderRadius: 21,
    borderWidth: 1.2,
    borderColor: LINE,
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(11,143,98,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowBody: { flex: 1, minWidth: 0, marginRight: 8 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  routeText: { flex: 1, color: DARK, fontSize: 16, fontWeight: "900" },
  fareText: { color: GREEN, fontSize: 14, fontWeight: "900" },
  pickupText: { color: MUTED, fontSize: 13, fontWeight: "700", marginTop: 5 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 8 },
  metaText: { flex: 1, color: MUTED, fontSize: 12, fontWeight: "700" },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "900" },
  liveCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.2,
    borderColor: "rgba(11,143,98,0.28)",
    backgroundColor: "transparent",
  },
  liveTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  liveCopy: { flex: 1, minWidth: 0 },
  liveTitle: { color: DARK, fontSize: 18, fontWeight: "900" },
  liveSubtitle: { color: MUTED, fontSize: 13, fontWeight: "700", marginTop: 4 },
  timelineBlock: { flexDirection: "row", minHeight: 92, marginTop: 18 },
  timelineRail: { width: 18, alignItems: "center", paddingTop: 5 },
  timelineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: GREEN },
  timelineDotDark: { backgroundColor: DEEP, marginTop: 38 },
  timelineLine: { position: "absolute", top: 18, width: 2, height: 34, backgroundColor: "rgba(153,177,169,0.50)" },
  timelineTextBlock: { flex: 1, minWidth: 0, paddingLeft: 10 },
  timelineLabel: { color: MUTED, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  dropLabel: { marginTop: 14 },
  timelineValue: { color: DARK, fontSize: 15, fontWeight: "800", marginTop: 3 },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  secondaryBtn: { flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: LINE, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: DEEP, fontSize: 15, fontWeight: "900" },
  primaryBtn: { flex: 1, height: 44, borderRadius: 22, backgroundColor: DEEP, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
});


