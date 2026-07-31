import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { paymentService } from "../../services/payments/paymentService";
import PaymentScreen, { PaymentCard } from "../../features/payments/PaymentScreen";
import { formatLkr, paymentTheme } from "../../features/payments/paymentTheme";

export default function PaymentProcessingScreen() {
  const { rideId = "", amount = "0", preview } = useLocalSearchParams<{
    rideId?: string;
    amount?: string;
    preview?: string;
  }>();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1050,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();

    let cancelled = false;
    const timer = preview
      ? setTimeout(() => {
          router.replace({ pathname: "/payments/success", params: { rideId, amount } });
        }, 2200)
      : setTimeout(async () => {
          const result = await paymentService.beginRidePayment(rideId, Number(amount || 0));
          if (cancelled) return;
          if (result.status === "completed") {
            // Back into ride-tracking, not a dead-end success screen: that is
            // the only place the rating prompt lives, and cash rides already
            // land there the moment payment completes. Routing card payments
            // anywhere else means the driver never gets rated after a card ride.
            router.replace({
              pathname: "/ride-tracking",
              params: {
                rideData: JSON.stringify({
                  id: Number(rideId),
                  status: "COMPLETED",
                  final_fare: Number(amount),
                  payment: { payment_status: "COMPLETED", gateway_reference: result.reference },
                  selected_payment_method: "card",
                }),
              },
            });
            return;
          }
          if (result.status === "failed" || result.status === "requires_action") {
            router.replace({ pathname: "/payments/failed", params: { rideId, amount, message: result.message || "Payment needs your attention." } });
          }
        }, 900);

    return () => {
      animation.stop();
      if (timer) clearTimeout(timer);
    };
  }, [amount, preview, rideId, spin]);

  return (
    <PaymentScreen title="Confirming payment" canGoBack={false}>
      <View style={styles.hero}>
        <View style={styles.loaderShell}>
          <Animated.View
            style={[
              styles.loader,
              {
                transform: [
                  {
                    rotate: spin.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              },
            ]}
          />
          <View style={styles.loaderCenter} />
        </View>
        <Text style={styles.amount}>{formatLkr(amount)}</Text>
        <Text style={styles.title}>Securely processing your payment</Text>
        <Text style={styles.text}>
          This may take a few moments. We will safely confirm the final result with the payment provider.
        </Text>
      </View>
      <PaymentCard>
        <View style={styles.row}><Text style={styles.label}>Payment method</Text><Text style={styles.value}>Visa •••• 4242</Text></View>
        <View style={styles.divider} />
        <View style={styles.row}><Text style={styles.label}>Ride reference</Text><Text style={styles.value}>{rideId || "Pending"}</Text></View>
      </PaymentCard>
      <View style={styles.tip}>
        <Text style={styles.tipText}>
          You can leave this screen safely. Payment status will continue to update from the backend.
        </Text>
      </View>
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingTop: 30, paddingBottom: 20 },
  loaderShell: { width: 108, height: 108, alignItems: "center", justifyContent: "center" },
  loader: { position: "absolute", width: 100, height: 100, borderRadius: 50, borderWidth: 7, borderColor: "#D7EEE5", borderTopColor: paymentTheme.green },
  loaderCenter: { width: 62, height: 62, borderRadius: 31, backgroundColor: paymentTheme.mint },
  amount: { color: paymentTheme.green, fontSize: 27, fontWeight: "900", marginTop: 20 },
  title: { color: paymentTheme.ink, fontSize: 20, fontWeight: "900", textAlign: "center", marginTop: 12 },
  text: { color: paymentTheme.muted, fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 7, paddingHorizontal: 18 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 14 },
  label: { color: paymentTheme.muted, fontSize: 13, fontWeight: "700" },
  value: { color: paymentTheme.ink, fontSize: 13, fontWeight: "900" },
  divider: { height: 1, backgroundColor: paymentTheme.line, marginVertical: 14 },
  tip: { borderRadius: 16, padding: 14, backgroundColor: "#EFF6FF" },
  tipText: { color: "#315679", fontSize: 12, lineHeight: 18, textAlign: "center" },
});

