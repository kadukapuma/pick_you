import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CreditTransactionRow from "../../../../features/payments/CreditTransactionRow";
import { formatLkr } from "../../../../features/payments/paymentTheme";
import { creditService } from "../../../../services/payments/creditService";
import type { PickuCreditSummary } from "../../../../services/payments/creditTypes";

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<PickuCreditSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    const result = await creditService.getSummary();
    if (result.success && result.data) {
      setSummary(result.data);
      setError("");
    } else {
      setError(result.message || "We couldn’t load your PickU credit.");
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color="#063D31" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PickU credit</Text><View style={styles.headerSpace} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#067A50" />}
        showsVerticalScrollIndicator={false}
      >
        {loading && !summary ? (
          <View style={styles.loadingCard}><ActivityIndicator color="#067A50" /><Text style={styles.loadingText}>Loading your credit…</Text></View>
        ) : error && !summary ? (
          <View style={styles.errorCard}>
            <Ionicons name="cloud-offline-outline" size={30} color="#9A5B06" />
            <Text style={styles.errorTitle}>We couldn’t load your PickU credit</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retry} onPress={() => void load()}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
          </View>
        ) : summary ? <>
          <View style={styles.balanceCard} accessible accessibilityLabel={`Available credit ${formatLkr(summary.availableBalance)}. Reserved credit ${formatLkr(summary.reservedBalance)}`}>
            <View style={styles.balanceTop}><Text style={styles.eyebrow}>AVAILABLE CREDIT</Text><View style={styles.walletIcon}><Ionicons name="wallet" size={20} color="#FFFFFF" /></View></View>
            <Text style={styles.balance}>{formatLkr(summary.availableBalance)}</Text>
            <View style={styles.reservedLine}><Ionicons name="time-outline" size={16} color="#D8F7EA" /><Text style={styles.reserved}>{formatLkr(summary.reservedBalance)} reserved</Text></View>
          </View>
          {error ? <View style={styles.inlineWarning}><Ionicons name="warning-outline" size={18} color="#9A5B06" /><Text style={styles.inlineText}>Showing saved results. Pull down to try again.</Text></View> : null}
          <TouchableOpacity style={styles.explainRow} onPress={() => Alert.alert("Reserved PickU credit", "Reserved credit is temporarily held for a payment that is still being confirmed. It cannot be used for another ride until that payment completes or the reservation is released.", [{ text: "Close" }])} accessibilityRole="button">
            <Ionicons name="help-circle-outline" size={20} color="#067A50" /><Text style={styles.explainText}>What is reserved credit?</Text><Ionicons name="chevron-forward" size={18} color="#94A39E" />
          </TouchableOpacity>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recent activity</Text>{summary.transactions.length > 5 ? <TouchableOpacity onPress={() => router.push("/(app)/(tabs)/account/wallet-transactions" as any)}><Text style={styles.link}>View all</Text></TouchableOpacity> : null}</View>
          <View style={styles.activityCard}>
            {summary.transactions.length ? summary.transactions.slice(0, 5).map((transaction) => <CreditTransactionRow key={transaction.id} transaction={transaction} onPress={() => router.push(`/(app)/(tabs)/account/wallet-transaction/${transaction.id}` as any)} />) : <View style={styles.empty}><Ionicons name="receipt-outline" size={34} color="#91A39C" /><Text style={styles.emptyTitle}>No credit activity yet</Text><Text style={styles.emptyText}>Credits, ride usage and adjustments will appear here.</Text></View>}
          </View>
          {summary.transactions.length > 0 ? <TouchableOpacity style={styles.allButton} onPress={() => router.push("/(app)/(tabs)/account/wallet-transactions" as any)}><Text style={styles.allText}>View all activity</Text><Ionicons name="arrow-forward" size={18} color="#067A50" /></TouchableOpacity> : null}
        </> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F2FBF8" }, header: { height: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }, back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.72)", borderWidth: 1, borderColor: "#DDEBE6" }, headerTitle: { color: "#18231F", fontSize: 18, fontWeight: "900" }, headerSpace: { width: 40 }, content: { padding: 18, paddingBottom: 110 },
  balanceCard: { borderRadius: 26, padding: 22, minHeight: 174, backgroundColor: "#075E48", shadowColor: "#063D31", shadowOpacity: .18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 }, balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, eyebrow: { color: "#BDECDC", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 }, walletIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: "rgba(255,255,255,.16)", alignItems: "center", justifyContent: "center" }, balance: { color: "#FFFFFF", fontSize: 31, fontWeight: "900", marginTop: 13 }, reservedLine: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 18 }, reserved: { color: "#D8F7EA", fontSize: 13, fontWeight: "700" },
  explainRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 4 }, explainText: { flex: 1, color: "#355049", fontSize: 13, fontWeight: "800" }, sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 10 }, sectionTitle: { color: "#18231F", fontSize: 17, fontWeight: "900" }, link: { color: "#067A50", fontSize: 12, fontWeight: "800" }, activityCard: { backgroundColor: "rgba(255,255,255,.72)", borderRadius: 22, paddingHorizontal: 15, borderWidth: 1, borderColor: "#DCE9E4" }, empty: { alignItems: "center", padding: 28 }, emptyTitle: { color: "#25342F", fontSize: 15, fontWeight: "900", marginTop: 10 }, emptyText: { color: "#71817B", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 5 }, allButton: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, allText: { color: "#067A50", fontSize: 13, fontWeight: "900" },
  loadingCard: { minHeight: 220, alignItems: "center", justifyContent: "center", gap: 12 }, loadingText: { color: "#71817B", fontWeight: "700" }, errorCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 22, padding: 28, borderWidth: 1, borderColor: "#E4ECE9" }, errorTitle: { color: "#25342F", fontSize: 17, fontWeight: "900", textAlign: "center", marginTop: 12 }, errorText: { color: "#71817B", fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 6 }, retry: { backgroundColor: "#067A50", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 18 }, retryText: { color: "#FFFFFF", fontWeight: "900" }, inlineWarning: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, marginTop: 12, borderRadius: 14, backgroundColor: "#FFF8E8" }, inlineText: { flex: 1, color: "#7A5310", fontSize: 12, lineHeight: 17 },
});
