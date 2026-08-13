import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import PaymentScreen from "../../features/payments/PaymentScreen";
import { paymentTheme } from "../../features/payments/paymentTheme";
import { paymentService } from "../../services/payments/paymentService";

export default function WebxpayCardResultScreen() {
  const { status = "FAILED", mode } = useLocalSearchParams<{
    operation_id?: string;
    status?: string;
    mode?: string;
  }>();

  useEffect(() => {
    let active = true;

    async function confirmSavedCard() {
      if (status.toUpperCase() !== "COMPLETED") {
        router.replace({
          pathname: "/payments/card-setup-status",
          params: { status: "cancelled", mode },
        });
        return;
      }

      const cards = await paymentService.listWebxpayCards();
      if (!active) return;

      const card = cards.find((item) => item.isDefault) || cards[0];

      if (!card) {
        router.replace({
          pathname: "/payments/card-setup-status",
          params: { status: "failed", mode },
        });
        return;
      }

      router.replace({
        pathname: "/payments/card-setup-complete",
        params: {
          mode,
          provider: "webxpay",
          brand: card.brand,
          last4: card.last4,
        },
      });
    }

    void confirmSavedCard();
    return () => {
      active = false;
    };
  }, [mode, status]);

  return (
    <PaymentScreen title="Confirming card" canGoBack={false}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={paymentTheme.green} />
        <Text style={styles.title}>Checking your saved card</Text>
        <Text style={styles.text}>
          PickU is securely confirming the result with WEBXPAY.
        </Text>
      </View>
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 80 },
  title: { color: paymentTheme.ink, fontSize: 22, fontWeight: "900", marginTop: 24, textAlign: "center" },
  text: { color: paymentTheme.muted, fontSize: 13, lineHeight: 20, marginTop: 10, textAlign: "center" },
});
