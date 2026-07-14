import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
} from "react-native";
import { useRideSearch } from "../../context/RideSearchContext";
import { apiClient } from "../../services/api/apiClient";
import EmptyState from "./EmptyState";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// ─── helpers ──────────────────────────────────────────────────────────────────
const toNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Format an ISO date string → "2026-07-08 08:13:52"
 */
function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    );
  } catch {
    return iso;
  }
}

/**
 * Map ride status → human label + ETA hint
 */
function statusLabel(status: string): { label: string; eta: string } {
  switch (status.toUpperCase()) {
    case "ACCEPTED":
      return { label: "Driver on the way", eta: "5 min to pickup" };
    case "ARRIVED":
      return { label: "Driver arrived", eta: "Driver is here" };
    case "STARTED":
      return { label: "Ride in progress", eta: "On route" };
    case "PENDING":
    default:
      return { label: "Finding a driver…", eta: "" };
  }
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ status }: { status: string }) {
  const pct = { ACCEPTED: 0.55, ARRIVED: 0.78, STARTED: 0.92, PENDING: 0.15 }[
    status.toUpperCase()
  ] ?? 0.15;

  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { flex: pct as any }]} />
      <View style={{ flex: 1 - (pct as any) }} />
    </View>
  );
}

// ─── Ride card ────────────────────────────────────────────────────────────────
function OngoingRideCard({
  rideData,
  rideStatus,
  onCancel,
}: {
  rideData: any;
  rideStatus: string;
  onCancel: () => void;
}) {
  const driver = rideData.driver;
  const vehicle = rideData.vehicle;
  const tripId = rideData.trip_id ?? rideData.id ?? "—";
  const plate = vehicle?.license_plate ?? vehicle?.plate_number ?? "—";
  const driverName =
    driver?.user?.first_name && driver?.user?.last_name
      ? `${driver.user.first_name} ${driver.user.last_name}`
      : driver?.user?.name ?? "Nimesh Bandara";
  const driverPhone = driver?.user?.phone ?? driver?.phone ?? null;

  const pickupAddress = rideData.pickup_address ?? "Pickup location";
  const dropAddress = rideData.drop_address ?? "Destination";
  const createdAt = formatDateTime(rideData.created_at);

  const { label, eta } = statusLabel(rideStatus);

  const handleCall = () => {
    if (!driverPhone) {
      Alert.alert("Unavailable", "Driver phone number is not available.");
      return;
    }
    Linking.openURL(`tel:${driverPhone}`);
  };

  const handleTrack = () => {
    router.push({ pathname: "/live-tracker", params: { rideData: JSON.stringify(rideData) } });
  };

  return (
    <View style={styles.card}>
      {/* ── Row 1: Rides icon + trip ID ──────────────────── */}
      <View style={styles.tripIdRow}>
        <MaterialCommunityIcons
          name="map-marker-path"
          size={22}
          color="#1B9E6E"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.tripIdText} numberOfLines={1}>
          Rides: Trip ID - {tripId}
        </Text>
      </View>

      <View style={styles.divider} />

      {/* ── Row 2: Plate + driver name ───────────────────── */}
      <View style={styles.plateRow}>
        <Text style={styles.plateText}>{plate}</Text>
        <View style={styles.driverPill}>
          <View style={styles.driverAvatar}>
            <Ionicons name="person" size={12} color="#888" />
          </View>
          <Text style={styles.driverName} numberOfLines={1}>
            {driverName}
          </Text>
        </View>
      </View>

      {/* ── Timeline: pickup → dropoff ───────────────────── */}
      <View style={styles.timeline}>
        {/* Pickup */}
        <View style={styles.timelineRow}>
          <View style={styles.timelineDotGreen} />
          <View style={styles.timelineText}>
            <Text style={styles.timelineAddr} numberOfLines={1}>
              {pickupAddress}
            </Text>
            {!!createdAt && (
              <Text style={styles.timelineMeta}>{createdAt}</Text>
            )}
          </View>
        </View>

        {/* Dotted connector */}
        <View style={styles.timelineConnector}>
          <View style={styles.dottedLine} />
        </View>

        {/* Drop-off */}
        <View style={styles.timelineRow}>
          <View style={styles.timelineDotDark} />
          <View style={styles.timelineText}>
            <Text style={styles.timelineAddr} numberOfLines={1}>
              {dropAddress}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Progress bar ─────────────────────────────────── */}
      <ProgressBar status={rideStatus} />

      {/* ── Status + ETA ─────────────────────────────────── */}
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>{label}</Text>
        {!!eta && <Text style={styles.etaText}>{eta}</Text>}
      </View>

      {/* ── Action buttons ───────────────────────────────── */}
      <View style={styles.actionRow}>
        {/* Call */}
        <TouchableOpacity style={styles.iconBtn} onPress={handleCall}>
          <Ionicons name="call-outline" size={20} color="#333" />
        </TouchableOpacity>

        {/* Chat */}
        <TouchableOpacity style={styles.iconBtn} onPress={() => {}}>
          <Ionicons name="chatbubble-outline" size={20} color="#333" />
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        {/* Track */}
        <TouchableOpacity style={styles.trackBtn} onPress={handleTrack}>
          <Ionicons name="location" size={16} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.trackText}>Track</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Searching card ───────────────────────────────────────────────────────────
function SearchingCard({ onCancel }: { onCancel: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.tripIdRow}>
        <MaterialCommunityIcons
          name="map-marker-path"
          size={22}
          color="#1B9E6E"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.tripIdText}>Rides: Searching for a driver…</Text>
      </View>
      <View style={styles.divider} />

      <View style={styles.searchingBody}>
        <ActivityIndicator size="large" color="#1B9E6E" />
        <Text style={styles.searchingText}>
          Your ride request is live.{"\n"}Finding the nearest driver.
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { flex: 0.15 }]} />
        <View style={{ flex: 0.85 }} />
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Finding a driver…</Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function OngoingTab() {
  const {
    isSearchingForDriver,
    activeRideId,
    activeRideStatus,
    setIsSearchingForDriver,
    setActiveRide,
    resetTrip,
  } = useRideSearch();

  const [rideData, setRideData] = useState<any>(null);
  const approvalAlertShownRef = useRef(false);

  useEffect(() => {
    if (!activeRideId) {
      setRideData(null);
      return;
    }

    let cancelled = false;

    const pollRideStatus = async () => {
      try {
        const response = await apiClient.get<any>(`/rides/${activeRideId}`);
        if (cancelled || !response.success || !response.data) return;

        const ride = response.data;
        const rideStatus = String(ride.status || "").toUpperCase();

        setRideData(ride);
        setActiveRide(activeRideId, rideStatus);

        if (
          ["ACCEPTED", "ARRIVED", "STARTED"].includes(rideStatus) &&
          !approvalAlertShownRef.current
        ) {
          approvalAlertShownRef.current = true;
          setIsSearchingForDriver(false);
          Alert.alert(
            rideStatus === "ARRIVED" ? "Driver arrived" : "Driver approved",
            rideStatus === "ARRIVED"
              ? "Your driver is at the pickup location."
              : "A driver has accepted your ride request.",
          );
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    pollRideStatus();
    const intervalId = setInterval(pollRideStatus, 5000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeRideId, setActiveRide, setIsSearchingForDriver]);

  const handleCancel = () => {
    if (!activeRideId) return;
    Alert.alert(
      "Cancel Ride",
      "Are you sure you want to cancel this ride request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            const response = await apiClient.delete(`/rides/${activeRideId}`);
            if (response.success) {
              resetTrip();
              Alert.alert("Cancelled", "Your ride has been cancelled.");
            } else {
              Alert.alert("Error", response.message || "Failed to cancel ride.");
            }
          },
        },
      ],
    );
  };

  const waiting =
    isSearchingForDriver &&
    !["ACCEPTED", "ARRIVED", "STARTED"].includes(activeRideStatus || "");

  const hasActiveRide =
    isSearchingForDriver ||
    ["ACCEPTED", "ARRIVED", "STARTED"].includes(activeRideStatus || "");

  if (!hasActiveRide) {
    return <EmptyState message="You don't have any ongoing trips" />;
  }

  const isAccepted = ["ACCEPTED", "ARRIVED", "STARTED"].includes(
    activeRideStatus || "",
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {waiting && !isAccepted && (
        <SearchingCard onCancel={handleCancel} />
      )}

      {isAccepted && rideData && (
        <OngoingRideCard
          rideData={rideData}
          rideStatus={activeRideStatus || "ACCEPTED"}
          onCancel={handleCancel}
        />
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const GREEN = "#1B9E6E";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F2F5",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },

  // ── Card shell ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  // ── Trip ID row ─────────────────────────────────────────────────────────────
  tripIdRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  tripIdText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
    flexShrink: 1,
  },

  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginBottom: 10,
  },

  // ── Plate + driver ──────────────────────────────────────────────────────────
  plateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  plateText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
    letterSpacing: 1,
  },
  driverPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  driverAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
  },
  driverName: {
    fontSize: 13,
    color: "#555",
    fontWeight: "500",
    maxWidth: 130,
  },

  // ── Timeline ────────────────────────────────────────────────────────────────
  timeline: {
    marginBottom: 14,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineDotGreen: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GREEN,
    marginTop: 3,
    marginRight: 10,
  },
  timelineDotDark: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#1A1A2E",
    borderWidth: 3,
    borderColor: "#4A4A6E",
    marginTop: 3,
    marginRight: 10,
  },
  timelineConnector: {
    paddingLeft: 5,
    marginVertical: 2,
  },
  dottedLine: {
    width: 2,
    height: 14,
    backgroundColor: "#CCCCCC",
    marginLeft: 0,
  },
  timelineText: {
    flex: 1,
  },
  timelineAddr: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1A1A2E",
  },
  timelineMeta: {
    fontSize: 11,
    color: "#888",
    marginTop: 1,
  },

  // ── Progress bar ────────────────────────────────────────────────────────────
  progressTrack: {
    flexDirection: "row",
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "#E8E8E8",
    marginBottom: 8,
  },
  progressFill: {
    backgroundColor: GREEN,
    borderRadius: 3,
  },

  // ── Status row ──────────────────────────────────────────────────────────────
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  statusLabel: {
    fontSize: 13,
    color: "#444",
    fontWeight: "500",
  },
  etaText: {
    fontSize: 13,
    color: "#444",
    fontWeight: "400",
  },

  // ── Action buttons ──────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  trackBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1A2E24",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  trackText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },

  // ── Searching card extras ───────────────────────────────────────────────────
  searchingBody: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 12,
  },
  searchingText: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 20,
  },
});
