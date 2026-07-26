import { useLocalSearchParams } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import RideScreenShell, { RideCard } from "../../features/ride-support/RideScreenShell";
import { getDriverName, getDriverProfilePicture, getVehicleDescription, getVehicleNumber, rideTheme } from "../../features/ride-support/rideUtils";

export default function DriverProfileScreen() {
  const { rideData } = useLocalSearchParams<{ rideData?: string }>();
  const ride = rideData ? JSON.parse(rideData) : {};
  const driverProfilePicture = getDriverProfilePicture(ride);
  return (
    <RideScreenShell title="Driver profile" subtitle="Driver and vehicle assigned to this ride.">
      <RideCard>
        <View style={styles.avatar}>
          {driverProfilePicture ? (
            <Image source={{ uri: driverProfilePicture }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{getDriverName(ride).slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <Text style={styles.name}>{getDriverName(ride)}</Text>
        <Text style={styles.rating}>4.8 rating</Text>
      </RideCard>
      <RideCard>
        <Text style={styles.section}>Vehicle</Text>
        <Text style={styles.value}>{getVehicleDescription(ride)}</Text>
        <Text style={styles.plate}>{getVehicleNumber(ride)}</Text>
      </RideCard>
    </RideScreenShell>
  );
}

const styles = StyleSheet.create({
  avatar: { alignSelf: "center", width: 82, height: 82, borderRadius: 41, backgroundColor: rideTheme.softGreen, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  avatarText: { color: rideTheme.green, fontSize: 32, fontWeight: "900" },
  name: { color: rideTheme.ink, fontSize: 22, fontWeight: "900", textAlign: "center", marginTop: 12 },
  rating: { color: rideTheme.muted, textAlign: "center", marginTop: 4, fontWeight: "800" },
  section: { color: rideTheme.ink, fontWeight: "900", fontSize: 16, marginBottom: 8 },
  value: { color: rideTheme.ink, fontWeight: "800", fontSize: 15 },
  plate: { color: rideTheme.green, fontSize: 24, fontWeight: "900", marginTop: 8 },
});
