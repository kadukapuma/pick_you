import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ProfileScreen = ({ navigation, setIsLoggedIn }) => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const user = {
    name: "John Driver",
    email: "ayeshanthoythasan@gmail.com",
    trips: 247,
    rating: 4.9,
    acceptance: "94%",
    cancellation: "2%",
    vehicle: { plateNumber: "Not set" },
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    // Clear your local storage/auth state here
    try {
      await AsyncStorage.removeItem("userToken");
    } catch (e) {
      console.log("Error clearing token on logout:", e);
    }
    if (setIsLoggedIn) {
      setIsLoggedIn(false);
    }
  };

  const StatBox = ({ label, value }) => (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  const MenuItem = ({ icon, label, value, showBadge, onPress, isLast }) => (
    <TouchableOpacity
      style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuIconContainer}>
        <Feather name={icon} size={20} color="#64748B" />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuLabel}>{label}</Text>
        {value && <Text style={styles.menuSubValue}>{value}</Text>}
      </View>
      {showBadge && (
        <View style={styles.badge}>
          <Feather name="check" size={12} color="#16A34A" />
          <Text style={styles.badgeText}>Verified</Text>
        </View>
      )}
      <Feather name="chevron-right" size={20} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" />

      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {/* Header Section - Updated to Green Gradient */}
        <LinearGradient
          colors={["#00A859", "#007A41"]}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={["top"]}>
            <View style={styles.profileHeader}>
              <LinearGradient
                colors={["#A855F7", "#EC4899"]}
                style={styles.avatarCircle}
              >
                <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
              </LinearGradient>

              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons
                    name="star"
                    size={18}
                    color="#FACC15"
                  />
                  <Text style={styles.ratingText}> {user.rating}</Text>
                  <Text style={styles.tripsCount}> ({user.trips} trips)</Text>
                </View>
              </View>
            </View>

            <View style={styles.statsContainer}>
              <StatBox label="Acceptance" value={user.acceptance} />
              <StatBox label="Cancellation" value={user.cancellation} />
              <StatBox label="Rating" value={user.rating} />
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="user"
              label="Personal Info"
              value={user.email}
              onPress={() => navigation.navigate("EditProfile")}
            />
            <MenuItem
              icon="truck"
              label="Vehicle Details"
              value={user.vehicle.plateNumber}
              onPress={() => navigation.navigate("EditVehicle")}
            />
            <MenuItem
              icon="file-text"
              label="Documents"
              value="Verified"
              showBadge
              onPress={() => navigation.navigate("Documents")}
              isLast
            />
          </View>

          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="settings"
              label="Settings"
              onPress={() => navigation.navigate("Settings")}
              isLast
            />
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => setShowLogoutModal(true)}
            activeOpacity={0.8}
          >
            <Feather name="log-out" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modern Custom Sign Out Modal */}
      <Modal visible={showLogoutModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconBg}>
              <Feather name="log-out" size={30} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalSubTitle}>
              Are you sure you want to sign out of your account?
            </Text>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelBtnText}>No</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={confirmLogout}
              >
                <Text style={styles.confirmBtnText}>Yes, Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#F8FAFC" },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 25,
  },
  avatarCircle: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#FFF", fontSize: 28, fontWeight: "800" },
  profileInfo: { marginLeft: 15, flex: 1 },
  userName: { color: "#FFF", fontSize: 24, fontWeight: "700", marginBottom: 4 },
  ratingText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  tripsCount: { color: "rgba(255,255,255,0.7)", fontSize: 14 },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  statLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginBottom: 4 },
  statValue: { color: "#FFF", fontSize: 18, fontWeight: "800" },

  content: { padding: 20, paddingBottom: 120 },
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
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 8,
  },
  badgeText: {
    color: "#16A34A",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    marginTop: 40,
    padding: 18,
    borderRadius: 16,
    gap: 10,
  },
  logoutText: { color: "#EF4444", fontSize: 16, fontWeight: "700" },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  modalIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
  },
  modalSubTitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalActionRow: { flexDirection: "row", gap: 12 },
  modalBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: { backgroundColor: "#F1F5F9" },
  cancelBtnText: { color: "#64748B", fontWeight: "700", fontSize: 16 },
  confirmBtn: { backgroundColor: "#EF4444" },
  confirmBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
});
