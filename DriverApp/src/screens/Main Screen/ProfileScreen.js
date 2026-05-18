import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import KeyboardAwareWrapper from "../../components/KeyboardAwareWrapper";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MotiView, MotiText } from "moti";
import api from "../../services/api";

const ProfileScreen = ({ setIsLoggedIn, setIsNewUser, setDriverStatus }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const BRAND_GREEN = "#00A859";

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get("/user");
      setUser(response.data);
    } catch (error) {
      console.log("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("userToken");
              await AsyncStorage.removeItem("profileFormData");
              await AsyncStorage.removeItem("vehicleFormData");
              setDriverStatus?.(null);
              setIsNewUser?.(false);
              setIsLoggedIn(false);
            } catch (error) {
              console.log("Logout error:", error);
            }
          },
        },
      ]
    );
  };

  const ProfileItem = ({ icon, title, value, color = "#FFF" }) => (
    <View style={styles.itemContainer}>
      <View style={[styles.iconBox, { backgroundColor: color + "15" }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <View style={styles.itemTextContent}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemValue}>{value || "Not Set"}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <KeyboardAwareWrapper contentContainerStyle={styles.scrollContent}>
        {/* HEADER */}
        <MotiView
          from={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user?.first_name?.[0] || "D"}
              </Text>
            </View>
            <View style={styles.statusDot} />
          </View>

          <MotiText
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 200 }}
            style={styles.userName}
          >
            {user?.first_name} {user?.last_name}
          </MotiText>
          <Text style={styles.userRole}>Professional Driver</Text>
        </MotiView>

        {/* STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>4.8</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>152</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>2y</Text>
            <Text style={styles.statLabel}>Exp</Text>
          </View>
        </View>

        {/* INFO SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.card}>
            <ProfileItem icon="phone" title="Phone Number" value={user?.phone} color={BRAND_GREEN} />
            <View style={styles.divider} />
            <ProfileItem icon="mail" title="Email Address" value={user?.email} color="#3B82F6" />
            <View style={styles.divider} />
            <ProfileItem icon="map-pin" title="Address" value={user?.driver?.address} color="#F59E0B" />
          </View>
        </View>

        {/* ACCOUNT SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <Feather name="shield" size={18} color="#94A3B8" />
                <Text style={styles.menuText}>Security & Privacy</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#475569" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <Feather name="help-circle" size={18} color="#94A3B8" />
                <Text style={styles.menuText}>Help & Support</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout from Account</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.4 (Build 45)</Text>
      </KeyboardAwareWrapper>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 25,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 15,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#1E293B",
    borderWidth: 2,
    borderColor: "#00A859",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "900",
  },
  statusDot: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#22C55E",
    borderWidth: 3,
    borderColor: "#0F172A",
  },
  userName: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  userRole: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 15,
    paddingHorizontal: 25,
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: "#1E293B",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 16,
    alignItems: "center",
    minWidth: 90,
  },
  statValue: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 25,
    marginBottom: 25,
  },
  sectionTitle: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 5,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  itemTextContent: {
    flex: 1,
  },
  itemTitle: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  itemValue: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginVertical: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuText: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 15,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    marginHorizontal: 25,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    marginTop: 10,
    marginBottom: 20,
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "800",
    marginLeft: 10,
  },
  versionText: {
    color: "#475569",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
});

export default ProfileScreen;
