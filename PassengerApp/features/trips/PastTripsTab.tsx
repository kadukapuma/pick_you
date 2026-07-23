import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ScreenTransition from "../../components/ui/ScreenTransition";
import { getRideHistory, type PastRide, type PastRideStatus } from "../../services/rides/rideHistory";
import EmptyState from "./TripEmptyState";
import { TripList, TripSectionHeader, tripColors } from "./TripListItems";
import type { TripListItem } from "./tripTypes";

function mapRide(ride: PastRide): TripListItem {
  const value = ride.completed_at || ride.cancelled_at || ride.requested_at;
  const date = value ? new Date(value) : null;
  const user = ride.driver?.user;
  const duration = ride.actual_duration_minutes || ride.estimated_duration_minutes;
  return {
    id: String(ride.id), status: ride.status, pickup: ride.pickup_address, dropoff: ride.drop_address,
    date: date ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "",
    time: date ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "",
    fare: ride.status === "COMPLETED" ? `Rs. ${Number(ride.final_fare || ride.estimated_fare || 0).toFixed(2)}` : undefined,
    distance: ride.distance_km ? `${Number(ride.distance_km).toFixed(1)} km` : undefined,
    duration: duration ? `${Math.round(duration)} min` : undefined,
    driverName: user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : undefined,
    vehicleLabel: [ride.vehicle?.brand, ride.vehicle?.model].filter(Boolean).join(" ") || ride.vehicle?.vehicle_type,
    vehicleNumber: ride.vehicle?.vehicle_number, paymentMethod: ride.payment?.payment_method,
  };
}

export default function PastTripsTab({ status }: { status: PastRideStatus }) {
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true); setError("");
    const response = await getRideHistory(status);
    if (response.success && response.data) setTrips(response.data.data.map(mapRide));
    else setError(response.message || "We couldn't load your rides.");
    setLoading(false); setRefreshing(false);
  }, [status]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={tripColors.GREEN} /><Text style={styles.help}>Loading your rides...</Text></View>;
  if (error && !trips.length) return <View style={styles.center}><Ionicons name="cloud-offline-outline" size={36} color={tripColors.DEEP} /><Text style={styles.title}>Couldn't load activities</Text><Text style={styles.help}>{error}</Text><TouchableOpacity style={styles.retry} onPress={() => load()}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View>;
  if (!trips.length) return <EmptyState title={status === "COMPLETED" ? "No completed rides" : "No cancelled rides"} message="Your ride history will appear here." />;
  return <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[tripColors.GREEN]} tintColor={tripColors.GREEN} />}><ScreenTransition><TripSectionHeader title={status === "COMPLETED" ? "Completed rides" : "Cancelled rides"} /><TripList trips={trips} /></ScreenTransition></ScrollView>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tripColors.BG }, content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 112 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36, paddingBottom: 96 },
  title: { color: tripColors.DARK, fontSize: 18, fontWeight: "900", marginTop: 14 },
  help: { color: tripColors.MUTED, fontSize: 14, textAlign: "center", marginTop: 9 },
  retry: { backgroundColor: tripColors.DEEP, borderRadius: 22, paddingHorizontal: 24, paddingVertical: 13, marginTop: 18 },
  retryText: { color: "#FFF", fontWeight: "900" },
});
