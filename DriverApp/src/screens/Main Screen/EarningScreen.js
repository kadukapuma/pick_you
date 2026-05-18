import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const EarningsScreen = () => {
  const [period, setPeriod] = useState("day");
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [period]);

  const mockDailyData = [
    { day: "Mon", amount: 125 },
    { day: "Tue", amount: 189 },
    { day: "Wed", amount: 145 },
    { day: "Thu", amount: 210 },
    { day: "Fri", amount: 245 },
    { day: "Sat", amount: 198 },
    { day: "Sun", amount: 150 },
  ];

  const StatCard = ({ icon, label, value, bgColor, iconColor }) => (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <View style={styles.statIconContainer}>
        <Feather name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.circleGraphic} />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        bounces={false}
        contentContainerStyle={styles.scrollContent} // Added for bottom padding
      >
        {/* Updated Green Header */}
        <View style={styles.header}>
          <SafeAreaView edges={["top"]}>
            <Text style={styles.headerTitle}>Earnings</Text>
            
            <View style={styles.tabContainer}>
              {["day", "week", "month"].map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[styles.tab, period === p && styles.activeTab]}
                >
                  <Text style={[styles.tabText, period === p && styles.activeTabText]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <Text style={styles.mainAmount}>Rs.452.10</Text>
              <View style={styles.trendRow}>
                <Feather name="trending-up" size={16} color="#FFF" />
                <Text style={styles.trendText}>+12% from last {period}</Text>
              </View>
            </Animated.View>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.chartContainer}>
            <View style={styles.barWrapper}>
              {mockDailyData.map((item, index) => {
                const maxAmount = Math.max(...mockDailyData.map((d) => d.amount));
                const barHeight = (item.amount / maxAmount) * 120;
                const isToday = index === 6;

                return (
                  <View key={index} style={styles.barColumn}>
                    <View style={[styles.bar, { height: barHeight }, isToday && styles.activeBar]} />
                    <Text style={styles.barLabel}>{item.day}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.statsGrid}>
            <StatCard icon="navigation" label="Total Trips" value="247" bgColor="#F0FDF4" iconColor="#16A34A" />
            <StatCard icon="clock" label="Hours Online" value="42.5" bgColor="#EFF6FF" iconColor="#2563EB" />
            <StatCard icon="dollar-sign" label="Avg. per Trip" value="Rs.24.80" bgColor="#FAF5FF" iconColor="#9333EA" />
            <StatCard icon="star" label="Rating" value="4.9" bgColor="#FFFBEB" iconColor="#D97706" />
          </View>

          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View>
                <Text style={styles.goalLabel}>Weekly Goal</Text>
                <Text style={styles.goalValue}>Rs.1,500</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.goalLabel}>Progress</Text>
                <Text style={styles.goalValue}>78%</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: "78%" }]} />
            </View>
            <Text style={styles.goalSubtext}>Rs.330 more to reach your goal!</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default EarningsScreen;

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#FFF" },
  scrollContent: {
    paddingBottom: 120, // INCREASED padding to ensure the goal card isn't hidden by the bottom navbar
  },
  circleGraphic: {
    position: "absolute",
    top: 250,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(0, 168, 89, 0.05)",
  },
  header: {
    backgroundColor: "#00a85a", // BRAND GREEN
    paddingHorizontal: 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    // Subtle shadow for the header
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFF", marginTop: 20 },
  tabContainer: { flexDirection: "row", gap: 8, marginVertical: 24 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)" },
  activeTab: { backgroundColor: "#FFF" },
  tabText: { color: "#FFF", fontWeight: "600" },
  activeTabText: { color: "#00A859" },
  mainAmount: { fontSize: 48, fontWeight: "800", color: "#FFF" },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  trendText: { color: "#FFF", fontWeight: "600", fontSize: 14, opacity: 0.9 },
  content: { padding: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginBottom: 16 },
  chartContainer: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    marginBottom: 24,
  },
  barWrapper: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 150 },
  barColumn: { alignItems: "center", gap: 8, flex: 1 },
  bar: { width: 12, backgroundColor: "#E2E8F0", borderRadius: 6 },
  activeBar: { backgroundColor: "#00A859" }, // Matching the green theme
  barLabel: { fontSize: 10, color: "#64748B", fontWeight: "600" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  statCard: { width: (width - 60) / 2, padding: 16, borderRadius: 24 },
  statIconContainer: { marginBottom: 12 },
  statLabel: { fontSize: 13, color: "#64748B", marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  goalCard: {
    backgroundColor: "#2563EB",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  goalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  goalLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 4 },
  goalValue: { color: "#FFF", fontSize: 24, fontWeight: "800" },
  progressTrack: { height: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 4 },
  progressBar: { height: "100%", backgroundColor: "#FFF", borderRadius: 4 },
  goalSubtext: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 12 },
});