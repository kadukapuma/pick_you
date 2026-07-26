import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import RideScreenShell, { PrimaryRideButton, RideCard, SecondaryRideButton } from "../../features/ride-support/RideScreenShell";
import { rideTheme } from "../../features/ride-support/rideUtils";
import { useRideSearch } from "../../state/booking/RideBookingContext";

const suggestions = ["PICK10", "WELCOME", "CITYRIDE"];

export default function PromosScreen() {
  const { promoCode, setPromoCode } = useRideSearch();
  const [code, setCode] = useState(promoCode || "");
  const apply = () => {
    setPromoCode(code.trim().toUpperCase() || null);
    router.back();
  };
  return (
    <RideScreenShell title="Promos" subtitle="Apply a ride promo before confirming. Validation can connect to backend later.">
      <RideCard>
        <Text style={styles.label}>Promo code</Text>
        <TextInput value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="Enter code" style={styles.input} />
        <View style={styles.chips}>{suggestions.map((item) => <TouchableOpacity key={item} onPress={() => setCode(item)} style={styles.chip}><Text style={styles.chipText}>{item}</Text></TouchableOpacity>)}</View>
      </RideCard>
      <PrimaryRideButton label="Apply promo" icon="pricetag-outline" onPress={apply} />
      {promoCode ? <SecondaryRideButton label="Remove current promo" icon="close-circle-outline" danger onPress={() => { setPromoCode(null); setCode(""); }} /> : null}
    </RideScreenShell>
  );
}

const styles = StyleSheet.create({
  label: { color: rideTheme.ink, fontSize: 13, fontWeight: "900", marginBottom: 8 },
  input: { height: 54, borderRadius: 16, borderWidth: 1, borderColor: rideTheme.line, paddingHorizontal: 14, color: rideTheme.ink, fontWeight: "800", backgroundColor: "#FFFFFF" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: rideTheme.softGreen },
  chipText: { color: rideTheme.green, fontWeight: "900" },
});