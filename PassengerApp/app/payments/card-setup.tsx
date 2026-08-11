import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import PaymentScreen, {
  PaymentButton,
  PaymentCard,
} from "../../features/payments/PaymentScreen";
import { paymentTheme } from "../../features/payments/paymentTheme";
import { paymentService } from "../../services/payments/paymentService";

export default function CardSetupScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [opening, setOpening] = useState(false);

  const openSecureSetup = async () => {
    if (opening) return;
    setOpening(true);

    try {
      const prepared = await paymentService.prepareWebxpayCardSetup();

      if (!prepared.success || !prepared.setup) {
        Alert.alert(
          "Card setup unavailable",
          prepared.message || "Please try again shortly.",
        );
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        prepared.setup.setupUrl,
        "picku://payments/card-result",
      );

      if (result.type !== "success") {
        router.replace({
          pathname: "/payments/card-setup-status",
          params: { status: "cancelled", mode },
        });
      }
    } catch {
      Alert.alert(
        "Could not open secure setup",
        "Check your connection and try again.",
      );
    } finally {
      setOpening(false);
    }
  };

  return (
    <PaymentScreen
      title="Add a card"
      subtitle="Securely provided by WEBXPAY"
      footer={
        <PaymentButton
          label={opening ? "Opening secure setup…" : "Continue securely"}
          icon="shield-checkmark-outline"
          onPress={openSecureSetup}
          disabled={opening}
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.icon}>
          <Ionicons name="card-outline" size={34} color={paymentTheme.green} />
        </View>
        <Text style={styles.title}>Save a credit or debit card</Text>
        <Text style={styles.text}>
          You will enter your card details on the bank-hosted secure form and
          complete any required 3D Secure verification.
        </Text>
      </View>

      <PaymentCard>
        <View style={styles.row}>
          <Ionicons name="lock-closed" size={20} color={paymentTheme.green} />
          <View style={styles.copy}>
            <Text style={styles.rowTitle}>PickU never receives your CVV</Text>
            <Text style={styles.rowText}>
              Only a provider token and masked card details are saved.
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Ionicons name="checkmark-circle" size={20} color={paymentTheme.green} />
          <View style={styles.copy}>
            <Text style={styles.rowTitle}>Verified before use</Text>
            <Text style={styles.rowText}>
              WEBXPAY may ask for an OTP or authentication confirmation.
            </Text>
          </View>
        </View>
      </PaymentCard>
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingHorizontal: 18, paddingVertical: 34 },
  icon: { width: 72, height: 72, borderRadius: 24, backgroundColor: paymentTheme.mint, alignItems: "center", justifyContent: "center" },
  title: { color: paymentTheme.ink, fontSize: 22, fontWeight: "900", marginTop: 18, textAlign: "center" },
  text: { color: paymentTheme.muted, fontSize: 13, lineHeight: 20, marginTop: 8, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  copy: { flex: 1 },
  rowTitle: { color: paymentTheme.ink, fontSize: 13, fontWeight: "900" },
  rowText: { color: paymentTheme.muted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  divider: { height: 1, backgroundColor: paymentTheme.line, marginVertical: 16 },
});
