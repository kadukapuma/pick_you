import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";

const DELETE_ACCOUNT_URL = "https://picku.lk/driver/delete-account";
const PRIVACY_POLICY_URL = "https://picku.lk/privacy-policy";

const SettingsScreen = ({ navigation }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const appVersion = Constants.expoConfig?.version || "1.0.0";

  const openUrl = (url) => {
    Linking.openURL(url).catch(() => {
      Alert.alert("Unable to open link", "Please try again shortly.");
    });
  };

  const confirmDeleteAccount = () => {
    setShowDeleteModal(false);
    openUrl(DELETE_ACCOUNT_URL);
  };

  const MenuItem = ({ icon, label, value, danger, onPress, isLast }) => (
    <TouchableOpacity
      style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.menuIconContainer,
          danger && { backgroundColor: "#FEF2F2" },
        ]}
      >
        <Feather name={icon} size={20} color={danger ? "#EF4444" : "#64748B"} />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={[styles.menuLabel, danger && { color: "#EF4444" }]}>
          {label}
        </Text>
        {value && <Text style={styles.menuSubValue}>{value}</Text>}
      </View>
      <Feather name="chevron-right" size={20} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={["top"]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 22 }} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="trash-2"
            label="Delete Account"
            danger
            isLast
            onPress={() => setShowDeleteModal(true)}
          />
        </View>

        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="bell"
            label="Manage Notification Permissions"
            isLast
            onPress={() => Linking.openSettings()}
          />
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="shield"
            label="Privacy Policy"
            onPress={() => openUrl(PRIVACY_POLICY_URL)}
          />
          <MenuItem icon="info" label="App Version" value={appVersion} isLast />
        </View>
      </ScrollView>

      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete your account?</Text>
            <Text style={styles.modalMessage}>
              This will open a secure page where you can submit a request to
              permanently delete your PickU Driver account and data.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={confirmDeleteAccount}
              >
                <Text style={styles.modalConfirmText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B" },

  content: { padding: 20, paddingBottom: 60 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 25,
    marginBottom: 15,
  },
  menuGroup: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuTextContainer: { flex: 1 },
  menuLabel: { fontSize: 16, fontWeight: "600", color: "#1E293B" },
  menuSubValue: { fontSize: 13, color: "#64748B", marginTop: 2 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B", marginBottom: 10 },
  modalMessage: { fontSize: 14, color: "#64748B", lineHeight: 20, marginBottom: 20 },
  modalActions: { flexDirection: "row", gap: 12 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  modalCancelText: { color: "#1E293B", fontWeight: "700" },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#EF4444",
    alignItems: "center",
  },
  modalConfirmText: { color: "#FFF", fontWeight: "700" },
});

export default SettingsScreen;
