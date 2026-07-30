import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ScreenTransition from "../../components/ui/ScreenTransition";
import { getRideHistory, type PastRide, type PastRideStatus } from "../../services/rides/rideHistory";
import EmptyState from "./TripEmptyState";
import { TripRow, TripSectionHeader, tripColors } from "./TripListItems";
import type { TripListItem } from "./tripTypes";

function mapRide(ride: PastRide): TripListItem {
  const value = ride.completed_at || ride.cancelled_at || ride.requested_at;
  const date = value ? new Date(value) : null;
  const user = ride.driver?.user;
  const duration = ride.actual_duration_minutes || ride.estimated_duration_minutes;
  return {
    id: String(ride.id), rideCode: ride.ride_code, status: ride.status, pickup: ride.pickup_address, dropoff: ride.drop_address,
    date: date ? date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "",
    time: date ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "",
    requestedAt: ride.requested_at, completedAt: ride.completed_at, cancelledAt: ride.cancelled_at,
    estimatedFare: Number(ride.estimated_fare || 0), finalFare: Number(ride.final_fare || 0), paymentAmount: Number(ride.payment?.amount || 0),
    fare: ride.status === "COMPLETED" ? `Rs. ${Number(ride.final_fare || ride.estimated_fare || 0).toFixed(2)}` : undefined,
    distance: ride.distance_km ? `${Number(ride.distance_km).toFixed(1)} km` : undefined,
    distanceKm: Number(ride.distance_km || 0), estimatedDistanceKm: Number(ride.estimated_distance_km || 0), actualDistanceKm: Number(ride.actual_distance_km || 0),
    duration: duration ? `${Math.round(duration)} min` : undefined,
    estimatedDurationMinutes: Number(ride.estimated_duration_minutes || 0), actualDurationMinutes: Number(ride.actual_duration_minutes || 0),
    driverName: user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : undefined,
    driverProfilePicture: user?.profile_picture || user?.profile_picture_url,
    vehicleLabel: [ride.vehicle?.brand, ride.vehicle?.model].filter(Boolean).join(" ") || ride.vehicle?.vehicle_type,
    vehicleNumber: ride.vehicle?.vehicle_number, paymentMethod: ride.payment?.payment_method, paymentStatus: ride.payment?.payment_status,
  };
}

const PAGE_SIZE = 15;

export default function PastTripsTab({ status }: { status: PastRideStatus }) {
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const loadingMoreRef = useRef(false);

  const load = useCallback(async (nextPage = 1, refresh = false) => {
    if (nextPage > 1 && loadingMoreRef.current) return;

    if (nextPage > 1) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else {
      refresh ? setRefreshing(true) : setLoading(true);
    }

    setError("");

    try {
      const response = await getRideHistory(status, nextPage, PAGE_SIZE);
      if (response.success && response.data) {
        const mappedTrips = response.data.data.map(mapRide);
        setTrips((current) => nextPage === 1 ? mappedTrips : [...current, ...mappedTrips]);
        setPage(response.data.current_page);
        setLastPage(response.data.last_page);
      } else {
        setError(response.message || "We couldn't load your rides.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [status]);

  useEffect(() => { load(1); }, [load]);

  const refresh = useCallback(() => load(1, true), [load]);
  const loadNextPage = useCallback(() => {
    if (!loading && !refreshing && !loadingMore && page < lastPage) {
      void load(page + 1);
    }
  }, [lastPage, load, loading, loadingMore, page, refreshing]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={tripColors.GREEN} /><Text style={styles.help}>Loading your rides...</Text></View>;
  if (error && !trips.length) return <View style={styles.center}><Ionicons name="cloud-offline-outline" size={36} color={tripColors.DEEP} /><Text style={styles.title}>Couldn't load activities</Text><Text style={styles.help}>{error}</Text><TouchableOpacity style={styles.retry} onPress={() => load(1)}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View>;
  if (!trips.length) return <EmptyState title={status === "COMPLETED" ? "No completed rides" : "No cancelled rides"} message="Your ride history will appear here." />;
  return (
    <ScreenTransition style={styles.container}>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TripRow trip={item} />}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[tripColors.GREEN]} tintColor={tripColors.GREEN} />}
        ListHeaderComponent={<TripSectionHeader title={status === "COMPLETED" ? "Completed rides" : "Cancelled rides"} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={loadNextPage}
        onEndReachedThreshold={0.35}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={tripColors.GREEN} />
              <Text style={styles.footerText}>Loading more rides...</Text>
            </View>
          ) : page < lastPage ? (
            <TouchableOpacity style={styles.loadMoreButton} onPress={loadNextPage} activeOpacity={0.86}>
              <Text style={styles.loadMoreText}>Load more</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.endText}>End of activities</Text>
          )
        }
      />
    </ScreenTransition>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tripColors.BG }, content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 112 },
  separator: { height: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36, paddingBottom: 96 },
  title: { color: tripColors.DARK, fontSize: 18, fontWeight: "900", marginTop: 14 },
  help: { color: tripColors.MUTED, fontSize: 14, textAlign: "center", marginTop: 9 },
  retry: { backgroundColor: tripColors.DEEP, borderRadius: 22, paddingHorizontal: 24, paddingVertical: 13, marginTop: 18 },
  retryText: { color: "#FFF", fontWeight: "900" },
  footerLoader: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  footerText: { color: tripColors.MUTED, fontSize: 12, fontWeight: "800" },
  loadMoreButton: { height: 46, borderRadius: 23, borderWidth: 1, borderColor: tripColors.LINE, alignItems: "center", justifyContent: "center", marginTop: 12 },
  loadMoreText: { color: tripColors.DEEP, fontSize: 14, fontWeight: "900" },
  endText: { color: tripColors.MUTED, fontSize: 12, fontWeight: "800", textAlign: "center", paddingTop: 18 },
});
