import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import PaymentScreen, {
  PaymentButton,
} from "../../features/payments/PaymentScreen";
import { paymentTheme } from "../../features/payments/paymentTheme";
import { paymentService } from "../../services/payments/paymentService";
import type { SavedCard } from "../../services/payments/paymentTypes";
import { useRideSearch } from "../../state/booking/RideBookingContext";

function BrandBadge({ brand }: { brand: SavedCard["brand"] }) {
  if (brand === "mastercard") {
    return (
      <View style={[styles.brandBadge, styles.mastercardBadge]}>
        <View style={[styles.circle, { backgroundColor: "#EB001B" }]} />
        <View
          style={[
            styles.circle,
            styles.secondCircle,
            { backgroundColor: "#F79E1B" },
          ]}
        />
      </View>
    );
  }
  const label = brand === "amex" ? "AMEX" : brand === "visa" ? "VISA" : "CARD";
  return (
    <View style={[styles.brandBadge, brand === "amex" && styles.amexBadge]}>
      <Text style={[styles.brandText, brand === "amex" && styles.amexText]}>
        {label}
      </Text>
    </View>
  );
}

export default function CardsScreen() {
  const {
    mode,
    rideId = "",
    amount = "0",
  } = useLocalSearchParams<{
    mode?: string;
    rideId?: string;
    amount?: string;
  }>();
  const { setPaymentMethod, setSelectedPaymentCard } = useRideSearch();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      paymentService.listCards().then((items) => {
        if (!active) return;
        setCards(items);
        setSelectedId(
          items.find((item) => item.isDefault)?.id || items[0]?.id || null,
        );
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const useCard = () => {
    const selectedCard = cards.find((card) => card.id === selectedId);
    if (!selectedCard) return;
    setSelectedPaymentCard(selectedCard);
    setPaymentMethod("card");
    if (mode === "retry") {
      router.replace({
        pathname: "/payments/processing",
        params: { rideId, amount },
      });
      return;
    }
    router.back();
  };

  const goToAddCard = () =>
    router.push({ pathname: "/payments/card-setup", params: { mode } });

  const isPicker = mode === "booking" || mode === "retry";

  return (
    <PaymentScreen
      title={mode === "booking" ? "Select card" : "Payment cards"}
      subtitle={
        mode === "booking"
          ? "Choose a card for this ride"
          : "Manage saved payment methods"
      }
      contentStyle={styles.content}
      footer={
        isPicker ? (
          <View style={styles.footerStack}>
            <TouchableOpacity
              style={styles.addLink}
              onPress={goToAddCard}
              activeOpacity={0.7}
            >
              <Ionicons
                name="add-circle-outline"
                size={15}
                color={paymentTheme.green}
              />
              <Text style={styles.addLinkText}>Add a new card</Text>
            </TouchableOpacity>

            <PaymentButton
              label={mode === "retry" ? "Retry payment" : "Use selected card"}
              icon="checkmark"
              onPress={useCard}
              disabled={!selectedId}
            />
          </View>
        ) : (
          <PaymentButton
            label="Add new card"
            icon="add"
            onPress={goToAddCard}
          />
        )
      }
    >
      <View style={styles.previewBanner}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#176B52" />
        <View style={styles.previewCopy}>
          <Text style={styles.previewTitle}>WEBXPAY saved cards</Text>
          <Text style={styles.previewText}>
            Select a tokenized card to pay securely after your ride.
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={paymentTheme.green} />
        </View>
      ) : (
        <>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionLabel}>
              SAVED CARDS · {cards.length}
            </Text>
            <Text style={styles.testPill}>WEBXPAY</Text>
          </View>

          {cards.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="card-outline"
                  size={22}
                  color={paymentTheme.green}
                />
              </View>
              <Text style={styles.emptyTitle}>No saved cards yet</Text>
              <Text style={styles.emptyText}>
                Add a card below to use it for your rides.
              </Text>
            </View>
          ) : (
            <View style={styles.cardsList}>
              {cards.map((card) => {
                const selected = selectedId === card.id;
                return (
                  <TouchableOpacity
                    key={card.id}
                    style={[styles.cardRow, selected && styles.selectedRow]}
                    onPress={() => {
                      if (!isPicker) {
                        router.push({
                          pathname: "/payments/card-details",
                          params: { cardId: card.id },
                        });
                        return;
                      }
                      setSelectedId(card.id);
                    }}
                    activeOpacity={0.84}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                  >
                    <BrandBadge brand={card.brand} />
                    <View style={styles.cardCopy}>
                      <View style={styles.nameLine}>
                        <Text style={styles.cardName}>
                          {card.brand === "mastercard"
                            ? "Mastercard"
                            : card.brand === "amex"
                              ? "American Express"
                              : "Visa"}
                        </Text>
                        {card.isDefault ? (
                          <Text style={styles.defaultPill}>DEFAULT</Text>
                        ) : null}
                      </View>
                      <Text style={styles.cardMeta}>
                        •••• {card.last4} · Expires {card.expiryLabel}
                      </Text>
                    </View>
                    {isPicker ? (
                      <View
                        style={[styles.radio, selected && styles.radioSelected]}
                      >
                        {selected ? <View style={styles.radioDot} /> : null}
                      </View>
                    ) : (
                      <View style={styles.chevronWrap}>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color="#94A3B8"
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      )}

      <View style={styles.secureRow}>
        <Ionicons
          name="shield-checkmark-outline"
          size={18}
          color={paymentTheme.green}
        />
        <Text style={styles.secureText}>
          Card details are protected by the payment provider
        </Text>
      </View>
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 22, paddingBottom: 28 },

  previewBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFF8E6",
    borderWidth: 1,
    borderColor: "#F4D58D",
    marginBottom: 16,
  },
  previewCopy: { flex: 1 },
  previewTitle: { color: "#6B4600", fontSize: 12, fontWeight: "900" },
  previewText: { color: "#8A681F", fontSize: 11, lineHeight: 16, marginTop: 2 },

  loading: { minHeight: 220, justifyContent: "center", alignItems: "center" },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  sectionLabel: {
    color: paymentTheme.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  testPill: {
    color: "#8A5A00",
    backgroundColor: "#FFF3CD",
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  cardsList: { gap: 10 },

  cardRow: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 13,
    paddingVertical: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    backgroundColor: paymentTheme.white,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  selectedRow: {
    backgroundColor: paymentTheme.mint,
    borderWidth: 1.5,
    borderColor: "#34D399",
    shadowColor: paymentTheme.green,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 3,
  },

  brandBadge: {
    width: 48,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  brandText: {
    color: "#153E8B",
    fontSize: 13,
    fontWeight: "900",
    fontStyle: "italic",
  },
  amexBadge: { backgroundColor: "#2E77BB", borderColor: "#2E77BB" },
  amexText: { color: "#FFFFFF", fontSize: 11 },
  mastercardBadge: { flexDirection: "row" },
  circle: { width: 20, height: 20, borderRadius: 10 },
  secondCircle: { marginLeft: -7, opacity: 0.92 },

  cardCopy: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardName: { color: paymentTheme.ink, fontSize: 14, fontWeight: "900" },
  defaultPill: {
    color: paymentTheme.green,
    backgroundColor: "#D1FAE5",
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 8,
    fontWeight: "900",
  },
  cardMeta: {
    color: paymentTheme.muted,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: paymentTheme.green,
    borderWidth: 2,
    backgroundColor: paymentTheme.white,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: paymentTheme.green,
  },

  chevronWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 34,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    backgroundColor: "#FAFCFB",
  },
  emptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: paymentTheme.mint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: { color: paymentTheme.ink, fontSize: 14, fontWeight: "900" },
  emptyText: {
    color: paymentTheme.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    textAlign: "center",
  },

  secureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  secureText: { color: paymentTheme.muted, fontSize: 11, fontWeight: "600" },

  /* Footer (fixed, outside the scrollable card list) */
  footerStack: { gap: 10 },
  addLink: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
  },
  addLinkText: { color: paymentTheme.green, fontSize: 12, fontWeight: "800" },
});
