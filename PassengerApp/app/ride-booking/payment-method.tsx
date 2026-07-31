import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import PaymentScreen, {
  PaymentButton,
} from "../../features/payments/PaymentScreen";
import { paymentTheme } from "../../features/payments/paymentTheme";
import { CARD_PAYMENTS_ENABLED } from "../../services/payments/paymentService";
import {
  PaymentMethod,
  useRideSearch,
} from "../../state/booking/RideBookingContext";

const methods: {
  id: PaymentMethod;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    id: "cash",
    title: "Cash",
    subtitle: "Pay the driver after your ride",
    icon: "cash-outline",
  },
  {
    id: "card",
    title: "Credit or debit card",
    subtitle: "Pay securely after the final fare",
    icon: "card-outline",
  },

  // PickU Wallet is intentionally hidden until its backend flow is ready.
  // {
  //   id: "wallet",
  //   title: "PickU Wallet",
  //   subtitle: "Use your available wallet balance",
  //   icon: "wallet-outline",
  // },
];

export default function PaymentMethodScreen() {
  const { paymentMethod, setPaymentMethod } = useRideSearch();

  useEffect(() => {
    if (!CARD_PAYMENTS_ENABLED && paymentMethod === "card") {
      setPaymentMethod("cash");
    }
  }, [paymentMethod, setPaymentMethod]);

  const chooseMethod = (method: PaymentMethod) => {
    if (method === "card") {
      router.push({
        pathname: "/payments/cards",
        params: { mode: "booking" },
      });

      return;
    }

    setPaymentMethod(method);
  };

  return (
    <PaymentScreen
      title="Payment method"
      subtitle="Choose how you want to pay for this ride"
      contentStyle={styles.content}
      footer={
        <PaymentButton
          label="Confirm payment method"
          icon="checkmark"
          onPress={() => router.back()}
        />
      }
    >
      {/* Section heading */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>How do you want to pay?</Text>
        <Text style={styles.sectionDescription}>
          Pick the option you prefer — you can switch it any time before you
          request a ride.
        </Text>
      </View>

      {/* Payment methods — each one is its own standalone card on the screen */}
      <View style={styles.methodsList}>
        {methods.map((method) => {
          const selected = paymentMethod === method.id;

          return (
            <TouchableOpacity
              key={method.id}
              style={[styles.methodCard, selected && styles.methodCardSelected]}
              onPress={() => chooseMethod(method.id)}
              activeOpacity={0.86}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              <View style={styles.methodRow}>
                {/* Icon */}
                <View
                  style={[styles.methodIcon, selected && styles.selectedIcon]}
                >
                  <Ionicons
                    name={method.icon}
                    size={22}
                    color={selected ? paymentTheme.white : paymentTheme.green}
                  />
                </View>

                {/* Payment method details */}
                <View style={styles.methodCopy}>
                  <View style={styles.methodTitleLine}>
                    <Text style={styles.methodTitle}>{method.title}</Text>

                    {method.id === "card" && !CARD_PAYMENTS_ENABLED ? (
                      <Text style={styles.setupPill}>SANDBOX SETUP</Text>
                    ) : null}
                  </View>

                  <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
                </View>

                {/* Selection indicator */}
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
              </View>

              {/* Selected saved card */}
              {method.id === "card" && selected ? (
                <View style={styles.savedCardLine}>
                  <View style={styles.visaMini}>
                    <Text style={styles.visaText}>VISA</Text>
                  </View>

                  <Text style={styles.savedCardText}>•••• 6492</Text>

                  <View style={styles.changeChip}>
                    <Text style={styles.changeText}>Change</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={12}
                      color={paymentTheme.green}
                    />
                  </View>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Information */}
      <View style={styles.noteCard}>
        <View style={styles.noteIcon}>
          <Ionicons
            name={
              paymentMethod === "card"
                ? "shield-checkmark-outline"
                : "information-circle-outline"
            }
            size={18}
            color={paymentTheme.green}
          />
        </View>

        <Text style={styles.noteText}>
          {paymentMethod === "card"
            ? CARD_PAYMENTS_ENABLED
              ? "Your card is charged only after the final fare is ready."
              : "Card selection is available for review; live payment is currently disabled."
            : "Pay the final amount directly to your driver."}
        </Text>
      </View>
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: 24,
    paddingBottom: 42,
  },

  /* Section heading */
  sectionHeader: {
    marginBottom: 18,
    paddingHorizontal: 2,
  },

  sectionEyebrow: {
    color: paymentTheme.green,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 6,
  },

  sectionTitle: {
    color: paymentTheme.ink,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  sectionDescription: {
    color: paymentTheme.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  /* Methods list — no outer wrapper card, each row stands on its own */
  methodsList: {
    gap: 10,
  },

  methodCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: paymentTheme.white,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },

  methodCardSelected: {
    backgroundColor: paymentTheme.mint,
    borderColor: "#6EE7B7",
    borderWidth: 1.5,
    shadowColor: paymentTheme.green,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 3,
  },

  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  /* Payment icon */
  methodIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: paymentTheme.mint,
    alignItems: "center",
    justifyContent: "center",
  },

  selectedIcon: {
    backgroundColor: paymentTheme.green,
  },

  /* Payment copy */
  methodCopy: {
    flex: 1,
    minWidth: 0,
  },

  methodTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },

  methodTitle: {
    color: paymentTheme.ink,
    fontSize: 15,
    fontWeight: "900",
  },

  setupPill: {
    color: "#8A5A00",
    backgroundColor: "#FFF3CD",
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.35,
  },

  methodSubtitle: {
    color: paymentTheme.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  /* Radio */
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

  /* Saved card */
  savedCardLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(32, 183, 104, 0.18)",
  },

  visaMini: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: paymentTheme.white,
    borderWidth: 1,
    borderColor: "#DCE4EA",
  },

  visaText: {
    color: "#153E8B",
    fontSize: 8,
    fontWeight: "900",
    fontStyle: "italic",
  },

  savedCardText: {
    color: paymentTheme.ink,
    fontSize: 11,
    fontWeight: "800",
    flex: 1,
  },

  changeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  changeText: {
    color: paymentTheme.green,
    fontSize: 10,
    fontWeight: "900",
  },

  /* Information card */
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EEF2F7",
  },

  noteIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: paymentTheme.mint,
    alignItems: "center",
    justifyContent: "center",
  },

  noteText: {
    flex: 1,
    color: paymentTheme.muted,
    fontSize: 11,
    lineHeight: 17,
    paddingTop: 5,
  },
});
