import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import RideScreenShell, { RideCard } from "../../features/ride-support/RideScreenShell";
import { money, rideTheme } from "../../features/ride-support/rideUtils";

function row(label: string, value: any) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>Rs. {money(value)}</Text></View>;
}

export default function RideReceiptScreen() {
  const { rideData } = useLocalSearchParams<{ rideData?: string }>();
  const ride = rideData ? JSON.parse(rideData) : {};
  const total = ride.final_fare || ride.estimated_fare || ride.payment?.amount;
  return (
    <RideScreenShell title="Receipt" subtitle={`Trip #${ride.id || ""}`}>
      <RideCard>
        {row("Estimated fare", ride.estimated_fare)}
        {row("Extra distance", ride.extra_distance_fare)}
        {row("Waiting charge", ride.waiting_fare)}
        <View style={styles.divider} />
        <View style={styles.row}><Text style={styles.totalLabel}>Final fare</Text><Text style={styles.total}>Rs. {money(total)}</Text></View>
      </RideCard>
      <RideCard>
        <Text style={styles.note}>Payment: {ride.payment?.payment_method || "Cash"} - {ride.payment?.payment_status || "Pending"}</Text>
        <Text style={styles.note}>Pickup: {ride.pickup_address || "Pickup location"}</Text>
        <Text style={styles.note}>Drop-off: {ride.drop_address || "Destination"}</Text>
      </RideCard>
    </RideScreenShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", gap: 14, paddingVertical: 8 },
  label: { color: rideTheme.muted, fontWeight: "800" },
  value: { color: rideTheme.ink, fontWeight: "900" },
  divider: { height: 1, backgroundColor: rideTheme.line, marginVertical: 8 },
  totalLabel: { color: rideTheme.ink, fontSize: 17, fontWeight: "900" },
  total: { color: rideTheme.green, fontSize: 18, fontWeight: "900" },
  note: { color: rideTheme.muted, fontSize: 13, lineHeight: 20, marginBottom: 6 },
});