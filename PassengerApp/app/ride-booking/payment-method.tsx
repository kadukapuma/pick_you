import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import PaymentScreen, {
  PaymentButton,
  PaymentCard,
} from "../../features/payments/PaymentScreen";
import { paymentTheme } from "../../features/payments/paymentTheme";
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
  // { id: "wallet", title: "PickU Wallet", subtitle: "Use your available wallet balance", icon: "wallet-outline" },
];

export default function PaymentMethodScreen() {
  const { paymentMethod, setPaymentMethod } = useRideSearch();

  const chooseMethod = (method: PaymentMethod) => {
    if (method === "card") {
      router.push({ pathname: "/payments/cards", params: { mode: "booking" } });
      return;
    }
    setPaymentMethod(method);
  };

  return (
    <PaymentScreen
      title="Payment method"
      subtitle="Choose for this ride"
      contentStyle={styles.centeredContent}
      footer={
        <PaymentButton
          label="Confirm payment method"
          icon="checkmark"
          onPress={() => router.back()}
        />
      }
    >
      <PaymentCard style={styles.methodsCard}>
        {methods.map((method, index) => {
          const selected = paymentMethod === method.id;
          return (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodRow,
                selected && styles.selectedRow,
                index < methods.length - 1 && !selected && styles.divider,
              ]}
              onPress={() => chooseMethod(method.id)}
              activeOpacity={0.84}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              <View
                style={[styles.methodIcon, selected && styles.selectedIcon]}
              >
                <Ionicons
                  name={method.icon}
                  size={23}
                  color={selected ? paymentTheme.white : paymentTheme.green}
                />
              </View>
              <View style={styles.methodCopy}>
                <Text style={styles.methodTitle}>{method.title}</Text>
                <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
                {method.id === "card" && selected ? (
                  <View style={styles.savedCardLine}>
                    <View style={styles.visaMini}>
                      <Text style={styles.visaText}>VISA</Text>
                    </View>
                    <Text style={styles.savedCardText}>•••• 6492</Text>
                    <Text style={styles.changeText}>Change</Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </PaymentCard>

      <View style={styles.noteRow}>
        <Ionicons
          name={
            paymentMethod === "card"
              ? "shield-checkmark-outline"
              : "information-circle-outline"
          }
          size={18}
          color={paymentTheme.green}
        />
        <Text style={styles.noteText}>
          {paymentMethod === "card"
            ? "Your card is charged only after the final fare is ready."
            : "Pay the final amount directly to your driver."}
        </Text>
      </View>
    </PaymentScreen>
  );
}

const styles = StyleSheet.create({
  centeredContent: { flexGrow: 1, justifyContent: "center", paddingTop: 18, paddingBottom: 42 },
  methodsCard: { padding: 10 },
  methodRow: {
    minHeight: 82,
    borderRadius: 17,
    paddingHorizontal: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectedRow: {
    backgroundColor: paymentTheme.mint,
    borderWidth: 1.5,
    borderColor: "#6EE7B7",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
    borderRadius: 0,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: paymentTheme.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedIcon: { backgroundColor: paymentTheme.green },
  methodCopy: { flex: 1, minWidth: 0 },
  methodTitle: { color: paymentTheme.ink, fontSize: 15, fontWeight: "900" },
  methodSubtitle: {
    color: paymentTheme.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
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
  radioSelected: { borderColor: paymentTheme.green, borderWidth: 2 },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: paymentTheme.green,
  },
  savedCardLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 8,
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
  savedCardText: { color: paymentTheme.ink, fontSize: 11, fontWeight: "800" },
  changeText: {
    color: paymentTheme.green,
    fontSize: 10,
    fontWeight: "900",
    marginLeft: 2,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
  },
  noteText: {
    flex: 1,
    color: paymentTheme.muted,
    fontSize: 11,
    lineHeight: 17,
  },
});
