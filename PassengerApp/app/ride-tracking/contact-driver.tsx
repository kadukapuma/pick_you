import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import RideScreenShell, { RideCard } from "../../features/ride-support/RideScreenShell";
import { getDriverName, getDriverPhone, rideTheme } from "../../features/ride-support/rideUtils";

export default function ContactDriverScreen() {
  const { rideData } = useLocalSearchParams<{ rideData?: string }>();
  const ride = rideData ? JSON.parse(rideData) : {};
  const phone = getDriverPhone(ride);
  const call = () => phone ? Linking.openURL(`tel:${phone}`) : Alert.alert("Unavailable", "Driver phone number is not available yet.");
  const sms = () => phone ? Linking.openURL(`sms:${phone}`) : Alert.alert("Unavailable", "Driver phone number is not available yet.");
  return (
    <RideScreenShell title="Contact driver" subtitle={getDriverName(ride)}>
      <RideCard>
        <Action icon="call-outline" title="Call driver" subtitle={phone || "Phone not available"} onPress={call} />
        <Action icon="chatbubble-outline" title="Message driver" subtitle="Send an SMS pickup note" onPress={sms} />
      </RideCard>
    </RideScreenShell>
  );
}

function Action({ icon, title, subtitle, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={styles.action}><View style={styles.icon}><Ionicons name={icon} size={22} color={rideTheme.green} /></View><View style={{ flex: 1 }}><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View><Ionicons name="chevron-forward" size={18} color="#94A3B8" /></TouchableOpacity>;
}

const styles = StyleSheet.create({
  action: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: rideTheme.softGreen, alignItems: "center", justifyContent: "center" },
  title: { color: rideTheme.ink, fontWeight: "900", fontSize: 15 },
  subtitle: { color: rideTheme.muted, fontSize: 12, marginTop: 2 },
});