import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import PaymentScreen, { PaymentButton, PaymentCard } from "../../features/payments/PaymentScreen";
import { StatusOrb } from "../../features/payments/PaymentVisuals";
import { paymentTheme } from "../../features/payments/paymentTheme";

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  unknown: "Card",
};

export default function CardSetupCompleteScreen() {
  const { mode, provider, brand, last4 } = useLocalSearchParams<{
    mode?: string;
    provider?: string;
    brand?: string;
    last4?: string;
  }>();
  const cardWasSaved = provider === "webxpay";

  const done = () => {
    if (mode === "booking") {
      router.replace({
        pathname: "/payments/cards",
        params: { mode: "booking" },
      });
      return;
    }

    router.replace("/payments/cards");
  };

  const cardLabel = last4
    ? `${BRAND_LABELS[brand || "unknown"]} •••• ${last4}`
    : "Card saved";

  return (
    <PaymentScreen
      title={cardWasSaved ? "Card ready" : "Preview complete"}
      canGoBack={false}
      footer={<PaymentButton label={mode === "booking" ? "Choose card for this ride" : "Return to cards"} icon={cardWasSaved ? "checkmark" : "arrow-back-outline"} onPress={done} />}
    >
      <View style={styles.hero}>
        <StatusOrb kind="success" />
        <Text style={styles.title}>{cardWasSaved ? "Secure setup complete" : "Preview complete"}</Text>
        <Text style={styles.text}>{cardWasSaved ? "Your card was securely tokenized, saved, and is ready to use for PickU rides." : "The card setup was not completed."}</Text>
      </View>
      <PaymentCard>
        <View style={styles.row}><Text style={styles.label}>Card</Text><Text style={styles.value}>{cardLabel}</Text></View>
        <View style={styles.divider} />
        <View style={styles.row}><Text style={styles.label}>Status</Text><Text style={styles.success}>{cardWasSaved ? "Saved" : "Test data"}</Text></View>
      </PaymentCard>
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingVertical: 34 },
  title: { color: paymentTheme.ink, fontSize: 23, fontWeight: "900", marginTop: 18 },
  text: { color: paymentTheme.muted, fontSize: 13, marginTop: 7, textAlign: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  label: { color: paymentTheme.muted, fontSize: 13, fontWeight: "700" },
  value: { color: paymentTheme.ink, fontSize: 14, fontWeight: "900" },
  success: { color: paymentTheme.green, fontSize: 14, fontWeight: "900" },
  divider: { height: 1, backgroundColor: paymentTheme.line, marginVertical: 14 },
});

