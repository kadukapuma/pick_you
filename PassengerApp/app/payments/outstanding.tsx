import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import PaymentScreen, { PaymentButton, PaymentCard } from "../../features/payments/PaymentScreen";
import { StatusOrb } from "../../features/payments/PaymentVisuals";
import { formatLkr, paymentTheme } from "../../features/payments/paymentTheme";
import { CARD_PAYMENTS_ENABLED, paymentService } from "../../services/payments/paymentService";
import type { OutstandingPayment } from "../../services/payments/paymentTypes";

export default function OutstandingPaymentsScreen() {
  const [items, setItems] = useState<OutstandingPayment[] | null>(null);

  useEffect(() => {
    paymentService.listOutstandingPayments().then(setItems);
  }, []);

  return (
    <PaymentScreen title="Outstanding payments" subtitle="Resolve previous ride payments securely">
      {items === null ? (
        <PaymentCard style={styles.loading}><ActivityIndicator color={paymentTheme.green} /></PaymentCard>
      ) : items.length === 0 ? (
        <>
          <View style={styles.hero}>
            <StatusOrb kind="success" />
            <Text style={styles.title}>You&apos;re all clear</Text>
            <Text style={styles.text}>There are no outstanding ride payments on your account.</Text>
          </View>
          <PaymentCard style={styles.clearCard}>
            <Ionicons name="shield-checkmark-outline" size={24} color={paymentTheme.green} />
            <Text style={styles.clearText}>Your payment account is in good standing.</Text>
          </PaymentCard>
        </>
      ) : (
        items.map((item) => (
          <PaymentCard key={item.rideId}>
            <View style={styles.topRow}>
              <View>
                <Text style={styles.rideCode}>Ride #{item.rideCode}</Text>
                <Text style={styles.date}>{item.createdAtLabel}</Text>
              </View>
              <Text style={styles.amount}>{formatLkr(item.amount)}</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.reason}>{item.reason}</Text>
            <View style={styles.action}>
              <PaymentButton
                label={CARD_PAYMENTS_ENABLED ? "Pay now" : "Card payments unavailable"}
                icon="lock-closed-outline"
                onPress={() => router.push({ pathname: "/payments/processing", params: { rideId: item.rideId, amount: String(item.amount) } })}
                disabled={!CARD_PAYMENTS_ENABLED}
              />
            </View>
          </PaymentCard>
        ))
      )}
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  loading: { minHeight: 180, justifyContent: "center" },
  hero: { alignItems: "center", paddingVertical: 34 },
  title: { color: paymentTheme.ink, fontSize: 23, fontWeight: "900", marginTop: 18 },
  text: { color: paymentTheme.muted, fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 7 },
  clearCard: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  clearText: { color: paymentTheme.deepGreen, fontSize: 13, fontWeight: "800" },
  topRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  rideCode: { color: paymentTheme.ink, fontSize: 15, fontWeight: "900" },
  date: { color: paymentTheme.muted, fontSize: 12, marginTop: 3 },
  amount: { color: paymentTheme.danger, fontSize: 17, fontWeight: "900" },
  divider: { height: 1, backgroundColor: paymentTheme.line, marginVertical: 14 },
  reason: { color: paymentTheme.muted, fontSize: 13, lineHeight: 19 },
  action: { marginTop: 16 },
});

