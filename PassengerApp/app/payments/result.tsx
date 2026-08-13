import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import PaymentScreen from "../../features/payments/PaymentScreen";
import { paymentTheme } from "../../features/payments/paymentTheme";
import { paymentService } from "../../services/payments/paymentService";

export default function WebxpayResultScreen() {
  const { ride_id: rideId = "" } = useLocalSearchParams<{
    ride_id?: string;
    payment_id?: string;
    status?: string;
  }>();

  useEffect(() => {
    let cancelled = false;

    async function confirmTrustedResult() {
      if (!rideId) {
        router.replace({
          pathname: "/payments/failed",
          params: {
            message: "The payment result did not include a ride reference.",
          },
        });
        return;
      }

      const result = await paymentService.getPaymentResult(rideId);

      if (cancelled) {
        return;
      }

      if (result.status === "completed") {
        router.replace({
          pathname: "/ride-tracking",
          params: {
            rideData: JSON.stringify({
              id: Number(rideId),
              status: "COMPLETED",
              payment: {
                payment_status: "COMPLETED",
                gateway_reference: result.reference,
              },
              selected_payment_method: "card",
            }),
          },
        });
        return;
      }

      if (result.status === "failed") {
        router.replace({
          pathname: "/payments/failed",
          params: {
            rideId,
            message:
              result.message || "WEBXPAY could not complete this payment.",
          },
        });
        return;
      }

      router.replace({
        pathname: "/payments/pending",
        params: {
          rideId,
        },
      });
    }

    void confirmTrustedResult();

    return () => {
      cancelled = true;
    };
  }, [rideId]);

  return (
    <PaymentScreen title="Confirming payment" canGoBack={false}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={paymentTheme.green} />

        <Text style={styles.title}>Checking your payment</Text>

        <Text style={styles.message}>
          PickU is securely confirming the result with the backend.
        </Text>
      </View>
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 80,
  },
  title: {
    color: paymentTheme.ink,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 24,
    textAlign: "center",
  },
  message: {
    color: paymentTheme.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    textAlign: "center",
  },
});
