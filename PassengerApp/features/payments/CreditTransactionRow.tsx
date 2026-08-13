import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { PickuCreditTransaction } from "../../services/payments/creditTypes";
import { formatLkr } from "./paymentTheme";

export function getCreditPresentation(transaction: PickuCreditTransaction) {
  switch (transaction.type) {
    case "CREDIT_AWARD":
      return { title: "Credit added", sign: "+", icon: "add" as const, tone: "positive" as const };
    case "CREDIT_RESERVATION":
      return { title: "Reserved for a ride", sign: "", icon: "time-outline" as const, tone: "neutral" as const };
    case "CREDIT_RELEASED":
      return { title: "Reservation released", sign: "+", icon: "refresh" as const, tone: "positive" as const };
    case "CREDIT_CONSUMED":
    case "RIDE_DEBIT":
      return { title: "Used for a ride", sign: "−", icon: "car-outline" as const, tone: "negative" as const };
    default:
      return { title: "Credit activity", sign: "", icon: "wallet-outline" as const, tone: "neutral" as const };
  }
}

export function formatCreditDate(value: string, includeTime = false) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

export default function CreditTransactionRow({
  transaction,
  onPress,
}: {
  transaction: PickuCreditTransaction;
  onPress: () => void;
}) {
  const view = getCreditPresentation(transaction);
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`${view.title}, ${view.sign}${formatLkr(transaction.amount)}, ${transaction.status}`}
    >
      <View style={[styles.icon, view.tone === "negative" && styles.negativeIcon]}>
        <Ionicons name={view.icon} size={19} color={view.tone === "negative" ? "#B45309" : "#067A50"} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{view.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>{formatCreditDate(transaction.createdAt)} · {transaction.status.toLowerCase()}</Text>
      </View>
      <View style={styles.amountWrap}>
        <Text style={[styles.amount, view.tone === "negative" && styles.negative]}>{view.sign}{formatLkr(transaction.amount)}</Text>
        <Ionicons name="chevron-forward" size={16} color="#94A39E" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 76, flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#DCE9E4" },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#E4F8EF", marginRight: 12 },
  negativeIcon: { backgroundColor: "#FFF5E5" },
  copy: { flex: 1, minWidth: 0 },
  title: { color: "#18231F", fontSize: 14, fontWeight: "800" },
  meta: { color: "#71817B", fontSize: 11, marginTop: 4, textTransform: "capitalize" },
  amountWrap: { marginLeft: 10, flexDirection: "row", alignItems: "center", gap: 5 },
  amount: { color: "#067A50", fontSize: 13, fontWeight: "900" },
  negative: { color: "#9A5B06" },
});
