import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import RideScreenShell, { PrimaryRideButton, RideCard } from "../../features/ride-support/RideScreenShell";
import { rideTheme } from "../../features/ride-support/rideUtils";
import { apiClient } from "../../services/api/client";
import { getFriendlyErrorMessage, logExpectedError } from "../../services/errors/userMessages";
import { useRideSearch } from "../../state/booking/RideBookingContext";

const reasons = ["Driver taking too long", "Wrong pickup location", "Booked by mistake", "Driver asked me to cancel", "Found another ride", "Other"];

export default function CancelReasonScreen() {
  const { rideId } = useLocalSearchParams<{ rideId?: string }>();
  const { activeRideId, resetTrip } = useRideSearch();
  const [reason, setReason] = useState(reasons[0]);
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(false);
  const id = Number(rideId || activeRideId || 0);

  const cancelRide = async () => {
    if (!id || loading) return;

    const finalReason = reason === "Other" ? customReason.trim() : reason;
    if (reason === "Other" && !finalReason) {
      Alert.alert("Reason required", "Please write a reason in the input field.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.delete(`/rides/${id}`, {
        cancel_reason: finalReason,
        cancelled_by: "passenger"
      });
      if (response.success) {
        resetTrip();
        router.replace("/(app)/(tabs)/home");
      } else {
        Alert.alert("Could not cancel ride", getFriendlyErrorMessage(response.message));
      }
    } catch (error) {
      logExpectedError("Ride cancellation failed", error);
      Alert.alert("Could not cancel ride", getFriendlyErrorMessage(error, "Connection problem. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <RideScreenShell title="Cancel ride" subtitle="Tell us why you are cancelling. This helps improve matching and driver quality.">
      <RideCard>
        {reasons.map((item) => (
          <TouchableOpacity key={item} onPress={() => setReason(item)} style={[styles.reason, reason === item && styles.active]}>
            <Text style={[styles.reasonText, reason === item && styles.activeText]}>{item}</Text>
          </TouchableOpacity>
        ))}
        {reason === "Other" && (
          <TextInput
            style={styles.customInput}
            placeholder="Please write your reason here..."
            placeholderTextColor={rideTheme.muted}
            value={customReason}
            onChangeText={setCustomReason}
            multiline
            numberOfLines={3}
          />
        )}
      </RideCard>
      <PrimaryRideButton label={loading ? "Cancelling..." : "Cancel ride"} icon="close-circle-outline" disabled={loading || !id} onPress={cancelRide} />
    </RideScreenShell>
  );
}

const styles = StyleSheet.create({
  reason: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: rideTheme.line, paddingHorizontal: 14, justifyContent: "center", marginBottom: 10 },
  active: { borderColor: rideTheme.danger, backgroundColor: "#FEF2F2" },
  reasonText: { color: rideTheme.ink, fontWeight: "800" },
  activeText: { color: rideTheme.danger },
  customInput: {
    borderWidth: 1,
    borderColor: rideTheme.line,
    borderRadius: 14,
    padding: 12,
    minHeight: 80,
    color: rideTheme.ink,
    textAlignVertical: "top",
    marginTop: 5,
    marginBottom: 10,
    fontSize: 14,
  },
});

