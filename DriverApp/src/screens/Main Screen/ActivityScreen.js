import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import api from "../../services/api";
import { setActiveRideLocationSync } from "../../services/driverLocationSync";
import { normalizeRidePayload } from "../../utils/rideLocation";

const PAGE_SIZE = 15;

const FILTERS = [
  { label: "All", value: "" },
  { label: "Ongoing", value: "ongoing" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const ONGOING_STATUS_ROUTE = {
  ACCEPTED: "PickupNavigation",
  ARRIVED: "ArrivedAtPickupScreen",
  STARTED: "TripInProgressScreen",
};

const formatDateTime = (value) => {
  if (!value) return "Recent trip";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent trip";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const money = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? `Rs.${amount.toFixed(2)}` : "Rs.0.00";
};

const readRideTime = (ride) =>
  ride.completed_at ||
  ride.cancelled_at ||
  ride.started_at ||
  ride.arrived_at ||
  ride.accepted_at ||
  ride.requested_at ||
  ride.updated_at;

const statusLabel = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "ACCEPTED":
      return "To pickup";
    case "ARRIVED":
      return "Arrived";
    case "STARTED":
      return "On trip";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Trip";
  }
};

const statusTone = (status) => {
  const upperStatus = String(status || "").toUpperCase();
  if (["ACCEPTED", "ARRIVED", "STARTED"].includes(upperStatus)) {
    return { bg: "#DCFCE7", text: "#15803D", icon: "navigation" };
  }
  if (upperStatus === "COMPLETED") {
    return { bg: "#ECFDF5", text: "#047857", icon: "check-circle" };
  }
  if (upperStatus === "CANCELLED") {
    return { bg: "#FEE2E2", text: "#DC2626", icon: "x-circle" };
  }
  return { bg: "#E2E8F0", text: "#475569", icon: "clock" };
};

const mapRide = (source) => {
  const ride = normalizeRidePayload(source);
  const status = String(source.status || ride.status || "").toUpperCase();
  const fare = source.final_fare ?? source.estimated_fare ?? ride.price;

  return {
    ...ride,
    raw: source,
    id: String(ride.id || source.id),
    status,
    destination: ride.drop || "Destination",
    pickup: ride.pickup || "Pickup",
    date: formatDateTime(readRideTime(source)),
    amount: money(fare),
    distance: ride.distance || "0.0 km",
    passenger: ride.customerName || "Passenger",
  };
};

const getPagePayload = (response) => response.data?.data ?? response.data ?? {};

const buildHistoryEndpoint = (filter, page) => {
  const params = [`page=${page}`, `per_page=${PAGE_SIZE}`];
  if (filter) params.push(`status=${encodeURIComponent(filter)}`);
  return `/driver/rides?${params.join("&")}`;
};

const ActivityScreen = () => {
  const navigation = useNavigation();
  const [filter, setFilter] = useState("");
  const [trips, setTrips] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const loadingMoreRef = useRef(false);

  const activeFilterLabel = useMemo(
    () => FILTERS.find((item) => item.value === filter)?.label || "All",
    [filter],
  );

  const loadTrips = useCallback(async (nextPage = 1, refresh = false) => {
    if (nextPage > 1 && loadingMoreRef.current) return;

    if (nextPage > 1) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get(buildHistoryEndpoint(filter, nextPage));
      const payload = getPagePayload(response);
      const mappedTrips = Array.isArray(payload.data)
        ? payload.data.map(mapRide)
        : [];

      setTrips((current) =>
        nextPage === 1 ? mappedTrips : [...current, ...mappedTrips],
      );
      setPage(Number(payload.current_page || nextPage));
      setLastPage(Number(payload.last_page || 1));
    } catch (requestError) {
      console.log("Driver ride history error:", requestError.response?.data || requestError);
      setError(
        requestError.response?.data?.message ||
        "Could not load your trip history.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [filter]);

  useEffect(() => {
    loadTrips(1);
  }, [loadTrips]);

  const handleRefresh = useCallback(() => {
    loadTrips(1, true);
  }, [loadTrips]);

  const handleLoadMore = useCallback(() => {
    if (!loading && !refreshing && !loadingMore && page < lastPage) {
      loadTrips(page + 1);
    }
  }, [lastPage, loadTrips, loading, loadingMore, page, refreshing]);

  const handleFilterPress = (nextFilter) => {
    if (nextFilter === filter) return;
    setFilter(nextFilter);
    setTrips([]);
    setPage(1);
    setLastPage(1);
  };

  const openTrip = (trip) => {
    const ride = {
      ...trip.raw,
      ...normalizeRidePayload(trip.raw),
      status: trip.status,
    };
    const routeName = ONGOING_STATUS_ROUTE[trip.status];

    if (routeName) {
      if (ride.id) {
        setActiveRideLocationSync(ride.id).catch((syncError) => {
          console.log("Could not resume active ride location sync:", syncError);
        });
      }
      navigation.navigate(routeName, { ride });
      return;
    }

    navigation.navigate("TripDetails", { trip: ride });
  };

  const renderTripItem = ({ item }) => {
    const tone = statusTone(item.status);
    const isCancelled = item.status === "CANCELLED";

    return (
      <TouchableOpacity
        style={styles.tripCard}
        activeOpacity={0.78}
        onPress={() => openTrip(item)}
      >
        <View style={[styles.tripIconContainer, { backgroundColor: tone.bg }]}>
          <Feather name={tone.icon} size={20} color={tone.text} />
        </View>

        <View style={styles.tripDetails}>
          <Text style={styles.destinationText} numberOfLines={1}>
            {item.destination}
          </Text>
          <Text style={styles.dateText} numberOfLines={1}>
            {item.date} - {item.distance}
          </Text>
          <Text style={styles.passengerText} numberOfLines={1}>
            {item.passenger}
          </Text>
        </View>

        <View style={styles.amountContainer}>
          <Text style={[styles.amountText, isCancelled && styles.cancelledText]} numberOfLines={1}>
            {isCancelled ? "Cancelled" : item.amount}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
            <Text style={[styles.statusText, { color: tone.text }]}>
              {statusLabel(item.status)}
            </Text>
          </View>
        </View>

        <Feather name="chevron-right" size={16} color="#94A3B8" />
      </TouchableOpacity>
    );
  };

  const listFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#00A859" />
          <Text style={styles.footerText}>Loading more trips...</Text>
        </View>
      );
    }

    if (page < lastPage) {
      return (
        <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
          <Text style={styles.loadMoreText}>Load more</Text>
        </TouchableOpacity>
      );
    }

    if (trips.length > 0) {
      return <Text style={styles.endText}>End of {activeFilterLabel.toLowerCase()} trips</Text>;
    }

    return null;
  };

  const emptyState = () => {
    if (loading) return null;

    if (error) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Feather name="wifi-off" size={36} color="#CBD5E1" />
          </View>
          <Text style={styles.emptyTitle}>Could not load trips</Text>
          <Text style={styles.emptySub}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadTrips(1)}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconCircle}>
          <Feather name="clock" size={40} color="#CBD5E1" />
        </View>
        <Text style={styles.emptyTitle}>No {activeFilterLabel.toLowerCase()} trips</Text>
        <Text style={styles.emptySub}>Your real driver trips will appear here.</Text>
      </View>
    );
  };

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#00A859", "#007A41"]}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={["top"]}>
          <Text style={styles.headerTitle}>Trip History</Text>

          <View style={styles.filterContainer}>
            {FILTERS.map((item) => (
              <TouchableOpacity
                key={item.value || "all"}
                onPress={() => handleFilterPress(item.value)}
                style={[styles.filterBtn, filter === item.value && styles.activeFilterBtn]}
              >
                <Text style={[styles.filterText, filter === item.value && styles.activeFilterText]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#00A859" />
            <Text style={styles.loadingText}>Loading your trips...</Text>
          </View>
        ) : (
          <FlatList
            data={trips}
            renderItem={renderTripItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listPadding,
              trips.length === 0 && styles.emptyListPadding,
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#00A859"]}
                tintColor="#00A859"
              />
            }
            ListEmptyComponent={emptyState}
            ListFooterComponent={listFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.35}
          />
        )}
      </View>
    </View>
  );
};

export default ActivityScreen;

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#F8FAFC" },
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 26,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#FFF", marginTop: 20 },
  filterContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 22 },
  filterBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  activeFilterBtn: { backgroundColor: "#FFF" },
  filterText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  activeFilterText: { color: "#00A859" },
  content: { flex: 1 },
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 100 },
  loadingText: { marginTop: 12, color: "#64748B", fontSize: 14, fontWeight: "700" },
  listPadding: { padding: 20, paddingBottom: 112 },
  emptyListPadding: { flexGrow: 1 },
  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tripIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  tripDetails: { flex: 1, minWidth: 0 },
  destinationText: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 4 },
  dateText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  passengerText: { fontSize: 12, color: "#94A3B8", fontWeight: "700", marginTop: 4 },
  amountContainer: { alignItems: "flex-end", gap: 6, marginLeft: 10, maxWidth: 104 },
  amountText: { fontSize: 15, fontWeight: "800", color: "#1E293B" },
  cancelledText: { color: "#EF4444", fontSize: 13, fontWeight: "700" },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: "800" },
  footerLoader: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerText: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  loadMoreButton: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCE8E2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    backgroundColor: "#FFFFFF",
  },
  loadMoreText: { color: "#007A41", fontSize: 14, fontWeight: "800" },
  endText: { color: "#94A3B8", fontSize: 12, fontWeight: "700", textAlign: "center", paddingTop: 18 },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 30, paddingBottom: 100 },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B", marginBottom: 8, textAlign: "center" },
  emptySub: { fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 20 },
  retryButton: {
    marginTop: 18,
    backgroundColor: "#00A859",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
});
