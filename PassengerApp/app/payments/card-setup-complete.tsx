import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import PaymentScreen, { PaymentButton, PaymentCard } from "../../features/payments/PaymentScreen";
import { StatusOrb } from "../../features/payments/PaymentVisuals";
import { paymentTheme } from "../../features/payments/paymentTheme";
import { useRideSearch } from "../../state/booking/RideBookingContext";

export default function CardSetupCompleteScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { setPaymentMethod } = useRideSearch();

  const done = () => {
    setPaymentMethod("card");
    if (mode === "booking") router.replace("/ride-booking/payment-method");
    else router.replace("/payments/cards");
  };

  return (
    <PaymentScreen
      title="Card ready"
      canGoBack={false}
      footer={<PaymentButton label={mode === "booking" ? "Use for this ride" : "Done"} icon="checkmark" onPress={done} />}
    >
      <View style={styles.hero}>
        <StatusOrb kind="success" />
        <Text style={styles.title}>Secure setup complete</Text>
        <Text style={styles.text}>Your card is ready for supported PickU payments.</Text>
      </View>
      <PaymentCard>
        <View style={styles.row}><Text style={styles.label}>Card</Text><Text style={styles.value}>Visa •••• 4242</Text></View>
        <View style={styles.divider} />
        <View style={styles.row}><Text style={styles.label}>Status</Text><Text style={styles.success}>Ready</Text></View>
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

