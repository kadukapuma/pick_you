import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import type { SavedCard } from "../../services/payments/paymentTypes";
import { paymentTheme } from "./paymentTheme";

export function SecureNotice() {
  return (
    <View style={styles.notice}>
      <View style={styles.noticeIcon}>
        <Ionicons name="shield-checkmark" size={20} color={paymentTheme.green} />
      </View>
      <View style={styles.noticeCopy}>
        <Text style={styles.noticeTitle}>Secure bank-hosted payment</Text>
        <Text style={styles.noticeText}>
          PickU will not receive or store your full card number, CVV or bank OTP.
        </Text>
      </View>
    </View>
  );
}

export function CardVisual({ card }: { card: SavedCard }) {
  return (
    <View style={styles.cardVisual}>
      <View style={styles.cardTop}>
        <View style={styles.chip} />
        <Ionicons name="wifi-outline" size={23} color="rgba(255,255,255,0.8)" />
      </View>
      <Text style={styles.cardDigits}>••••  ••••  ••••  {card.last4}</Text>
      <View style={styles.cardBottom}>
        <View>
          <Text style={styles.cardMeta}>EXPIRES</Text>
          <Text style={styles.cardValue}>{card.expiryLabel}</Text>
        </View>
        <Text style={styles.brand}>{card.brand.toUpperCase()}</Text>
      </View>
    </View>
  );
}

export function StatusOrb({
  kind,
}: {
  kind: "success" | "failed" | "processing" | "warning";
}) {
  const config = {
    success: { icon: "checkmark" as const, color: paymentTheme.green, bg: "#D1FAE5" },
    failed: { icon: "close" as const, color: paymentTheme.danger, bg: "#FEE2E2" },
    processing: { icon: "hourglass-outline" as const, color: "#2563EB", bg: "#DBEAFE" },
    warning: { icon: "alert" as const, color: paymentTheme.warning, bg: "#FEF3C7" },
  }[kind];

  return (
    <View style={[styles.orbOuter, { backgroundColor: config.bg }]}>
      <View style={[styles.orbInner, { backgroundColor: config.color }]}>
        <Ionicons name={config.icon} size={34} color={paymentTheme.white} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: paymentTheme.mint,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  noticeIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: paymentTheme.white,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: paymentTheme.deepGreen, fontSize: 14, fontWeight: "900" },
  noticeText: { color: "#3F6659", fontSize: 12, lineHeight: 18, marginTop: 3 },
  cardVisual: {
    minHeight: 196,
    borderRadius: 24,
    padding: 22,
    backgroundColor: paymentTheme.deepGreen,
    justifyContent: "space-between",
    shadowColor: paymentTheme.deepGreen,
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 6,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chip: { width: 42, height: 31, borderRadius: 8, backgroundColor: "#D8BC70" },
  cardDigits: { color: paymentTheme.white, fontSize: 20, fontWeight: "800", letterSpacing: 1.5 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  cardMeta: { color: "rgba(255,255,255,0.58)", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  cardValue: { color: paymentTheme.white, fontSize: 14, fontWeight: "800", marginTop: 2 },
  brand: { color: paymentTheme.white, fontSize: 20, fontStyle: "italic", fontWeight: "900" },
  orbOuter: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  orbInner: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
  },
});

