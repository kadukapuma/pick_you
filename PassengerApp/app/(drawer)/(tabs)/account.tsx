import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import HomeHeader from "../../components/home/HomeHeader";
import { useAuth } from "../../hooks/useAuth";

export default function AccountScreen() {
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/(auth)/signin");
          } catch (error) {
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-[#F4FBFF] px-5 pt-12">
      <HomeHeader />

      <View className="flex-1 items-center justify-center">
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          </View>

          <Text style={styles.title}>Sign out of your account</Text>
          <Text style={styles.subtitle}>
            You will need to sign in again to access your passenger account.
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 26,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    width: "100%",
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: "#FFF1F2",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    marginBottom: 14,
    width: 52,
  },
  title: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    textAlign: "center",
  },
  logoutButton: {
    alignItems: "center",
    backgroundColor: "#EF4444",
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 20,
    paddingVertical: 14,
    width: "100%",
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
