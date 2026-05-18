import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Animated,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native"; // Added hook
import { MotiView } from "moti";

import api from "../../services/api";

const ActivityScreen = () => {
  const navigation = useNavigation(); // Initialize navigation
  const [filter, setFilter] = useState("All");
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrips();
  }, [filter]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const response = await api.get("/rides");
      // Assuming response.data.data is the array of trips
      setTrips(response.data.data || []);
    } catch (error) {
      console.log("Error fetching trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderTripItem = ({ item, index }) => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ delay: index * 100 }}
    >
      <TouchableOpacity 
        style={styles.tripCard} 
        activeOpacity={0.7}
        onPress={() => navigation.navigate("TripDetails", { trip: item })}
      >
        <View style={styles.tripIconContainer}>
          <Feather name="map-pin" size={20} color="#00A859" />
        </View>
        
        <View style={styles.tripDetails}>
          <Text style={styles.destinationText} numberOfLines={1}>
            {item.dropoff_address || item.destination || "Unnamed Location"}
          </Text>
          <Text style={styles.dateText}>
            {item.created_at ? new Date(item.created_at).toLocaleDateString() : "Unknown date"} • {item.distance || "0 km"}
          </Text>
        </View>

        <View style={styles.amountContainer}>
          <Text style={[
            styles.amountText, 
            item.status === "cancelled" && styles.cancelledText
          ]}>
            {item.status === "cancelled" ? "Cancelled" : `Rs. ${item.fare || item.amount || "0"}`}
          </Text>
          <Feather name="chevron-right" size={16} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    </MotiView>
  );

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <SafeAreaView edges={["top"]}>
          <Text style={styles.headerTitle}>Trip History</Text>
          
          <View style={styles.filterContainer}>
            {["All", "Today", "This Week"].map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterBtn, filter === f && styles.activeFilterBtn]}
              >
                <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#00A859" />
          </View>
        ) : trips.length > 0 ? (
          <FlatList
            data={trips}
            renderItem={renderTripItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listPadding}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Feather name="clock" size={40} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySub}>Your completed trips will appear here</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default ActivityScreen;

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    backgroundColor: "#00A859",
    paddingHorizontal: 24,
    paddingBottom: 30,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#FFF", marginTop: 20 },
  filterContainer: { flexDirection: "row", gap: 10, marginTop: 25 },
  filterBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  activeFilterBtn: { backgroundColor: "#FFF" },
  filterText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  activeFilterText: { color: "#00A859" },
  content: { flex: 1 },
  listPadding: { padding: 20, paddingBottom: 100 },
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
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  tripDetails: { flex: 1 },
  destinationText: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 4 },
  dateText: { fontSize: 13, color: "#64748B" },
  amountContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  amountText: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  cancelledText: { color: "#EF4444", fontSize: 13, fontWeight: "600" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 100 },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#1E293B", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#64748B", textAlign: "center" },
});