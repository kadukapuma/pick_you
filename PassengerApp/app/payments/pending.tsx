import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import PaymentScreen, { PaymentButton, PaymentCard } from "../../features/payments/PaymentScreen";
import { StatusOrb } from "../../features/payments/PaymentVisuals";
import { formatLkr, paymentTheme } from "../../features/payments/paymentTheme";

export default function PaymentPendingScreen() {
  const { rideId = "", amount = "0" } = useLocalSearchParams<{ rideId?: string; amount?: string }>();

  return (
    <PaymentScreen title="Payment pending" canGoBack={false}>
      <View style={styles.hero}>
        <StatusOrb kind="processing" />
        <Text style={styles.title}>Still confirming payment</Text>
        <Text style={styles.amount}>{formatLkr(amount)}</Text>
        <Text style={styles.text}>The payment provider has not returned a final result yet. You will not be charged twice.</Text>
      </View>
      <PaymentCard>
        <View style={styles.detail}><Text style={styles.label}>Ride</Text><Text style={styles.value}>{rideId ? `#${rideId}` : "Current ride"}</Text></View>
        <View style={styles.divider} />
        <View style={styles.detail}><Text style={styles.label}>Status</Text><Text style={styles.pending}>Processing</Text></View>
      </PaymentCard>
      <View style={styles.note}><Ionicons name="notifications-outline" size={18} color={paymentTheme.green} /><Text style={styles.noteText}>PickU will update the receipt after backend reconciliation.</Text></View>
      <PaymentButton label="Check again" icon="refresh-outline" onPress={() => router.replace({ pathname: "/payments/processing", params: { rideId, amount } })} />
      <PaymentButton label="Return to trips" icon="car-outline" variant="secondary" onPress={() => router.replace("/(app)/(tabs)/trips")} />
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingVertical: 30 },
  title: { color: paymentTheme.ink, fontSize: 22, fontWeight: "900", textAlign: "center", marginTop: 18 },
  amount: { color: paymentTheme.green, fontSize: 27, fontWeight: "900", marginTop: 8 },
  text: { color: paymentTheme.muted, fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 8, paddingHorizontal: 12 },
  detail: { flexDirection: "row", justifyContent: "space-between", gap: 14 },
  label: { color: paymentTheme.muted, fontSize: 13, fontWeight: "700" },
  value: { color: paymentTheme.ink, fontSize: 13, fontWeight: "900" },
  pending: { color: "#2563EB", fontSize: 13, fontWeight: "900" },
  divider: { height: 1, backgroundColor: paymentTheme.line, marginVertical: 14 },
  note: { flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 16, padding: 14, backgroundColor: paymentTheme.mint },
  noteText: { flex: 1, color: "#3F6659", fontSize: 12, lineHeight: 18 },
});
