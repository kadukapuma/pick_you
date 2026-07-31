import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import PaymentScreen, { PaymentButton, PaymentCard } from "../../features/payments/PaymentScreen";
import { paymentTheme } from "../../features/payments/paymentTheme";
import { paymentService } from "../../services/payments/paymentService";

// Mirrors MockPaymentGateway on the backend - these are the only numbers that
// exercise the decline / error branches until a real gateway is wired up.
const TEST_CARDS = [
  { number: "4242 4242 4242 4242", outcome: "Always succeeds" },
  { number: "4000 0000 0000 0002", outcome: "Always declined" },
  { number: "4000 0000 0000 0119", outcome: "Gateway error" },
];

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function CardSetupScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [saving, setSaving] = useState(false);

  const digitsOnly = number.replace(/\D/g, "");
  const [expMonthStr, expYearStr] = expiry.split("/");
  const expMonth = Number(expMonthStr);
  const expYear = expYearStr ? 2000 + Number(expYearStr) : NaN;

  const isValid = useMemo(() => {
    return (
      digitsOnly.length >= 12 &&
      expMonth >= 1 &&
      expMonth <= 12 &&
      Number.isFinite(expYear) &&
      expYear >= new Date().getFullYear() &&
      cvv.length >= 3
    );
  }, [digitsOnly, expMonth, expYear, cvv]);

  const saveCard = async () => {
    if (!isValid || saving) return;
    setSaving(true);

    try {
      const result = await paymentService.saveCard({
        number: digitsOnly,
        expMonth,
        expYear,
        cvv,
      });

      if (!result.success || !result.card) {
        Alert.alert("Could not save card", result.message || "Please check the details and try again.");
        return;
      }

      router.replace({
        pathname: "/payments/card-setup-complete",
        params: { mode, brand: result.card.brand, last4: result.card.last4 },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PaymentScreen
      title="Add new card"
      subtitle="Test mode - no real charge is made"
      keyboardAware
      footer={
        <PaymentButton
          label={saving ? "Saving…" : "Save card"}
          icon="checkmark"
          onPress={saveCard}
          disabled={!isValid || saving}
        />
      }
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
        <Text style={styles.cardNumber}>
          {number ? formatCardNumber(number) : "••••  ••••  ••••  ••••"}
        </Text>
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.metaLabel}>EXPIRES</Text>
            <Text style={styles.metaValue}>{expiry || "MM/YY"}</Text>
          </View>
          <View style={styles.brandPair}>
            <View style={[styles.circle, { backgroundColor: "#EB001B" }]} />
            <View style={[styles.circle, styles.circleTwo, { backgroundColor: "#F79E1B" }]} />
          </View>
        </View>
      </View>

      <PaymentCard style={styles.formCard}>
        <Text style={styles.label}>Card number</Text>
        <TextInput
          style={styles.input}
          placeholder="4242 4242 4242 4242"
          placeholderTextColor="#B9C4C0"
          keyboardType="number-pad"
          value={formatCardNumber(number)}
          onChangeText={(text) => setNumber(text.replace(/\D/g, ""))}
          maxLength={23}
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Expiry (MM/YY)</Text>
            <TextInput
              style={styles.input}
              placeholder="12/30"
              placeholderTextColor="#B9C4C0"
              keyboardType="number-pad"
              value={expiry}
              onChangeText={(text) => setExpiry(formatExpiry(text))}
              maxLength={5}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>CVV</Text>
            <TextInput
              style={styles.input}
              placeholder="123"
              placeholderTextColor="#B9C4C0"
              keyboardType="number-pad"
              secureTextEntry
              value={cvv}
              onChangeText={(text) => setCvv(text.replace(/\D/g, "").slice(0, 4))}
              maxLength={4}
            />
          </View>
        </View>
      </PaymentCard>

      <PaymentCard style={styles.testCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons name="flask-outline" size={19} color={paymentTheme.warning} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>Test mode</Text>
            <Text style={styles.infoText}>
              No real card processor is connected yet. Use one of these numbers to
              try each outcome.
            </Text>
          </View>
        </View>
        {TEST_CARDS.map((card) => (
          <View key={card.number} style={styles.testRow}>
            <Text style={styles.testNumber}>{card.number}</Text>
            <Text style={styles.testOutcome}>{card.outcome}</Text>
          </View>
        ))}
      </PaymentCard>

      <View style={styles.secureNote}>
        <Ionicons name="lock-closed" size={16} color={paymentTheme.green} />
        <Text style={styles.secureText}>
          Only the last 4 digits are stored. The full card number is never saved.
        </Text>
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
  formCard: { gap: 4 },
  label: { color: paymentTheme.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.3, marginBottom: 6, marginTop: 10 },
  input: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: paymentTheme.line, paddingHorizontal: 14, fontSize: 15, fontWeight: "700", color: paymentTheme.ink, backgroundColor: "#FAFCFB" },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  testCard: { gap: 4, backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingBottom: 8 },
  infoIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  infoCopy: { flex: 1 },
  infoTitle: { color: paymentTheme.ink, fontSize: 13, fontWeight: "900" },
  infoText: { color: paymentTheme.muted, fontSize: 11, marginTop: 3, lineHeight: 16 },
  testRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderTopWidth: 1, borderTopColor: "#FDE68A" },
  testNumber: { color: paymentTheme.ink, fontSize: 12, fontWeight: "800" },
  testOutcome: { color: paymentTheme.muted, fontSize: 11, fontWeight: "600" },
  secureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 12 },
  secureNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 12 },
  secureText: { color: paymentTheme.muted, fontSize: 11, lineHeight: 16, flex: 1 },
});
