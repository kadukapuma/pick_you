import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import PaymentScreen, { PaymentButton, PaymentCard } from "../../features/payments/PaymentScreen";
import { paymentTheme } from "../../features/payments/paymentTheme";
import { paymentService } from "../../services/payments/paymentService";
import type { SavedCard } from "../../services/payments/paymentTypes";
import { useRideSearch } from "../../state/booking/RideBookingContext";

function BrandBadge({ brand }: { brand: SavedCard["brand"] }) {
  if (brand === "mastercard") {
    return (
      <View style={[styles.brandBadge, styles.mastercardBadge]}>
        <View style={[styles.circle, { backgroundColor: "#EB001B" }]} />
        <View style={[styles.circle, styles.secondCircle, { backgroundColor: "#F79E1B" }]} />
      </View>
    );
  }
  const label = brand === "amex" ? "AMEX" : brand === "visa" ? "VISA" : "CARD";
  return (
    <View style={[styles.brandBadge, brand === "amex" && styles.amexBadge]}>
      <Text style={[styles.brandText, brand === "amex" && styles.amexText]}>{label}</Text>
    </View>
  );
}

export default function CardsScreen() {
  const { mode, rideId = "", amount = "0" } = useLocalSearchParams<{ mode?: string; rideId?: string; amount?: string }>();
  const { setPaymentMethod } = useRideSearch();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    paymentService.listCards().then((items) => {
      if (!active) return;
      setCards(items);
      setSelectedId(items.find((item) => item.isDefault)?.id || items[0]?.id || null);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const useCard = () => {
    if (!selectedId) return;
    setPaymentMethod("card");
    if (mode === "retry") {
      router.replace({ pathname: "/payments/processing", params: { rideId, amount } });
      return;
    }
    router.back();
  };

  return (
    <PaymentScreen
      title={mode === "booking" ? "Select card" : "Payment cards"}
      subtitle={mode === "booking" ? "Choose a card for this ride" : "Manage saved payment methods"}
      footer={mode === "booking" || mode === "retry" ? <PaymentButton label={mode === "retry" ? "Retry payment" : "Use selected card"} icon="checkmark" onPress={useCard} disabled={!selectedId} /> : undefined}
    >
      {loading ? (
        <PaymentCard style={styles.loading}><ActivityIndicator color={paymentTheme.green} /></PaymentCard>
      ) : (
        <PaymentCard style={styles.listCard}>
          <Text style={styles.sectionLabel}>SAVED CARDS</Text>
          {cards.map((card) => {
            const selected = selectedId === card.id;
            return (
              <TouchableOpacity
                key={card.id}
                style={[styles.cardRow, selected && styles.selectedRow]}
                onPress={() => setSelectedId(card.id)}
                activeOpacity={0.84}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <BrandBadge brand={card.brand} />
                <View style={styles.cardCopy}>
                  <View style={styles.nameLine}>
                    <Text style={styles.cardName}>{card.brand === "mastercard" ? "Mastercard" : card.brand === "amex" ? "American Express" : "Visa"}</Text>
                    {card.isDefault ? <Text style={styles.defaultPill}>DEFAULT</Text> : null}
                  </View>
                  <Text style={styles.cardMeta}>•••• {card.last4}  ·  Expires {card.expiryLabel}</Text>
                </View>
                <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.addRow}
            onPress={() => router.push({ pathname: "/payments/card-setup", params: { mode } })}
            activeOpacity={0.84}
          >
            <View style={styles.addIcon}><Ionicons name="add" size={22} color={paymentTheme.green} /></View>
            <View style={styles.cardCopy}><Text style={styles.addTitle}>Add new card</Text><Text style={styles.cardMeta}>Secure bank setup</Text></View>
            <Ionicons name="chevron-forward" size={19} color="#94A3B8" />
          </TouchableOpacity>
        </PaymentCard>
      )}

      <View style={styles.secureRow}>
        <Ionicons name="shield-checkmark-outline" size={18} color={paymentTheme.green} />
        <Text style={styles.secureText}>Card details are protected by the payment provider</Text>
      </View>
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  loading: { minHeight: 220, justifyContent: "center" },
  listCard: { padding: 14 },
  sectionLabel: { color: paymentTheme.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1, paddingHorizontal: 4, paddingTop: 2, paddingBottom: 10 },
  cardRow: { minHeight: 78, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 17, borderWidth: 1, borderColor: "#E5ECE9", backgroundColor: "#FFFFFF", marginBottom: 10 },
  selectedRow: { backgroundColor: paymentTheme.mint, borderWidth: 1.5, borderColor: "#34D399", shadowColor: paymentTheme.green, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#EEF2F7", borderRadius: 0 },
  brandBadge: { width: 48, height: 34, borderRadius: 9, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  brandText: { color: "#153E8B", fontSize: 13, fontWeight: "900", fontStyle: "italic" },
  amexBadge: { backgroundColor: "#2E77BB", borderColor: "#2E77BB" },
  amexText: { color: "#FFFFFF", fontSize: 11 },
  mastercardBadge: { flexDirection: "row" },
  circle: { width: 20, height: 20, borderRadius: 10 },
  secondCircle: { marginLeft: -7, opacity: 0.92 },
  cardCopy: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardName: { color: paymentTheme.ink, fontSize: 14, fontWeight: "900" },
  defaultPill: { color: paymentTheme.green, backgroundColor: "#D1FAE5", borderRadius: 7, paddingHorizontal: 6, paddingVertical: 2, fontSize: 8, fontWeight: "900" },
  cardMeta: { color: paymentTheme.muted, fontSize: 11, fontWeight: "600", marginTop: 4 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: paymentTheme.green, borderWidth: 2 },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: paymentTheme.green },
  addRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 2, borderWidth: 1, borderColor: "#DDE8E3", borderRadius: 17, backgroundColor: "#FAFCFB" },
  addIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: paymentTheme.mint, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#A7F3D0" },
  addTitle: { color: paymentTheme.ink, fontSize: 14, fontWeight: "900" },
  secureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 16 },
  secureText: { color: paymentTheme.muted, fontSize: 11, fontWeight: "600" },
});
