import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import PaymentScreen, {
  PaymentButton,
  PaymentCard,
} from "../../features/payments/PaymentScreen";
import { StatusOrb } from "../../features/payments/PaymentVisuals";
import { formatLkr, paymentTheme } from "../../features/payments/paymentTheme";

export default function PaymentFailedScreen() {
  const { rideId = "", amount = "0", message } = useLocalSearchParams<{
    rideId?: string;
    amount?: string;
    message?: string;
  }>();
  const params = { rideId, amount };

  return (
    <PaymentScreen title="Payment required" canGoBack={false}>
      <View style={styles.hero}>
        <StatusOrb kind="failed" />
        <Text style={styles.title}>We couldn&apos;t process your card</Text>
        <Text style={styles.amount}>{formatLkr(amount)}</Text>
        <Text style={styles.text}>{message || "Your ride is complete, but the payment still needs attention."}</Text>
      </View>
      <PaymentCard>
        <View style={styles.infoRow}>
          <View style={styles.infoDot} />
          <Text style={styles.infoText}>Your completed ride has not been cancelled.</Text>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoDot} />
          <Text style={styles.infoText}>You will not be charged twice for a confirmed payment.</Text>
        </View>
      </PaymentCard>
      <PaymentButton label="Retry this card" icon="refresh-outline" onPress={() => router.replace({ pathname: "/payments/processing", params: params })} />
      <PaymentButton label="Use another card" icon="card-outline" variant="secondary" onPress={() => router.push({ pathname: "/payments/cards", params: { mode: "retry", ...params } })} />
      <PaymentButton label="View other payment options" icon="wallet-outline" variant="secondary" onPress={() => router.push({ pathname: "/ride-booking/payment-method", params })} />
      <Text style={styles.support}>Need help? Open the ride receipt and choose “Help with this ride.”</Text>
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingVertical: 27 },
  title: { color: paymentTheme.ink, fontSize: 22, fontWeight: "900", textAlign: "center", marginTop: 18 },
  amount: { color: paymentTheme.danger, fontSize: 27, fontWeight: "900", marginTop: 8 },
  text: { color: paymentTheme.muted, fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 8, paddingHorizontal: 12 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 5 },
  infoDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: paymentTheme.green, marginTop: 6 },
  infoText: { flex: 1, color: paymentTheme.muted, fontSize: 12, lineHeight: 18 },
  support: { color: paymentTheme.muted, fontSize: 12, lineHeight: 18, textAlign: "center", paddingHorizontal: 14 },
});

