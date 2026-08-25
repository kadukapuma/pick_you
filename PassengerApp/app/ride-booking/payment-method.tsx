import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import PaymentScreen, {
  PaymentButton,
} from "../../features/payments/PaymentScreen";
import { formatLkr, paymentTheme } from "../../features/payments/paymentTheme";
import { creditService } from "../../services/payments/creditService";
import { loyaltyService } from "../../services/payments/loyaltyService";
import {
  CARD_PAYMENTS_ENABLED,
  paymentService,
} from "../../services/payments/paymentService";
import type { PaymentMethod } from "../../state/booking/RideBookingContext";
import { useRideSearch } from "../../state/booking/RideBookingContext";

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
    subtitle: "Pay securely with WEBXPAY after your ride",
    icon: "card-outline",
  },
];

export default function PaymentMethodScreen() {
  const {
    paymentMethod,
    setPaymentMethod,
    selectedPaymentCard,
    usePickuCredit,
    setUsePickuCredit,
    outboundTrip,
  } = useRideSearch();
  const [cardAvailable, setCardAvailable] = useState(CARD_PAYMENTS_ENABLED);
  const [walletAvailable, setWalletAvailable] = useState(false);
  // PickU credit (wallet) and loyalty points are two separate balances on
  // the backend, each with their own reserve/consume lifecycle - but the
  // passenger sees them as one combined "PickU credit" balance and one
  // toggle. Applying it reserves from both automatically.
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [walletReserved, setWalletReserved] = useState("0.00");
  const [loyaltyBalance, setLoyaltyBalance] = useState<string | null>(null);
  const [loyaltyReserved, setLoyaltyReserved] = useState("0.00");
  const [creditError, setCreditError] = useState("");
  const [loadingCredit, setLoadingCredit] = useState(true);
  const [fallbackNotice, setFallbackNotice] = useState(false);
  const available = useMemo(() => {
    if (walletBalance === null && loyaltyBalance === null) return null;
    return (Number(walletBalance || 0) + Number(loyaltyBalance || 0)).toFixed(
      2,
    );
  }, [walletBalance, loyaltyBalance]);
  const reserved = useMemo(
    () => (Number(walletReserved) + Number(loyaltyReserved)).toFixed(2),
    [walletReserved, loyaltyReserved],
  );
  const applyCreditResults = (
    credit: Awaited<ReturnType<typeof creditService.getSummary>>,
    loyalty: Awaited<ReturnType<typeof loyaltyService.getSummary>>,
  ) => {
    const creditOk = Boolean(credit.success && credit.data);
    const loyaltyOk = Boolean(loyalty.success && loyalty.data);
    if (creditOk) {
      setWalletBalance(credit.data!.availableBalance);
      setWalletReserved(credit.data!.reservedBalance);
    } else {
      setWalletBalance(null);
    }
    if (loyaltyOk) {
      setLoyaltyBalance(loyalty.data!.availableBalance);
      setLoyaltyReserved(loyalty.data!.reservedBalance);
    } else {
      setLoyaltyBalance(null);
    }
    if (!creditOk && !loyaltyOk) {
      setCreditError(
        credit.message ||
          loyalty.message ||
          "PickU credit is temporarily unavailable.",
      );
      setUsePickuCredit(false);
    } else {
      setCreditError("");
    }
  };
  const loadCredit = async () => {
    setLoadingCredit(true);
    const [credit, loyalty] = await Promise.all([
      creditService.getSummary(),
      loyaltyService.getSummary(),
    ]);
    applyCreditResults(credit, loyalty);
    setLoadingCredit(false);
  };
  useEffect(() => {
    let active = true;
    void Promise.all([
      paymentService.getCapabilities(),
      creditService.getSummary(),
      loyaltyService.getSummary(),
    ]).then(([capabilities, credit, loyalty]) => {
      if (!active) return;
      const card = capabilities.card || CARD_PAYMENTS_ENABLED;
      setCardAvailable(card);
      setWalletAvailable(capabilities.wallet);
      if (!card && paymentMethod === "card") {
        setPaymentMethod("cash");
        setFallbackNotice(true);
      }
      applyCreditResults(credit, loyalty);
      setLoadingCredit(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, setPaymentMethod, setUsePickuCredit]);
  const estimate = Number(outboundTrip.selectedRide?.price || 0);
  const credit = useMemo(
    () => (usePickuCredit ? Math.min(Number(available || 0), estimate) : 0),
    [available, estimate, usePickuCredit],
  );
  const remainder = Math.max(0, estimate - credit);
  const canUseCredit =
    walletAvailable && Number(available || 0) > 0 && !creditError;
  return (
    <PaymentScreen
      title="Payment method"
      subtitle="Choose how to pay after PickU credit"
      contentStyle={styles.content}
      footer={
        <PaymentButton
          label="Confirm payment method"
          icon="checkmark"
          onPress={() => router.back()}
        />
      }
    >
      {fallbackNotice ? (
        <View style={styles.warning}>
          <Ionicons name="warning-outline" size={19} color="#9A5B06" />
          <Text style={styles.warningText}>
            Card payments are unavailable. Cash has been selected instead.
          </Text>
        </View>
      ) : null}
      <View style={styles.creditCard}>
        <View style={styles.creditHeading}>
          <View style={styles.creditIcon}>
            <Ionicons
              name="wallet-outline"
              size={22}
              color={paymentTheme.green}
            />
          </View>
          <View style={styles.creditCopy}>
            <Text style={styles.creditTitle}>PickU credit</Text>
            <Text style={styles.creditBalance}>
              {loadingCredit
                ? "Checking balance…"
                : available === null
                  ? "Balance unavailable"
                  : `${formatLkr(available)} available`}
            </Text>
            {!loadingCredit && Number(loyaltyBalance || 0) > 0 ? (
              <Text style={styles.creditSubtext}>
                Includes {formatLkr(loyaltyBalance!)} in loyalty points
              </Text>
            ) : null}
          </View>
          <Switch
            value={usePickuCredit}
            onValueChange={setUsePickuCredit}
            disabled={!canUseCredit}
            trackColor={{ false: "#CBD5E1", true: "#8DE0B8" }}
            thumbColor={usePickuCredit ? paymentTheme.green : "#FFFFFF"}
            accessibilityRole="switch"
            accessibilityLabel="Use available PickU credit"
            accessibilityState={{
              checked: usePickuCredit,
              disabled: !canUseCredit,
            }}
          />
        </View>
        {Number(reserved) > 0 ? (
          <Text style={styles.reserved}>
            {formatLkr(reserved)} is reserved for another payment.
          </Text>
        ) : null}
        {!walletAvailable && !loadingCredit ? (
          <Text style={styles.unavailable}>
            Credit payments are not enabled right now. Your balance and activity
            remain available in Account.
          </Text>
        ) : creditError ? (
          <View style={styles.inlineError}>
            <Text style={styles.errorText}>
              PickU credit is temporarily unavailable. You can continue using
              cash or card.
            </Text>
            <TouchableOpacity onPress={() => void loadCredit()}>
              <Text style={styles.retry}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : Number(available || 0) <= 0 && !loadingCredit ? (
          <Text style={styles.unavailable}>
            No PickU credit available. You can continue with cash or card.
          </Text>
        ) : (
          <Text style={styles.helper}>
            We’ll apply up to your available credit to the final fare.
          </Text>
        )}
      </View>
      <Text style={styles.sectionLabel}>PAY THE REMAINING AMOUNT WITH</Text>
      <View style={styles.methods}>
        {methods.map((method) => {
          const selected = paymentMethod === method.id;
          const disabled = method.id === "card" && !cardAvailable;
          const subtitle =
            method.id === "card" && selectedPaymentCard
              ? `${selectedPaymentCard.brand.toUpperCase()} •••• ${selectedPaymentCard.last4}`
              : method.subtitle;
          return (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.method,
                selected && styles.selected,
                disabled && styles.disabled,
              ]}
              disabled={disabled}
              onPress={() => {
                if (method.id === "card") {
                  router.push({
                    pathname: "/payments/cards",
                    params: { mode: "booking" },
                  });
                } else {
                  setPaymentMethod(method.id);
                }
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
            >
              <View
                style={[styles.methodIcon, selected && styles.selectedIcon]}
              >
                <Ionicons
                  name={method.icon}
                  size={22}
                  color={selected ? "#FFFFFF" : paymentTheme.green}
                />
              </View>
              <View style={styles.methodCopy}>
                <View style={styles.titleLine}>
                  <Text style={styles.methodTitle}>{method.title}</Text>
                  {disabled ? (
                    <Text style={styles.pill}>UNAVAILABLE</Text>
                  ) : null}
                </View>
                <Text style={styles.methodSubtitle}>{subtitle}</Text>
              </View>
              {method.id === "card" && !disabled ? (
                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color={paymentTheme.muted}
                />
              ) : (
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.dot} /> : null}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {estimate > 0 ? (
        <View style={styles.split}>
          <Text style={styles.splitTitle}>Estimated payment split</Text>
          <Split label="Estimated fare" value={formatLkr(estimate)} />
          <Split
            label="PickU credit"
            value={credit ? `−${formatLkr(credit)}` : formatLkr(0)}
            green
          />
          <Split
            label={`${paymentMethod === "card" ? "Card" : "Cash"} after ride`}
            value={formatLkr(remainder)}
            strong
          />
          <Text style={styles.disclaimer}>
            This is an estimate. PickU applies available credit to the final
            fare. Any remaining amount uses your selected method.
          </Text>
        </View>
      ) : null}
    </PaymentScreen>
  );
}
function Split({
  label,
  value,
  green,
  strong,
}: {
  label: string;
  value: string;
  green?: boolean;
  strong?: boolean;
}) {
  return (
    <View style={styles.splitRow}>
      <Text style={[styles.splitLabel, strong && styles.strong]}>{label}</Text>
      <Text
        style={[
          styles.splitValue,
          green && styles.green,
          strong && styles.strong,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 36 },
  warning: {
    flexDirection: "row",
    gap: 9,
    padding: 13,
    backgroundColor: "#FFF8E8",
    borderRadius: 14,
  },
  warningText: { flex: 1, color: "#7A5310", fontSize: 12, lineHeight: 17 },
  creditCard: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DCE9E4",
  },
  creditHeading: { flexDirection: "row", alignItems: "center" },
  creditIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: paymentTheme.mint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  creditCopy: { flex: 1 },
  creditTitle: { color: paymentTheme.ink, fontSize: 15, fontWeight: "900" },
  creditBalance: { color: paymentTheme.muted, fontSize: 11, marginTop: 3 },
  creditSubtext: {
    color: paymentTheme.green,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  helper: {
    color: paymentTheme.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
  },
  reserved: {
    color: "#7A5310",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 12,
  },
  unavailable: {
    color: "#7A6570",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
  },
  inlineError: { marginTop: 12 },
  errorText: { color: "#7A6570", fontSize: 11, lineHeight: 17 },
  retry: {
    color: paymentTheme.green,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 6,
  },
  sectionLabel: {
    color: paymentTheme.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 5,
  },
  methods: { gap: 10 },
  method: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3EBE8",
    borderRadius: 18,
    padding: 13,
  },
  selected: {
    borderColor: "#6ED5A1",
    backgroundColor: paymentTheme.mint,
    borderWidth: 1.5,
  },
  disabled: { opacity: 0.58 },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: paymentTheme.mint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  selectedIcon: { backgroundColor: paymentTheme.green },
  methodCopy: { flex: 1 },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  methodTitle: { color: paymentTheme.ink, fontSize: 14, fontWeight: "900" },
  methodSubtitle: { color: paymentTheme.muted, fontSize: 11, marginTop: 3 },
  pill: {
    color: "#8A5A00",
    backgroundColor: "#FFF3CD",
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 7,
    fontWeight: "900",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#B9C8C2",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  radioSelected: {
    borderColor: paymentTheme.green,
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: paymentTheme.green,
  },
  split: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DCE9E4",
  },
  splitTitle: {
    color: paymentTheme.ink,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
  },
  splitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
    paddingVertical: 5,
  },
  splitLabel: { color: paymentTheme.muted, fontSize: 12 },
  splitValue: { color: paymentTheme.ink, fontSize: 12, fontWeight: "800" },
  green: { color: paymentTheme.green },
  strong: { color: paymentTheme.ink, fontWeight: "900" },
  disclaimer: {
    color: paymentTheme.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: paymentTheme.line,
  },
});
