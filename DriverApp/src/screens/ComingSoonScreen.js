import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { MotiText, MotiView } from "moti";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ComingSoonScreen = ({ navigation, setIsLoggedIn, setDriverStatus, setIsNewUser }) => {
  const handleLogout = () => {
    setDriverStatus?.(null);
    setIsNewUser?.(false);
    setIsLoggedIn?.(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.topRow}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Feather name="log-out" size={18} color="#E2E8F0" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <MotiView
          from={{ opacity: 0.5, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1.04 }}
          transition={{ type: "timing", duration: 1800, loop: true, repeatReverse: true }}
          style={styles.glow}
        />

        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="rocket-launch-outline" size={42} color="#FDE047" />
        </View>

        <MotiText
          from={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.title}
        >
          Coming Soon
        </MotiText>

        <Text style={styles.subtitle}>
          Your driver account is approved. The full dashboard experience is being prepared and will be available soon.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Feather name="check-circle" size={18} color="#00A859" />
            <Text style={styles.cardText}>Verification complete</Text>
          </View>
          <View style={styles.cardRow}>
            <Feather name="clock" size={18} color="#FDE047" />
            <Text style={styles.cardText}>Main app is under preparation</Text>
          </View>
          <View style={styles.cardRow}>
            <Feather name="bell" size={18} color="#94A3B8" />
            <Text style={styles.cardText}>We will notify you when it is ready</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.9}
          onPress={() => navigation?.replace?.("Verification")}
        >
          <Text style={styles.secondaryBtnText}>Back to Status</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ComingSoonScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1220",
  },
  topRow: {
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: "flex-end",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  logoutText: {
    color: "#E2E8F0",
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(253, 224, 71, 0.08)",
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(253, 224, 71, 0.28)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 14,
    marginBottom: 24,
    maxWidth: 320,
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.16)",
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardText: {
    color: "#E2E8F0",
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  secondaryBtn: {
    marginTop: 22,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  secondaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
