import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ThemeButton from "../../../../components/ui/ThemeButton";

const DELETE_ACCOUNT_URL = "https://picku.lk/passenger/delete-account";
const PRIVACY_POLICY_URL = "https://picku.lk/passenger/privacy-policy";

function SettingsRow({
  icon,
  label,
  value,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons name={icon} size={20} color={danger ? "#DC2626" : "#063D31"} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#B7C6C0" />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const appVersion = Constants.expoConfig?.version || "1.0.0";

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert("Unable to open link", "Please try again shortly.");
    });
  };

  const confirmDeleteAccount = () => {
    setShowDeleteModal(false);
    openUrl(DELETE_ACCOUNT_URL);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={22} color="#063D31" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.group}>
          <SettingsRow
            icon="trash-outline"
            label="Delete Account"
            danger
            onPress={() => setShowDeleteModal(true)}
          />
        </View>

        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.group}>
          <SettingsRow
            icon="notifications-outline"
            label="Manage Notification Permissions"
            onPress={() => Linking.openSettings()}
          />
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.group}>
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => openUrl(PRIVACY_POLICY_URL)}
          />
          <SettingsRow icon="information-circle-outline" label="App Version" value={appVersion} />
        </View>
      </ScrollView>

      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete your account?</Text>
            <Text style={styles.modalMessage}>
              This will open a secure page where you can submit a request to
              permanently delete your PickU account and data.
            </Text>
            <View style={styles.modalActions}>
              <ThemeButton
                label="Cancel"
                variant="ghost"
                onPress={() => setShowDeleteModal(false)}
                style={{ flex: 1 }}
              />
              <ThemeButton
                label="Continue"
                variant="danger"
                onPress={confirmDeleteAccount}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3FAF7" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#F3FAF7",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(221,235,229,0.85)",
  },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#063D31" },

  content: { padding: 20, paddingBottom: 60 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#063D31",
    marginTop: 20,
    marginBottom: 10,
  },
  group: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(221,235,229,0.85)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(221,235,229,0.6)",
    gap: 12,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EAF6F0",
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconDanger: { backgroundColor: "rgba(220,38,38,0.08)" },
  rowLabel: { fontSize: 15, fontWeight: "700", color: "#063D31" },
  rowLabelDanger: { color: "#DC2626" },
  rowValue: { fontSize: 12, color: "#64746E", marginTop: 2 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(6,61,49,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#063D31", marginBottom: 10 },
  modalMessage: { fontSize: 14, color: "#64746E", lineHeight: 20, marginBottom: 20 },
  modalActions: { flexDirection: "row", gap: 12 },
});
