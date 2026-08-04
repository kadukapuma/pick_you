import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ActivityIndicator, StyleSheet, Text, View } from "react-native";
import PaymentScreen, { PaymentButton, PaymentCard } from "../../features/payments/PaymentScreen";
import { paymentTheme } from "../../features/payments/paymentTheme";
import { CARD_PAYMENTS_ENABLED, paymentService } from "../../services/payments/paymentService";
import type { SavedCard } from "../../services/payments/paymentTypes";

export default function CardDetailsScreen() {
  const { cardId = "" } = useLocalSearchParams<{ cardId?: string }>();
  const [card, setCard] = useState<SavedCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    paymentService.getCard(cardId).then((result) => {
      setCard(result);
      setIsDefault(Boolean(result?.isDefault));
      setLoading(false);
    });
  }, [cardId]);

  const setDefault = async () => {
    if (!card || busy) return;
    setBusy(true);
    await paymentService.setDefaultCard(card.id);
    setIsDefault(true);
    setBusy(false);
  };

  const confirmRemove = () => {
    if (!card || busy) return;
    Alert.alert("Remove card?", `Remove ${card.brand.toUpperCase()} •••• ${card.last4} from PickU?`, [
      { text: "Keep card", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          await paymentService.removeCard(card.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <PaymentScreen title="Card details" subtitle="Manage saved card">
      {loading ? (
        <PaymentCard style={styles.loading}><ActivityIndicator color={paymentTheme.green} /></PaymentCard>
      ) : !card ? (
        <PaymentCard style={styles.loading}><Text style={styles.muted}>Card is unavailable.</Text></PaymentCard>
      ) : (
        <>
          {!CARD_PAYMENTS_ENABLED ? (
            <View style={styles.previewBanner}>
              <Ionicons name="flask-outline" size={18} color="#8A5A00" />
              <View style={styles.previewCopy}>
                <Text style={styles.previewTitle}>Test card details</Text>
                <Text style={styles.previewText}>Changes are disabled until sandbox card management is connected.</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.chip} />
              <Text style={styles.brand}>{card.brand.toUpperCase()}</Text>
            </View>
            <Text style={styles.number}>••••  ••••  ••••  {card.last4}</Text>
            <View style={styles.cardBottom}>
              <View><Text style={styles.meta}>EXPIRES</Text><Text style={styles.metaValue}>{card.expiryLabel}</Text></View>
              {isDefault ? <View style={styles.defaultPill}><Text style={styles.defaultText}>DEFAULT</Text></View> : null}
            </View>
          </View>
          <PaymentCard>
            <View style={styles.statusRow}>
              <View style={styles.statusIcon}><Ionicons name="shield-checkmark-outline" size={21} color={paymentTheme.green} /></View>
              <View style={styles.statusCopy}><Text style={styles.statusTitle}>Secure payment reference</Text><Text style={styles.muted}>Only masked card details are stored in PickU.</Text></View>
            </View>
          </PaymentCard>
          {!isDefault ? <PaymentButton label="Set as default" icon="star-outline" onPress={setDefault} disabled={busy || !CARD_PAYMENTS_ENABLED} /> : null}
          <PaymentButton label="Remove card" icon="trash-outline" variant="danger" onPress={confirmRemove} disabled={busy || !CARD_PAYMENTS_ENABLED} />
        </>
      )}
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  previewBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#FFF8E6", borderWidth: 1, borderColor: "#F4D58D" },
  previewCopy: { flex: 1 },
  previewTitle: { color: "#6B4600", fontSize: 12, fontWeight: "900" },
  previewText: { color: "#8A681F", fontSize: 11, lineHeight: 16, marginTop: 2 },
  loading: { minHeight: 180, alignItems: "center", justifyContent: "center" },
  muted: { color: paymentTheme.muted, fontSize: 12, lineHeight: 18 },
  card: { minHeight: 190, borderRadius: 24, padding: 22, justifyContent: "space-between", backgroundColor: paymentTheme.deepGreen },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chip: { width: 42, height: 31, borderRadius: 8, backgroundColor: "#D8BC70" },
  brand: { color: paymentTheme.white, fontSize: 18, fontWeight: "900", fontStyle: "italic" },
  number: { color: paymentTheme.white, fontSize: 20, fontWeight: "800", letterSpacing: 1.5 },
  cardBottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  meta: { color: "rgba(255,255,255,0.5)", fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  metaValue: { color: paymentTheme.white, fontSize: 13, fontWeight: "800", marginTop: 3 },
  defaultPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: "rgba(255,255,255,0.14)" },
  defaultText: { color: paymentTheme.white, fontSize: 9, fontWeight: "900" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  statusIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: paymentTheme.mint, alignItems: "center", justifyContent: "center" },
  statusCopy: { flex: 1 },
  statusTitle: { color: paymentTheme.ink, fontSize: 13, fontWeight: "900", marginBottom: 2 },
});
