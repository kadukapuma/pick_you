import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import RideScreenShell, { PrimaryRideButton, RideCard } from "../../features/ride-support/RideScreenShell";
import { rideTheme } from "../../features/ride-support/rideUtils";
import { PaymentMethod, useRideSearch } from "../../state/booking/RideBookingContext";

const methods: { id: PaymentMethod; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "cash", title: "Cash", subtitle: "Pay the driver after the trip", icon: "cash-outline" },
  { id: "wallet", title: "Wallet", subtitle: "Use your PickU wallet balance", icon: "wallet-outline" },
  { id: "card", title: "Card", subtitle: "Save for online card payment support", icon: "card-outline" },
];

export default function PaymentMethodScreen() {
  const { paymentMethod, setPaymentMethod } = useRideSearch();
  return (
    <RideScreenShell title="Payment method" subtitle="Choose how you want to pay for this ride.">
      <RideCard>
        {methods.map((method) => {
          const active = paymentMethod === method.id;
          return (
            <TouchableOpacity key={method.id} style={[styles.row, active && styles.activeRow]} onPress={() => setPaymentMethod(method.id)} activeOpacity={0.85}>
              <View style={[styles.icon, active && styles.activeIcon]}><Ionicons name={method.icon} size={22} color={active ? "#FFFFFF" : rideTheme.green} /></View>
              <View style={styles.textWrap}>
                <Text style={styles.title}>{method.title}</Text>
                <Text style={styles.subtitle}>{method.subtitle}</Text>
              </View>
              <Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={22} color={active ? rideTheme.green : "#CBD5E1"} />
            </TouchableOpacity>
          );
        })}
      </RideCard>
      <PrimaryRideButton label="Use selected method" icon="checkmark" onPress={() => router.back()} />
    </RideScreenShell>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  activeRow: { backgroundColor: "#F7FEFA", marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 14, borderBottomColor: "transparent" },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: rideTheme.softGreen, alignItems: "center", justifyContent: "center" },
  activeIcon: { backgroundColor: rideTheme.green },
  textWrap: { flex: 1, minWidth: 0 },
  title: { color: rideTheme.ink, fontSize: 15, fontWeight: "900" },
  subtitle: { color: rideTheme.muted, fontSize: 12, marginTop: 2 },
});