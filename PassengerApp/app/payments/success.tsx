import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import PaymentScreen, {
  PaymentButton,
  PaymentCard,
} from "../../features/payments/PaymentScreen";
import { StatusOrb } from "../../features/payments/PaymentVisuals";
import { formatLkr, paymentTheme } from "../../features/payments/paymentTheme";

export default function PaymentSuccessScreen() {
  const { rideId = "", amount = "0", reference = "" } = useLocalSearchParams<{
    rideId?: string;
    amount?: string;
    reference?: string;
  }>();

  return (
    <PaymentScreen
      title="Payment complete"
      canGoBack={false}
      footer={
        <PaymentButton
          label="View receipt"
          icon="receipt-outline"
          onPress={() =>
            router.replace({
              pathname: "/ride-details/receipt",
              params: {
                rideData: JSON.stringify({
                  id: rideId,
                  final_fare: Number(amount),
                  payment: { payment_method: "Card", payment_status: "Completed" },
                }),
              },
            })
          }
        />
      }
    >
      <View style={styles.hero}>
        <StatusOrb kind="success" />
        <Text style={styles.title}>Payment successful</Text>
        <Text style={styles.amount}>{formatLkr(amount)}</Text>
        <Text style={styles.text}>Your ride payment has been securely confirmed.</Text>
      </View>
      <PaymentCard>
        <Detail label="Payment method" value="Visa •••• 6492" />
        <Divider />
        <Detail label="Ride" value={rideId ? `#${rideId}` : "Current ride"} />
        {reference ? <><Divider /><Detail label="Reference" value={reference} /></> : null}
        <Divider />
        <Detail label="Status" value="Paid" success />
      </PaymentCard>
    </PaymentScreen>
  );
}

function Detail({ label, value, success }: { label: string; value: string; success?: boolean }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={[styles.value, success && styles.success]}>{value}</Text></View>;
}
function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingVertical: 30 },
  title: { color: paymentTheme.ink, fontSize: 23, fontWeight: "900", marginTop: 18 },
  amount: { color: paymentTheme.green, fontSize: 29, fontWeight: "900", marginTop: 8 },
  text: { color: paymentTheme.muted, fontSize: 13, marginTop: 8, textAlign: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 15 },
  label: { color: paymentTheme.muted, fontSize: 13, fontWeight: "700" },
  value: { color: paymentTheme.ink, fontSize: 13, fontWeight: "900" },
  success: { color: paymentTheme.green },
  divider: { height: 1, backgroundColor: paymentTheme.line, marginVertical: 14 },
});

