import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { CARD_PAYMENTS_ENABLED, paymentService } from "../../services/payments/paymentService";
import PaymentScreen, { PaymentCard } from "../../features/payments/PaymentScreen";
import { formatLkr, paymentTheme } from "../../features/payments/paymentTheme";

export default function PaymentProcessingScreen() {
  const { rideId = "", amount = "0", preview, documentPreview } = useLocalSearchParams<{
    rideId?: string;
    amount?: string;
    preview?: string;
    documentPreview?: string;
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
    const timer = documentPreview
      ? undefined
      : preview
      ? setTimeout(() => {
          router.replace({ pathname: "/payments/success", params: { rideId, amount } });
        }, 2200)
      : setTimeout(async () => {
          const result = await paymentService.beginRidePayment(rideId, Number(amount || 0));
          if (cancelled) return;
          if (result.status === "completed") {
            router.replace({ pathname: "/payments/success", params: { rideId, amount, reference: result.reference || "" } });
            return;
          }
          if (result.status === "processing") {
            router.replace({ pathname: "/payments/pending", params: { rideId, amount } });
            return;
          }
          if (result.status === "failed" || result.status === "requires_action") {
            router.replace({ pathname: "/payments/failed", params: { rideId, amount, message: result.message || "Payment needs your attention." } });
          }
        }, 900);

    return () => {
      cancelled = true;
      animation.stop();
      if (timer) clearTimeout(timer);
    };
  }, [amount, documentPreview, preview, rideId, spin]);

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
        <View style={styles.row}><Text style={styles.label}>Payment method</Text><Text style={styles.value}>Visa •••• 6492</Text></View>
        <View style={styles.divider} />
        <View style={styles.row}><Text style={styles.label}>Ride reference</Text><Text style={styles.value}>{rideId || "Pending"}</Text></View>
      </PaymentCard>
      <View style={styles.tip}>
        <Text style={styles.tipText}>
          {CARD_PAYMENTS_ENABLED
            ? "You can leave this screen safely. Payment status will continue to update securely."
            : "This is a sandbox UI preview. No real payment is being processed."}
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

