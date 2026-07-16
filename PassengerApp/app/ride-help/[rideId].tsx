import { router, useLocalSearchParams } from "expo-router";
import { Alert, StyleSheet, Text, TouchableOpacity } from "react-native";
import RideScreenShell, { RideCard } from "../../features/ride-support/RideScreenShell";
import { rideTheme } from "../../features/ride-support/rideUtils";

const issues = ["Fare issue", "Driver behavior", "Payment issue", "Route issue", "Vehicle issue"];

export default function RideHelpScreen() {
  const { rideId } = useLocalSearchParams<{ rideId?: string }>();
  return (
    <RideScreenShell title="Ride help" subtitle={`Trip #${rideId || ""}`}>
      <RideCard>
        {issues.map((issue) => <TouchableOpacity key={issue} style={styles.issue} onPress={() => Alert.alert(issue, "Support ticket submission can be connected to backend when ready.")}><Text style={styles.issueText}>{issue}</Text></TouchableOpacity>)}
        <TouchableOpacity style={styles.issue} onPress={() => router.push({ pathname: "/ride-help/lost-item", params: { rideId } })}><Text style={styles.issueText}>I lost an item</Text></TouchableOpacity>
      </RideCard>
    </RideScreenShell>
  );
}

const styles = StyleSheet.create({
  issue: { minHeight: 54, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: rideTheme.line },
  issueText: { color: rideTheme.ink, fontWeight: "900" },
});