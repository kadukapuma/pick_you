import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import RideScreenShell, { PrimaryRideButton, RideCard, SecondaryRideButton } from "../../features/ride-support/RideScreenShell";
import { rideTheme } from "../../features/ride-support/rideUtils";
import { useRideSearch } from "../../state/booking/RideBookingContext";

const options = [15, 30, 60, 120];

export default function ScheduleRideScreen() {
  const { scheduledAt, setScheduledAt } = useRideSearch();
  const [selected, setSelected] = useState<number | null>(null);
  const selectedTime = useMemo(() => {
    if (!selected) return null;
    const date = new Date(Date.now() + selected * 60 * 1000);
    return date.toISOString();
  }, [selected]);
  return (
    <RideScreenShell title="Schedule ride" subtitle="Plan a pickup time. Current backend booking remains instant until scheduled rides are supported server-side.">
      <RideCard>
        <Text style={styles.heading}>Pickup time</Text>
        <View style={styles.grid}>{options.map((mins) => <TouchableOpacity key={mins} onPress={() => setSelected(mins)} style={[styles.option, selected === mins && styles.activeOption]}><Text style={[styles.optionText, selected === mins && styles.activeText]}>{mins < 60 ? `${mins} min` : `${mins / 60} hr`}</Text></TouchableOpacity>)}</View>
        <Text style={styles.current}>{scheduledAt ? `Selected: ${new Date(scheduledAt).toLocaleString()}` : "No scheduled time selected"}</Text>
      </RideCard>
      <PrimaryRideButton label="Save schedule" icon="time-outline" disabled={!selectedTime} onPress={() => { setScheduledAt(selectedTime); router.back(); }} />
      {scheduledAt ? <SecondaryRideButton label="Clear schedule" icon="close-circle-outline" danger onPress={() => setScheduledAt(null)} /> : null}
    </RideScreenShell>
  );
}

const styles = StyleSheet.create({
  heading: { color: rideTheme.ink, fontSize: 16, fontWeight: "900", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  option: { width: "47%", minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: rideTheme.line, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  activeOption: { borderColor: rideTheme.green, backgroundColor: rideTheme.softGreen },
  optionText: { color: rideTheme.ink, fontWeight: "900" },
  activeText: { color: rideTheme.green },
  current: { color: rideTheme.muted, marginTop: 14, fontSize: 12 },
});