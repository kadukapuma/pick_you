import React from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

/**
 * BackgroundLocationDisclosureModal
 * 
 * Google Play Policy Compliance Component:
 * This prominent disclosure modal is displayed BEFORE the app requests background location
 * permissions. It clearly explains the purpose of collecting background location:
 * sharing live location with passengers, passenger tracking, ride safety, offline/online navigation, 
 * and driver availability updates. It is shown only when the driver explicitly attempts to 
 * go online, satisfying Google's Prominent Disclosure and Consent requirement.
 */
const BackgroundLocationDisclosureModal = ({
  visible,
  onContinue,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient
            colors={["#00A859", "#007A41"]}
            style={styles.iconCircle}
          >
            <Ionicons name="location-outline" size={32} color="#FFF" />
          </LinearGradient>

          <Text style={styles.title}>Allow Background Location</Text>

          <ScrollView 
            style={styles.scrollContainer} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.messageHeading}>
              PickU Driver collects your location even when the app is running in the background to:
            </Text>

            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  Share your live location with passengers during active rides.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  Allow passengers to track your arrival.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  Improve ride safety.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  Support navigation while you are online.
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  Update your driver availability.
                </Text>
              </View>
            </View>

            <Text style={styles.messageFooter}>
              Your location is only collected while you are online as a driver and is never used for advertising purposes.
            </Text>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={onContinue}
            >
              <LinearGradient
                colors={["#00A859", "#007A41"]}
                style={styles.primaryGradient}
              >
                <Text style={styles.primaryText}>Continue</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.7}
              onPress={onCancel}
            >
              <Text style={styles.secondaryText}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default BackgroundLocationDisclosureModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    maxHeight: "85%",
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 16,
  },
  scrollContainer: {
    width: "100%",
    marginBottom: 20,
  },
  scrollContent: {
    alignItems: "flex-start",
  },
  messageHeading: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    lineHeight: 20,
    marginBottom: 12,
  },
  bulletList: {
    width: "100%",
    paddingLeft: 4,
    marginBottom: 12,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bullet: {
    fontSize: 14,
    color: "#00A859",
    fontWeight: "bold",
    marginRight: 8,
    marginTop: Platform.OS === "ios" ? 1 : 3,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#334155",
    lineHeight: 20,
  },
  messageFooter: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    lineHeight: 18,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 12,
    marginTop: 4,
  },
  buttonContainer: {
    width: "100%",
    gap: 8,
  },
  primaryButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  primaryGradient: {
    minHeight: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    width: "100%",
    minHeight: 50,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  secondaryText: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "700",
  },
});
