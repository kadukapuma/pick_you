import React from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const MODAL_CONFIG = {
  success: {
    icon: "check",
    colors: ["#00A859", "#007A41"],
    softBg: "#F0FDF4",
    text: "#166534",
  },
  error: {
    icon: "alert-circle",
    colors: ["#EF4444", "#B91C1C"],
    softBg: "#FEF2F2",
    text: "#991B1B",
  },
  warning: {
    icon: "alert-triangle",
    colors: ["#F59E0B", "#B45309"],
    softBg: "#FFFBEB",
    text: "#92400E",
  },
};

const ThemedFeedbackModal = ({
  visible,
  type = "success",
  title,
  message,
  primaryLabel = "OK",
  onPrimary,
  onClose,
}) => {
  const config = MODAL_CONFIG[type] || MODAL_CONFIG.success;
  const handlePress = onPrimary || onClose;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient colors={config.colors} style={styles.iconCircle}>
            <Feather name={config.icon} size={30} color="#FFF" />
          </LinearGradient>

          <Text style={styles.title}>{title}</Text>
          <View style={[styles.messageBox, { backgroundColor: config.softBg }]}>
            <Text style={[styles.message, { color: config.text }]}>{message}</Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={handlePress}
          >
            <LinearGradient colors={config.colors} style={styles.primaryGradient}>
              <Text style={styles.primaryText}>{primaryLabel}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ThemedFeedbackModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  messageBox: {
    width: "100%",
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
  },
  message: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "center",
  },
  primaryButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 18,
  },
  primaryGradient: {
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "900",
  },
});
