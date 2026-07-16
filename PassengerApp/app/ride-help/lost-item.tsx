import { Alert, StyleSheet, Text, TextInput } from "react-native";
import { useState } from "react";
import RideScreenShell, { PrimaryRideButton, RideCard } from "../../features/ride-support/RideScreenShell";
import { rideTheme } from "../../features/ride-support/rideUtils";

export default function LostItemScreen() {
  const [item, setItem] = useState("");
  return (
    <RideScreenShell title="Lost item" subtitle="Describe what you left in the vehicle.">
      <RideCard>
        <Text style={styles.label}>Item details</Text>
        <TextInput value={item} onChangeText={setItem} multiline placeholder="Example: black wallet on back seat" style={styles.input} />
      </RideCard>
      <PrimaryRideButton label="Submit report" icon="send-outline" disabled={!item.trim()} onPress={() => Alert.alert("Report saved", "Lost item support can be connected to backend when ready.")} />
    </RideScreenShell>
  );
}

const styles = StyleSheet.create({
  label: { color: rideTheme.ink, fontWeight: "900", marginBottom: 8 },
  input: { minHeight: 120, borderRadius: 16, borderWidth: 1, borderColor: rideTheme.line, padding: 12, color: rideTheme.ink, textAlignVertical: "top" },
});