import { Ionicons } from "@expo/vector-icons";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getPassengerRideStatusUI } from "./passengerRideStatus";

type RideEventModalProps = {
  visible: boolean;
  status: string | null;
  paymentStatus?: string | null;
  cancelledBy?: string | null;
  onClose: () => void;
  onPrimary?: () => void;
  primaryLabel?: string;
};

const toneColors = {
  green: "#20B768",
  blue: "#2563EB",
  gold: "#B7791F",
  red: "#DC2626",
  muted: "#64748B",
};

export default function RideEventModal({
  visible,
  status,
  paymentStatus,
  cancelledBy,
  onClose,
  onPrimary,
  primaryLabel,
}: RideEventModalProps) {
  const ui = getPassengerRideStatusUI(status, paymentStatus);
  const color = toneColors[ui.tone];

  let title = ui.title;
  let message = ui.message;

  if (status?.toUpperCase() === "CANCELLED" || status?.toUpperCase() === "CANCELED") {
    if (cancelledBy === "driver") {
      title = "Driver Cancelled";
      message = "Unfortunately, the driver has cancelled the ride.";
    } else if (cancelledBy === "passenger") {
      title = "Ride Cancelled";
      message = "You have cancelled this ride.";
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
            <Ionicons name={ui.icon} size={34} color={color} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>


          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: color }]}
            activeOpacity={0.88}
            onPress={onPrimary || onClose}
          >
            <Text style={styles.primaryText}>
              {primaryLabel || (status?.toUpperCase() === "COMPLETED" ? "View fare" : "Continue")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.62)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(153,177,169,0.35)",
    backgroundColor: "#F2FBF8",
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    color: "#0B3D2E",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0,
  },
  message: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
  primaryButton: {
    marginTop: 16,
    width: "100%",
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});
