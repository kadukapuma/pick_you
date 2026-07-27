import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import DelayedLoader from "../../components/ui/DelayedLoader";
import RideReceiptDetails from "../../features/ride-support/RideReceiptDetails";
import RideScreenShell, { RideCard } from "../../features/ride-support/RideScreenShell";
import { apiClient } from "../../services/api/client";

const parseRideData = (value?: string) => {
  if (!value) return {};

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

export default function RideReceiptScreen() {
  const { rideData } = useLocalSearchParams<{ rideData?: string }>();
  const [ride, setRide] = useState<any>(() => parseRideData(rideData));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const initialRide = parseRideData(rideData);
    const id = Number(initialRide?.id || 0);

    setRide(initialRide);

    async function loadFullRide() {
      if (!id) return;

      setLoading(true);
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
  }, [rideData]);

  if (loading && !ride?.id) {
    return (
      <RideScreenShell title="Receipt" scroll={false}>
        <View style={styles.center}><DelayedLoader label="Loading receipt" delayMs={220} /></View>
      </RideScreenShell>
    );
  }

  if (!ride || Object.keys(ride).length === 0) {
    return (
      <RideScreenShell title="Receipt">
        <RideCard><Text style={styles.muted}>Receipt details are unavailable.</Text></RideCard>
      </RideScreenShell>
    );
  }

  return <RideReceiptDetails ride={ride} initialTab="receipt" />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { color: "#64748B", fontSize: 13, lineHeight: 19 },
});
