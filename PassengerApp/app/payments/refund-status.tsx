import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import PaymentScreen, { PaymentCard } from "../../features/payments/PaymentScreen";
import { StatusOrb } from "../../features/payments/PaymentVisuals";
import { formatLkr, paymentTheme } from "../../features/payments/paymentTheme";

export default function RefundStatusScreen() {
  const { amount = "0", rideCode = "", status = "processing" } = useLocalSearchParams<{
    amount?: string;
    rideCode?: string;
    status?: string;
  }>();
  const complete = status.toLowerCase() === "refunded";

  return (
    <PaymentScreen title="Refund status">
      <View style={styles.hero}>
        <StatusOrb kind={complete ? "success" : "processing"} />
        <Text style={styles.title}>{complete ? "Refund processed" : "Refund in progress"}</Text>
        <Text style={styles.amount}>{formatLkr(amount)}</Text>
        <Text style={styles.text}>
          {complete ? "The payment provider has confirmed your refund." : "We will update this page when the payment provider confirms the refund."}
        </Text>
      </View>
      <PaymentCard>
        <Row label="Original ride" value={rideCode ? `#${rideCode}` : "Ride"} />
        <View style={styles.divider} />
        <Row label="Refund method" value="Original card" />
        <View style={styles.divider} />
        <Row label="Status" value={complete ? "Refunded" : "Processing"} highlight />
      </PaymentCard>
    </PaymentScreen>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={[styles.value, highlight && styles.highlight]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingVertical: 32 },
  title: { color: paymentTheme.ink, fontSize: 22, fontWeight: "900", marginTop: 18 },
  amount: { color: paymentTheme.green, fontSize: 28, fontWeight: "900", marginTop: 8 },
  text: { color: paymentTheme.muted, fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 8, paddingHorizontal: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 14 },
  label: { color: paymentTheme.muted, fontSize: 13, fontWeight: "700" },
  value: { color: paymentTheme.ink, fontSize: 13, fontWeight: "900" },
  highlight: { color: paymentTheme.green },
  divider: { height: 1, backgroundColor: paymentTheme.line, marginVertical: 14 },
});

