import { Ionicons } from "@expo/vector-icons";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { router } from "expo-router";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../hooks/useAuth";

type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  route?: string;
};

function MenuItem({ icon, title, route }: MenuItemProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        if (route) router.push(route as never);
      }}
      style={styles.menuItem}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={19} color="#22B36A" />
      </View>

      <Text style={styles.menuTitle}>{title}</Text>

      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

export default function CustomDrawerContent(props: any) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", onPress: () => {}, style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          try {
            await logout();
            router.replace("/(auth)/signin");
          } catch (error) {
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
        style: "destructive",
      },
    ]);
  };
  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{
        flex: 1,
        paddingTop: 6,
        paddingHorizontal: 18,
        paddingBottom: 18,
        backgroundColor: "white",
      }}
    >
      {/* Header */}
      <View style={styles.logoWrap}>
        <View style={styles.logoBox}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={{
              width: 142,
              height: 74,
            }}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* User Card */}
      <View style={styles.userCard}>
        <View className="flex-row items-center">
          <View style={styles.avatar}>
            <Ionicons name="person-outline" size={23} color="#22B36A" />
          </View>

          <View className="flex-1">
            <Text style={styles.userTitle}>
              {user ? `${user.first_name} ${user.last_name}` : "Welcome Back"}
            </Text>
            <Text style={styles.userSubtitle}>
              {user ? user.email : "Manage your account"}
            </Text>
          </View>
        </View>
      </View>

      <MenuItem
        icon="home-outline"
        title="Home"
        route="/(drawer)/(tabs)/home"
      />
      <MenuItem
        icon="person-outline"
        title="Account"
        route="/(drawer)/(tabs)/account"
      />
      <MenuItem
        icon="notifications-outline"
        title="Notifications"
        route="/(drawer)/(tabs)/notification"
      />
      <MenuItem
        icon="scan-outline"
        title="Scan"
        route="/(drawer)/(tabs)/scan"
      />
      <MenuItem
        icon="time-outline"
        title="Activities"
        route="/(drawer)/(tabs)/activities"
      />
      <MenuItem icon="help-circle-outline" title="Help Center" />

      <View className="flex-1" />

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleLogout}
        style={styles.logoutButton}
      >
        <Ionicons name="log-out-outline" size={19} color="#EF4444" />

        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  logoWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoBox: {
    alignItems: "center",
    height: 78,
    justifyContent: "center",
    marginTop: 10,
    width: 128,
  },
  userCard: {
    backgroundColor: "#22B36A",
    borderRadius: 22,
    marginBottom: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    marginRight: 12,
    width: 44,
  },
  userTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  userSubtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  menuItem: {
    alignItems: "center",
    borderBottomColor: "#F3F4F6",
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 58,
    paddingVertical: 8,
  },
  menuIcon: {
    alignItems: "center",
    backgroundColor: "#E8FAF0",
    borderRadius: 15,
    height: 38,
    justifyContent: "center",
    marginRight: 12,
    width: 38,
  },
  menuTitle: {
    color: "#1F2937",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  logoutButton: {
    alignItems: "center",
    backgroundColor: "#FFF1F2",
    borderRadius: 20,
    elevation: 4,
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
    marginTop: 16,
    paddingVertical: 13,
    shadowColor: "#EF4444",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 7,
  },
});
