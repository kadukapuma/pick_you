import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient"; // Added LinearGradient

const dummyTrips = [
  {
    id: "1",
    destination: "Kandy City Centre",
    date: "Today, 12:30 PM",
    amount: "Rs.1,250",
    status: "Completed",
    distance: "4.2 km",
  },
  {
    id: "2",
    destination: "Peradeniya Botanical Garden",
    date: "Today, 10:15 AM",
    amount: "Rs.1,820",
    status: "Completed",
    distance: "7.1 km",
  },
  {
    id: "3",
    destination: "Getambe Temple",
    date: "Yesterday, 06:45 PM",
    amount: "Rs.0.00",
    status: "Cancelled",
    distance: "2.5 km",
  },
  {
    id: "4",
    destination: "Amaya Hills Kandy",
    date: "Yesterday, 04:20 PM",
    amount: "Rs.2,500",
    status: "Completed",
    distance: "12.0 km",
  },
  {
    id: "5",
    destination: "Dalada Maligawa",
    date: "10 May, 09:00 AM",
    amount: "Rs.1,080",
    status: "Completed",
    distance: "3.8 km",
  },
];

const ActivityScreen = () => {
  const navigation = useNavigation();
  const [filter, setFilter] = useState("All");

  const fadeAnims = useRef(dummyTrips.map(() => new Animated.Value(0))).current;
  const slideAnims = useRef(dummyTrips.map(() => new Animated.Value(20))).current;

  useEffect(() => {
    const animations = dummyTrips.map((_, i) => {
      return Animated.parallel([
        Animated.timing(fadeAnims[i], {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnims[i], {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]);
    });
    Animated.stagger(100, animations).start();
  }, [filter]);

  const renderTripItem = ({ item, index }) => (
    <Animated.View
      style={{
        opacity: fadeAnims[index],
        transform: [{ translateY: slideAnims[index] }],
      }}
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
            {item.destination}
          </Text>
          <Text style={styles.dateText}>{item.date} • {item.distance}</Text>
        </View>

        <View style={styles.amountContainer}>
          <Text style={[
            styles.amountText, 
            item.status === "Cancelled" && styles.cancelledText
          ]}>
            {item.status === "Cancelled" ? "Cancelled" : item.amount}
          </Text>
          <Feather name="chevron-right" size={16} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" />
      
      {/* Updated Header with LinearGradient */}
      <LinearGradient
        colors={['#00A859', '#007A41']}
        style={styles.headerGradient}
      >
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
      </LinearGradient>

      <View style={styles.content}>
        {dummyTrips.length > 0 ? (
          <FlatList
            data={dummyTrips}
            renderItem={renderTripItem}
            keyExtractor={(item) => item.id}
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
  headerGradient: {
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