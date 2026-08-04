import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import PaymentScreen, { PaymentButton, PaymentCard } from "../../features/payments/PaymentScreen";
import { StatusOrb } from "../../features/payments/PaymentVisuals";
import { paymentTheme } from "../../features/payments/paymentTheme";

export default function CardSetupStatusScreen() {
  const { status = "cancelled", mode } = useLocalSearchParams<{ status?: string; mode?: string }>();
  const timedOut = status === "timeout";

  return (
    <PaymentScreen title={timedOut ? "Setup timed out" : "Setup cancelled"} canGoBack={false}>
      <View style={styles.hero}>
        <StatusOrb kind="warning" />
        <Text style={styles.title}>{timedOut ? "Your secure session expired" : "No card was added"}</Text>
        <Text style={styles.text}>{timedOut ? "For your security, card setup sessions are available for a limited time." : "You left the secure bank setup before it was completed."}</Text>
      </View>
      <PaymentCard>
        <View style={styles.row}><Ionicons name="shield-checkmark-outline" size={20} color={paymentTheme.green} /><Text style={styles.rowText}>No card details were saved or charged.</Text></View>
      </PaymentCard>
      <PaymentButton label="Try again" icon="refresh-outline" onPress={() => router.replace({ pathname: "/payments/card-setup", params: { mode } })} />
      <PaymentButton label="Choose another method" icon="arrow-back-outline" variant="secondary" onPress={() => router.replace("/ride-booking/payment-method")} />
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingVertical: 34 },
  title: { color: paymentTheme.ink, fontSize: 22, fontWeight: "900", textAlign: "center", marginTop: 18 },
  text: { color: paymentTheme.muted, fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 8, paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowText: { flex: 1, color: paymentTheme.muted, fontSize: 12, lineHeight: 18 },
});

