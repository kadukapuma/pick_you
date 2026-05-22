import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

const PERIOD_DATA = {
  day: {
    title: "Today",
    mainAmount: 452.1,
    trendText: "+12% from yesterday",
    trips: 18,
    hoursOnline: 6.5,
    avgPerTrip: 25.12,
    rating: 4.9,
    weeklyGoal: 500,
    goalProgress: 78,
    chartLabel: "This Day",
    chartData: [
      { label: "6", amount: 35 },
      { label: "9", amount: 52 },
      { label: "12", amount: 68 },
      { label: "3", amount: 84 },
      { label: "6", amount: 74 },
      { label: "9", amount: 98 },
    ],
  },
  week: {
    title: "This Week",
    mainAmount: 2452.1,
    trendText: "+12% from last week",
    trips: 247,
    hoursOnline: 42.5,
    avgPerTrip: 24.8,
    rating: 4.9,
    weeklyGoal: 1500,
    goalProgress: 78,
    chartLabel: "This Week",
    chartData: [
      { label: "Mon", amount: 125 },
      { label: "Tue", amount: 189 },
      { label: "Wed", amount: 145 },
      { label: "Thu", amount: 210 },
      { label: "Fri", amount: 245 },
      { label: "Sat", amount: 198 },
      { label: "Sun", amount: 150 },
    ],
  },
  month: {
    title: "This Month",
    mainAmount: 9850.75,
    trendText: "+18% from last month",
    trips: 1034,
    hoursOnline: 176.2,
    avgPerTrip: 26.15,
    rating: 4.9,
    weeklyGoal: 6000,
    goalProgress: 84,
    chartLabel: "This Month",
    chartData: [
      { label: "W1", amount: 1800 },
      { label: "W2", amount: 2200 },
      { label: "W3", amount: 2400 },
      { label: "W4", amount: 3450 },
    ],
  },
};

const EarningsScreen = () => {
  const [period, setPeriod] = useState("day");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const summary = useMemo(() => PERIOD_DATA[period], [period]);

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(24);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, [period, fadeAnim, slideAnim]);

  const maxAmount = Math.max(...summary.chartData.map((d) => d.amount));

  const platformFee = summary.mainAmount * 0.15;
  const driverNet = summary.mainAmount - platformFee;

  const StatCard = ({ icon, label, value, bgColor, iconColor }) => (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <View style={styles.statIconContainer}>
        <Feather name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  const formatRs = (amount) => `Rs.${amount.toFixed(2)}`;

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#00A859" />

      <View style={styles.circleGraphic} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.scrollContent}
      >
        <LinearGradient colors={["#00A859", "#007A41"]} style={styles.headerGradient}>
          <SafeAreaView edges={["top"]}>
            <Text style={styles.headerTitle}>Earnings</Text>

            <View style={styles.tabContainer}>
              {["day", "week", "month"].map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[styles.tab, period === p && styles.activeTab]}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.tabText,
                      period === p && styles.activeTabText,
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              <Text style={styles.mainAmount}>{formatRs(summary.mainAmount)}</Text>

              <View style={styles.trendRow}>
                <Feather name="trending-up" size={16} color="#FFF" />
                <Text style={styles.trendText}>{summary.trendText}</Text>
              </View>
            </Animated.View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownHeader}>
              <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
              <Text style={styles.breakdownPeriod}>{summary.title}</Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Total Earnings</Text>
              <Text style={styles.breakdownValue}>{formatRs(summary.mainAmount)}</Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Platform Fee (15%)</Text>
              <Text style={styles.breakdownValueRed}>- {formatRs(platformFee)}</Text>
            </View>

            <View style={styles.breakdownRowLast}>
              <Text style={styles.breakdownLabelNet}>Driver Net Earnings</Text>
              <Text style={styles.breakdownValueNet}>{formatRs(driverNet)}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>{summary.chartLabel}</Text>
          <View style={styles.chartContainer}>
            <View style={styles.barWrapper}>
              {summary.chartData.map((item, index) => {
                const barHeight = (item.amount / maxAmount) * 120;
                const isLast = index === summary.chartData.length - 1;

                return (
                  /* Fixed by passing both key and index to verify individual entries */
                  <View key={`${item.label}-${index}`} style={styles.barColumn}>
                    <View
                      style={[
                        styles.bar,
                        { height: barHeight },
                        isLast && styles.activeBar,
                      ]}
                    />
                    <Text style={styles.barLabel}>{item.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              icon="navigation"
              label="Total Trips"
              value={String(summary.trips)}
              bgColor="#F0FDF4"
              iconColor="#16A34A"
            />
            <StatCard
              icon="clock"
              label="Hours Online"
              value={String(summary.hoursOnline)}
              bgColor="#EFF6FF"
              iconColor="#2563EB"
            />
            <StatCard
              icon="dollar-sign"
              label="Avg. per Trip"
              value={formatRs(summary.avgPerTrip)}
              bgColor="#FAF5FF"
              iconColor="#9333EA"
            />
            <StatCard
              icon="star"
              label="Rating"
              value={String(summary.rating)}
              bgColor="#FFFBEB"
              iconColor="#D97706"
            />
          </View>

          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <View>
                <Text style={styles.goalLabel}>Weekly Goal</Text>
                <Text style={styles.goalValue}>{formatRs(summary.weeklyGoal)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.goalLabel}>Progress</Text>
                <Text style={styles.goalValue}>{summary.goalProgress}%</Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${summary.goalProgress}%` }]} />
            </View>

            <Text style={styles.goalSubtext}>
              {formatRs(summary.weeklyGoal * (1 - summary.goalProgress / 100))} more to reach your goal!
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default EarningsScreen;

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  scrollContent: {
    paddingBottom: 120,
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
  headerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFF",
    marginTop: 20,
  },
  tabContainer: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 24,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  activeTab: {
    backgroundColor: "#FFF",
  },
  tabText: {
    color: "#FFF",
    fontWeight: "600",
  },
  activeTabText: {
    color: "#00A859",
  },
  mainAmount: {
    fontSize: 48,
    fontWeight: "800",
    color: "#FFF",
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  trendText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
    opacity: 0.9,
  },
  content: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 16,
  },
  breakdownCard: {
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
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  breakdownPeriod: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  breakdownRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  breakdownLabelNet: {
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "800",
  },
  breakdownValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "700",
  },
  breakdownValueRed: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "700",
  },
  breakdownValueNet: {
    fontSize: 16,
    color: "#00A859",
    fontWeight: "800",
  },
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
  barWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 150,
  },
  barColumn: {
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  bar: {
    width: 12,
    backgroundColor: "#E2E8F0",
    borderRadius: 6,
  },
  activeBar: {
    backgroundColor: "#00A859",
  },
  barLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 60) / 2,
    padding: 16,
    borderRadius: 24,
  },
  statIconContainer: {
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  goalCard: {
    backgroundColor: "#2563EB",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  goalLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginBottom: 4,
  },
  goalValue: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "800",
  },
  progressTrack: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: 4,
  },
  goalSubtext: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 12,
  },
});