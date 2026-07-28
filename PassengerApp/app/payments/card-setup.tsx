import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import PaymentScreen, { PaymentButton, PaymentCard } from "../../features/payments/PaymentScreen";
import { paymentTheme } from "../../features/payments/paymentTheme";
import { paymentService } from "../../services/payments/paymentService";

export default function CardSetupScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [opening, setOpening] = useState(false);

  const continueSecurely = async () => {
    setOpening(true);
    try {
      await paymentService.beginSecureCardSetup();
      Alert.alert(
        "Secure setup preview",
        "The payment provider's secure card form will open here after the backend creates a sandbox session.",
        [
          { text: "Complete", onPress: () => router.replace({ pathname: "/payments/card-setup-complete", params: { mode } }) },
          { text: "Cancel", onPress: () => router.replace({ pathname: "/payments/card-setup-status", params: { status: "cancelled", mode } }) },
          { text: "Timeout", onPress: () => router.replace({ pathname: "/payments/card-setup-status", params: { status: "timeout", mode } }) },
        ],
      );
    } finally {
      setOpening(false);
    }
  };

  return (
    <PaymentScreen
      title="Add new card"
      subtitle="Secure bank setup"
      footer={<PaymentButton label={opening ? "Opening secure payment…" : "Continue to secure payment"} icon="lock-closed-outline" onPress={continueSecurely} disabled={opening} />}
    >
      <View style={styles.previewBanner}>
        <Ionicons name="flask-outline" size={18} color="#8A5A00" />
        <View style={styles.previewCopy}>
          <Text style={styles.previewTitle}>Sandbox preview</Text>
          <Text style={styles.previewText}>No real card will be saved or charged.</Text>
        </View>
      </View>
      <View style={styles.cardPreview}>
        <View style={styles.cardTop}>
          <View style={styles.chip}><View style={styles.chipLine} /></View>
          <Ionicons name="wifi-outline" size={23} color="rgba(255,255,255,0.82)" />
        </View>
        <Text style={styles.cardNumber}>••••  ••••  ••••  ••••</Text>
        <View style={styles.cardBottom}>
          <View><Text style={styles.metaLabel}>CARD HOLDER</Text><Text style={styles.metaValue}>YOUR NAME</Text></View>
          <View style={styles.brandPair}><View style={[styles.circle, { backgroundColor: "#EB001B" }]} /><View style={[styles.circle, styles.circleTwo, { backgroundColor: "#F79E1B" }]} /></View>
        </View>
      </View>

      <PaymentCard style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}><Ionicons name="open-outline" size={19} color={paymentTheme.green} /></View>
          <View style={styles.infoCopy}><Text style={styles.infoTitle}>Enter card securely</Text><Text style={styles.infoText}>On the bank-hosted form</Text></View>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}><Ionicons name="shield-checkmark-outline" size={19} color={paymentTheme.green} /></View>
          <View style={styles.infoCopy}><Text style={styles.infoTitle}>Verify with your bank</Text><Text style={styles.infoText}>3D Secure or OTP when required</Text></View>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}><Ionicons name="return-down-back-outline" size={19} color={paymentTheme.green} /></View>
          <View style={styles.infoCopy}><Text style={styles.infoTitle}>Return to PickU</Text><Text style={styles.infoText}>Only masked card details return</Text></View>
        </View>
      </PaymentCard>

      <View style={styles.secureNote}>
        <Ionicons name="lock-closed" size={16} color={paymentTheme.green} />
        <Text style={styles.secureText}>PickU does not store your card number, CVV or bank OTP.</Text>
      </View>
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  previewBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#FFF8E6", borderWidth: 1, borderColor: "#F4D58D" },
  previewCopy: { flex: 1 },
  previewTitle: { color: "#6B4600", fontSize: 12, fontWeight: "900" },
  previewText: { color: "#8A681F", fontSize: 11, lineHeight: 16, marginTop: 2 },
  cardPreview: { minHeight: 190, borderRadius: 24, padding: 22, backgroundColor: paymentTheme.deepGreen, justifyContent: "space-between", shadowColor: paymentTheme.deepGreen, shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chip: { width: 42, height: 31, borderRadius: 8, backgroundColor: "#D8BC70", justifyContent: "center" },
  chipLine: { height: 1, backgroundColor: "rgba(70,52,10,0.32)" },
  cardNumber: { color: paymentTheme.white, fontSize: 20, fontWeight: "800", letterSpacing: 1.7 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  metaLabel: { color: "rgba(255,255,255,0.5)", fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  metaValue: { color: paymentTheme.white, fontSize: 12, fontWeight: "800", marginTop: 3 },
  brandPair: { flexDirection: "row" },
  circle: { width: 25, height: 25, borderRadius: 13 },
  circleTwo: { marginLeft: -8, opacity: 0.92 },
  infoCard: { paddingVertical: 9 },
  infoRow: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  infoIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: paymentTheme.mint, alignItems: "center", justifyContent: "center" },
  infoCopy: { flex: 1 },
  infoTitle: { color: paymentTheme.ink, fontSize: 13, fontWeight: "900" },
  infoText: { color: paymentTheme.muted, fontSize: 11, marginTop: 3 },
  divider: { height: 1, backgroundColor: "#EEF2F7", marginLeft: 52 },
  secureNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 12 },
  secureText: { color: paymentTheme.muted, fontSize: 11, lineHeight: 16, flex: 1 },
});
