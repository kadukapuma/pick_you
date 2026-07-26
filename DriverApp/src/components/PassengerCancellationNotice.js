import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { usePassengerCancellationWatcher } from "../hooks/usePassengerCancellationWatcher";

export default function PassengerCancellationNotice({
  rideId,
  navigation,
  customerName = "Passenger",
}) {
  const { visible, acknowledgeCancellation } =
    usePassengerCancellationWatcher(rideId, navigation);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient
            colors={["#0A2E2B", "#0F1E21"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.iconFrame}>
              <Ionicons name="close-circle" size={38} color="#FFFFFF" />
            </View>
            <Text style={styles.eyebrow}>TRIP UPDATE</Text>
            <Text style={styles.title}>Ride cancelled</Text>
          </LinearGradient>

          <View style={styles.body}>
            <Text style={styles.message}>
              {customerName} has cancelled this ride.
            </Text>
            <Text style={styles.detail}>
              Your active trip has been cleared. You can return to the home
              screen and continue receiving new ride requests.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.88}
              onPress={acknowledgeCancellation}
            >
              <Text style={styles.primaryText}>Back to Home</Text>
              <View style={styles.primaryIcon}>
                <Ionicons name="arrow-forward" size={19} color="#00A859" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.68)",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 24,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 24,
  },
  iconFrame: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 5,
    borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 14,
  },
  eyebrow: {
    color: "#00A859",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 5,
    letterSpacing: 0,
  },
  body: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 24,
    alignItems: "center",
  },
  message: {
    color: "#0F172A",
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
  },
  detail: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
    marginTop: 9,
  },
  primaryButton: {
    width: "100%",
    height: 56,
    borderRadius: 18,
    backgroundColor: "#00A859",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    position: "relative",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  primaryIcon: {
    position: "absolute",
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
});
