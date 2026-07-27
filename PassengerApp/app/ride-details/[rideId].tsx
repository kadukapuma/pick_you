import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import DelayedLoader from "../../components/ui/DelayedLoader";
import RideReceiptDetails from "../../features/ride-support/RideReceiptDetails";
import RideScreenShell, { RideCard } from "../../features/ride-support/RideScreenShell";
import { apiClient } from "../../services/api/client";

const parseRideData = (value?: string) => {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export default function RideDetailsScreen() {
  const { rideId, rideData } = useLocalSearchParams<{ rideId?: string; rideData?: string }>();
  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const id = Number(rideId || 0);

  useEffect(() => {
    let cancelled = false;
    const initialRide = parseRideData(rideData);

    if (initialRide) {
      setRide(initialRide);
      setLoading(false);
    } else {
      setRide(null);
      setLoading(true);
    }

    async function loadFullRide() {
      if (!id) {
        if (!initialRide && !cancelled) setLoading(false);
        return;
      }

      const response = await apiClient.get<any>(`/rides/${id}`, { suppressErrorLog: true });
      if (!cancelled) {
        if (response.success && response.data) {
          setRide((current: any) => ({ ...(current || {}), ...response.data }));
        }
        setLoading(false);
      }
    }

    loadFullRide();
    return () => {
      cancelled = true;
    };
  }, [id, rideData]);

  if (loading && !ride) {
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

  return <RideReceiptDetails ride={ride} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { color: "#64748B", fontSize: 13, lineHeight: 19 },
});
