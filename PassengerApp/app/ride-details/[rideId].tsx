import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DelayedLoader from "../../components/ui/DelayedLoader";
import RideScreenShell, { RideCard, SecondaryRideButton } from "../../features/ride-support/RideScreenShell";
import { getDriverName, getFareTotal, getRideStatus, getVehicleDescription, getVehicleNumber, rideTheme, statusTitle } from "../../features/ride-support/rideUtils";
import { apiClient } from "../../services/api/client";

export default function RideDetailsScreen() {
  const { rideId, rideData } = useLocalSearchParams<{ rideId?: string; rideData?: string }>();
  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const id = Number(rideId || 0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (rideData) {
        try {
          setRide(JSON.parse(rideData));
        } catch {
          setRide(null);
        }
        setLoading(false);
        return;
      }

      if (!id) {
        setLoading(false);
        return;
      }

      const response = await apiClient.get<any>(`/rides/${id}`, { suppressErrorLog: true });
      if (!cancelled) {
        if (response.success) setRide(response.data);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, rideData]);

  if (loading) {
    return (
      <RideScreenShell title="Ride details" scroll={false}>
        <View style={styles.center}><DelayedLoader label="Loading ride details" delayMs={220} /></View>
      </RideScreenShell>
    );
  }

  if (!ride) {
    return (
      <RideScreenShell title="Ride details">
        <RideCard><Text style={styles.muted}>Ride details are unavailable.</Text></RideCard>
      </RideScreenShell>
    );
  }

  const status = getRideStatus(ride);
  const hasMeta = ride.distance_text || ride.duration_text || ride.payment_method;

  return (
    <RideScreenShell title="Ride details" subtitle={`Trip #${ride.id || id}`}>
      <RideCard>
        <View style={styles.statusRow}>
          <Text style={styles.status}>{statusTitle(status)}</Text>
          <Text style={styles.price}>Rs. {getFareTotal(ride)}</Text>
        </View>
        <View style={styles.line} />
        <Text style={styles.label}>Pickup</Text>
        <Text style={styles.value}>{ride.pickup_address || "Pickup location"}</Text>
        <Text style={styles.label}>Drop-off</Text>
        <Text style={styles.value}>{ride.drop_address || "Destination"}</Text>

        {hasMeta ? (
          <View style={styles.metaGrid}>
            {ride.distance_text ? <InfoBox label="Distance" value={ride.distance_text} /> : null}
            {ride.duration_text ? <InfoBox label="Time" value={ride.duration_text} /> : null}
            {ride.payment_method ? <InfoBox label="Payment" value={ride.payment_method} /> : null}
          </View>
        ) : null}
      </RideCard>

      <RideCard>
        <Text style={styles.section}>Driver and vehicle</Text>
        <Text style={styles.value}>{getDriverName(ride)}</Text>
        <Text style={styles.muted}>{getVehicleDescription(ride)} - {getVehicleNumber(ride)}</Text>
        {ride.issue ? <Text style={styles.issueText}>{ride.issue}</Text> : null}
        <TouchableOpacity style={styles.linkRow} onPress={() => router.push({ pathname: "/ride-tracking/driver-profile", params: { rideData: JSON.stringify(ride) } })}>
          <Ionicons name="person-circle-outline" size={20} color={rideTheme.green} />
          <Text style={styles.linkText}>View driver profile</Text>
        </TouchableOpacity>
      </RideCard>

      <SecondaryRideButton label="View receipt" icon="receipt-outline" onPress={() => router.push({ pathname: "/ride-details/receipt", params: { rideData: JSON.stringify(ride) } })} />
      <SecondaryRideButton label="Help with this ride" icon="help-circle-outline" onPress={() => router.push({ pathname: "/ride-help/[rideId]", params: { rideId: String(id || ride.id) } })} />
    </RideScreenShell>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaBox}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  status: { color: rideTheme.ink, fontSize: 18, fontWeight: "900" },
  price: { color: rideTheme.green, fontSize: 18, fontWeight: "900" },
  line: { height: 1, backgroundColor: rideTheme.line, marginVertical: 14 },
  label: { color: rideTheme.muted, fontSize: 12, fontWeight: "800", marginTop: 8 },
  value: { color: rideTheme.ink, fontSize: 15, fontWeight: "800", marginTop: 3 },
  muted: { color: rideTheme.muted, fontSize: 13, lineHeight: 19 },
  section: { color: rideTheme.ink, fontWeight: "900", fontSize: 16, marginBottom: 8 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  linkText: { color: rideTheme.green, fontWeight: "900" },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  metaBox: { flexGrow: 1, minWidth: "30%", borderRadius: 14, backgroundColor: "#F3FAF7", borderWidth: 1, borderColor: rideTheme.line, padding: 10 },
  metaLabel: { color: rideTheme.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  metaValue: { color: rideTheme.ink, fontSize: 13, fontWeight: "900", marginTop: 3 },
  issueText: { color: "#B45309", fontSize: 13, fontWeight: "800", lineHeight: 19, marginTop: 10 },
});

