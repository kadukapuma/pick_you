import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import {
  fetchDriverAccount,
  fetchEarningsSummary,
  formatRs,
} from "../../services/earnings";

const { width } = Dimensions.get("window");

const PERIOD_TITLES = {
  day: "Today",
  week: "This Week",
  month: "This Month",
};

const EarningsScreen = () => {
  const [period, setPeriod] = useState("day");
  const [summary, setSummary] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const load = useCallback(async (selectedPeriod) => {
    try {
      setError(null);

      const [summaryData, accountData] = await Promise.all([
        fetchEarningsSummary(selectedPeriod),
        fetchDriverAccount(),
      ]);

      setSummary(summaryData);
      setAccount(accountData);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Could not load your earnings. Pull down to retry."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(period);
  }, [period, load]);

  // Refresh on focus so the balance reflects rides completed since last view.
  useFocusEffect(
    useCallback(() => {
      load(period);
    }, [period, load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(period);
  }, [period, load]);

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

  const chartData = summary?.chart || [];
  const maxAmount = Math.max(1, ...chartData.map((d) => Number(d.amount) || 0));
  const commissionRate = Number(summary?.gross) > 0
    ? (Number(summary.commission) / Number(summary.gross)) * 100
    : 0;

  const balance = Number(account?.balance ?? 0);
  const owesPickU = balance < 0;

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
      <StatusBar barStyle="light-content" backgroundColor="#00A859" />

      <View style={styles.circleGraphic} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A859" />
        }
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
              <Text style={styles.mainAmount}>
                {loading ? "—" : formatRs(summary?.net)}
              </Text>

              <View style={styles.trendRow}>
                <Feather name="check-circle" size={16} color="#FFF" />
                <Text style={styles.trendText}>
                  {loading
                    ? "Loading your earnings..."
                    : `${summary?.ride_count ?? 0} trip${
                        (summary?.ride_count ?? 0) === 1 ? "" : "s"
                      } · after commission`}
                </Text>
              </View>
            </Animated.View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.content}>
          {error && (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={16} color="#B91C1C" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#00A859" style={styles.loader} />
          ) : (
            <>
              {/* Signed position with PickU: the driver's single most important number. */}
              <View
                style={[
                  styles.balanceCard,
                  owesPickU ? styles.balanceCardOwing : styles.balanceCardOwed,
                ]}
              >
                <View style={styles.balanceHeader}>
                  <Feather
                    name={owesPickU ? "arrow-up-circle" : "arrow-down-circle"}
                    size={20}
                    color={owesPickU ? "#B91C1C" : "#15803D"}
                  />
                  <Text
                    style={[
                      styles.balanceLabel,
                      { color: owesPickU ? "#B91C1C" : "#15803D" },
                    ]}
                  >
                    {balance === 0
                      ? "Account settled"
                      : owesPickU
                        ? "You owe PickU"
                        : "PickU owes you"}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.balanceAmount,
                    { color: owesPickU ? "#B91C1C" : "#15803D" },
                  ]}
                >
                  {formatRs(balance)}
                </Text>

                <Text style={styles.balanceHint}>
                  {balance === 0
                    ? "Nothing outstanding either way."
                    : owesPickU
                      ? "Commission on cash rides you collected in full. Card rides reduce this automatically."
                      : "Your share of card rides, payable to your bank account."}
                </Text>

                {account?.should_warn && (
                  <View style={styles.warnRow}>
                    <Feather name="alert-triangle" size={14} color="#B45309" />
                    <Text style={styles.warnText}>
                      Approaching your {formatRs(account.credit_limit)} limit. Top up
                      soon to keep accepting rides.
                    </Text>
                  </View>
                )}

                {account?.over_credit_limit && (
                  <View style={styles.blockRow}>
                    <Feather name="slash" size={14} color="#FFF" />
                    <Text style={styles.blockText}>
                      You have passed your credit limit and cannot accept rides until
                      you top up.
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.breakdownCard}>
                <View style={styles.breakdownHeader}>
                  <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
                  <Text style={styles.breakdownPeriod}>{PERIOD_TITLES[period]}</Text>
                </View>

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Total Fares</Text>
                  <Text style={styles.breakdownValue}>{formatRs(summary?.gross)}</Text>
                </View>

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    PickU Commission{commissionRate > 0 ? ` (${commissionRate.toFixed(1)}%)` : ""}
                  </Text>
                  <Text style={styles.breakdownValueRed}>
                    - {formatRs(summary?.commission)}
                  </Text>
                </View>

                <View style={styles.breakdownRowLast}>
                  <Text style={styles.breakdownLabelNet}>Your Net Earnings</Text>
                  <Text style={styles.breakdownValueNet}>{formatRs(summary?.net)}</Text>
                </View>
              </View>

              {Number(summary?.cash_collected) > 0 && (
                <View style={styles.cashCard}>
                  <Feather name="dollar-sign" size={18} color="#B45309" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cashLabel}>Cash collected</Text>
                    <Text style={styles.cashHint}>
                      You are holding this. Commission on it is already in your balance
                      above.
                    </Text>
                  </View>
                  <Text style={styles.cashValue}>
                    {formatRs(summary?.cash_collected)}
                  </Text>
                </View>
              )}

              {chartData.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>{PERIOD_TITLES[period]}</Text>
                  <View style={styles.chartContainer}>
                    <View style={styles.barWrapper}>
                      {chartData.map((item, index) => {
                        const amount = Number(item.amount) || 0;
                        const barHeight = Math.max((amount / maxAmount) * 120, 2);
                        const isLast = index === chartData.length - 1;

                        return (
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
                </>
              )}

              <View style={styles.statsGrid}>
                <StatCard
                  icon="navigation"
                  label="Total Trips"
                  value={String(summary?.ride_count ?? 0)}
                  bgColor="#F0FDF4"
                  iconColor="#16A34A"
                />
                <StatCard
                  icon="percent"
                  label="Commission Paid"
                  value={formatRs(summary?.commission)}
                  bgColor="#FEF2F2"
                  iconColor="#DC2626"
                />
                <StatCard
                  icon="dollar-sign"
                  label="Avg. per Trip"
                  value={formatRs(summary?.average_per_trip)}
                  bgColor="#FAF5FF"
                  iconColor="#9333EA"
                />
                <StatCard
                  icon="star"
                  label="Rating"
                  value={Number(summary?.rating ?? 0).toFixed(1)}
                  bgColor="#FFFBEB"
                  iconColor="#D97706"
                />
              </View>
            </>
          )}
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
  loader: {
    marginVertical: 48,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  errorText: {
    flex: 1,
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
  },
  balanceCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
  },
  balanceCardOwing: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  balanceCardOwed: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 6,
  },
  balanceHint: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  warnRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  warnText: {
    flex: 1,
    fontSize: 12,
    color: "#B45309",
    fontWeight: "600",
    lineHeight: 16,
  },
  blockRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#B91C1C",
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  blockText: {
    flex: 1,
    fontSize: 12,
    color: "#FFF",
    fontWeight: "700",
    lineHeight: 16,
  },
  cashCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFBEB",
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  cashLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  cashHint: {
    fontSize: 11,
    color: "#78716C",
    marginTop: 2,
    lineHeight: 15,
  },
  cashValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#B45309",
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
});
