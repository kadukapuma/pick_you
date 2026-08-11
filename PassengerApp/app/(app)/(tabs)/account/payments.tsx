import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatLkr } from "../../../../features/payments/paymentTheme";
import { creditService } from "../../../../services/payments/creditService";
import { paymentService } from "../../../../services/payments/paymentService";

export default function PaymentsScreen() {
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState<string | null>(null);
  const [gateway, setGateway] = useState("WEBXPAY");
  useEffect(() => {
    let active = true;
    void Promise.all([
      creditService.getSummary(),
      paymentService.getCapabilities(),
    ]).then(([credit, capabilities]) => {
      if (!active) return;
      if (credit.success && credit.data)
        setBalance(credit.data.availableBalance);
      if (capabilities.gateway && capabilities.gateway !== "unavailable")
        setGateway(capabilities.gateway.toUpperCase());
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#063D31" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments</Text>
        <View style={styles.space} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="card-outline" size={28} color="#063D31" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>Payments</Text>
            <Text style={styles.subtitle}>
              Manage how you pay for PickU rides
            </Text>
          </View>
        </View>
        <Text style={styles.sectionLabel}>DEFAULT FOR NEW RIDES</Text>
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push("/ride-booking/payment-method" as any)}
        >
          <View style={styles.rowIcon}>
            <Ionicons name="cash-outline" size={22} color="#067A50" />
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Cash</Text>
            <Text style={styles.rowSubtitle}>
              Change your booking payment method
            </Text>
          </View>
          <Text style={styles.change}>Change</Text>
          <Ionicons name="chevron-forward" size={18} color="#94A39E" />
        </TouchableOpacity>
        <Text style={styles.sectionLabel}>PAYMENT METHODS</Text>
        <View style={styles.group}>
          <TouchableOpacity
            style={styles.groupRow}
            onPress={() => router.push("/payments/cards" as any)}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="card-outline" size={22} color="#067A50" />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Credit or debit card</Text>
              <Text style={styles.rowSubtitle}>
              Manage cards secured by {gateway}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A39E" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.groupRow}
            onPress={() => router.push("/(app)/(tabs)/account/wallet" as any)}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="wallet-outline" size={22} color="#067A50" />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>PickU credit</Text>
              <Text style={styles.rowSubtitle}>
                {balance === null
                  ? "View balance and activity"
                  : `${formatLkr(balance)} available`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A39E" />
          </TouchableOpacity>
        </View>
        <View style={styles.security}>
          <Ionicons name="shield-checkmark-outline" size={22} color="#067A50" />
          <View style={styles.securityCopy}>
            <Text style={styles.securityTitle}>Payment security</Text>
            <Text style={styles.securityText}>
              Card details are collected by {gateway}. PickU never stores your
              full card number or CVV.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F2FBF8" },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDEBE6",
  },
  headerTitle: { color: "#18231F", fontSize: 18, fontWeight: "900" },
  space: { width: 40 },
  content: { padding: 18, paddingBottom: 100 },
  hero: { flexDirection: "row", alignItems: "center", marginBottom: 28 },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: "#DDF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  heroCopy: { flex: 1 },
  title: { color: "#18231F", fontSize: 24, fontWeight: "900" },
  subtitle: { color: "#697872", fontSize: 13, lineHeight: 18, marginTop: 4 },
  sectionLabel: {
    color: "#6A7772",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 9,
    marginTop: 10,
  },
  row: {
    minHeight: 78,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DCE9E4",
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 18,
    backgroundColor: "rgba(255,255,255,.55)",
  },
  group: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#DCE9E4",
    backgroundColor: "rgba(255,255,255,.65)",
    paddingHorizontal: 14,
  },
  groupRow: { minHeight: 78, flexDirection: "row", alignItems: "center" },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#DCE9E4",
    marginLeft: 54,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#E4F8EF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: "#25342F", fontSize: 14, fontWeight: "900" },
  rowSubtitle: { color: "#71817B", fontSize: 11, lineHeight: 16, marginTop: 3 },
  change: { color: "#067A50", fontSize: 11, fontWeight: "900", marginRight: 3 },
  security: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 18,
    padding: 16,
    marginTop: 20,
    backgroundColor: "#E8F8F1",
  },
  securityCopy: { flex: 1 },
  securityTitle: { color: "#25443A", fontSize: 13, fontWeight: "900" },
  securityText: {
    color: "#587069",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
});
