import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { MotiText, MotiView } from "moti";
import React, { useEffect } from "react";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchMaintenanceMode } from "../services/appSettings";

const ComingSoonScreen = ({
  navigation,
  setIsLoggedIn,
  setDriverStatus,
  setIsNewUser,
  onMaintenanceDisabled
}) => {
  const handleLogout = () => {
    setDriverStatus?.(null);
    setIsNewUser?.(false);
    setIsLoggedIn?.(false);
  };

  const BRAND_GREEN = "#00A859";

  // This screen can render outside NavigationContainer during maintenance mode,
  // so useEffect is safer than useFocusEffect here.
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const result = await fetchMaintenanceMode();
        if (!result.maintenanceMode) {
          if (onMaintenanceDisabled) {
            onMaintenanceDisabled();
          } else {
            navigation?.replace?.("MainTabs");
          }
        }
      } catch (error) {
        console.error('Error checking maintenance mode:', error);
      }
    };

    checkMaintenance();
  }, [navigation, onMaintenanceDisabled]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header Row with Construction Accents */}
      <View style={styles.topRow}>
        <MotiView
          from={{ translateX: -10 }}
          animate={{ translateX: 10 }}
          transition={{ type: "timing", duration: 2500, loop: true, repeatReverse: true }}
          style={styles.constructionStripes}
        />
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Feather name="log-out" size={18} color="#E2E8F0" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Subdued ambient pulsing glow ring instead of bright popping green */}
        <MotiView
          from={{ opacity: 0.3, scale: 0.9 }}
          animate={{ opacity: 0.7, scale: 1.15 }}
          transition={{ type: "timing", duration: 2200, loop: true, repeatReverse: true }}
          style={styles.glow}
        />

        {/* Central Vehicle & Construction Animation Centerpiece */}
        <View style={styles.animationContainer}>
          <MotiView
            from={{ rotate: "0deg" }}
            animate={{ rotate: "360deg" }}
            transition={{ type: "timing", duration: 12000, loop: true, ease: "linear" }}
            style={styles.outerGearRing}
          >
            {[...Array(4)].map((_, idx) => (
              <View key={idx} style={[styles.gearNotch, { transform: [{ rotate: `${idx * 45}deg` }] }]} />
            ))}
          </MotiView>

          <View style={styles.iconWrap}>
            <MotiView
              from={{ translateX: -16, opacity: 0.7 }}
              animate={{ translateX: 16, opacity: 1 }}
              transition={{ type: "timing", duration: 1800, loop: true, repeatReverse: true }}
            >
              {/* Car model keeps the clean brand identity color */}
              <MaterialCommunityIcons name="car-sports" size={44} color={BRAND_GREEN} />
            </MotiView>
          </View>

          {/* Miniature construction barrier indicators */}
          <MotiView
            from={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ type: "timing", duration: 800, loop: true, repeatReverse: true }}
            style={[styles.blinkingLight, { top: 0, left: 10 }]}
          />
          <MotiView
            from={{ opacity: 1 }}
            animate={{ opacity: 0.4 }}
            transition={{ type: "timing", duration: 800, loop: true, repeatReverse: true }}
            style={[styles.blinkingLight, { bottom: 6, right: 10 }]}
          />
        </View>

        <MotiText
          from={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.title}
        >
          App Under Construction
        </MotiText>

        <Text style={styles.subtitle}>
          Your driver account is approved! We are custom engineering your dashboard. The premium experience will launch shortly.
        </Text>

        {/* Status Tracker Box */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Feather name="check-circle" size={18} color={BRAND_GREEN} />
            <Text style={styles.cardText}>Driver credential verification complete</Text>
          </View>
          <View style={styles.cardRow}>
            <MaterialCommunityIcons name="crane" size={18} color="#FDE047" />
            <Text style={styles.cardText}>Environment setup & terminal allocation</Text>
          </View>
          <View style={styles.cardRow}>
            <Feather name="bell" size={18} color="#94A3B8" />
            <Text style={styles.cardText}>Push notifications will alert you live</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.9}
          onPress={() => {
            if (navigation) {
              navigation.replace("Verification");
            } else if (onMaintenanceDisabled) {
              onMaintenanceDisabled();
            }
          }}
        >
          <Text style={styles.secondaryBtnText}>Check Status</Text>
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
    paddingTop: 12,
    alignItems: "flex-end",
    position: "relative",
    height: 60,
    justifyContent: "center",
  },
  constructionStripes: {
    position: "absolute",
    left: -40,
    top: 24,
    width: "150%",
    height: 4,
    backgroundColor: "rgba(253, 224, 71, 0.08)",
    transform: [{ rotate: "-2deg" }],
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    zIndex: 10,
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
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(253, 224, 71, 0.03)",
  },
  animationContainer: {
    width: 130,
    height: 130,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    position: "relative",
  },
  outerGearRing: {
    position: "absolute",
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(253, 224, 71, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  gearNotch: {
    position: "absolute",
    width: 124,
    height: 6,
    backgroundColor: "transparent",
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(253, 224, 71, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  blinkingLight: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 14,
    marginBottom: 32,
    maxWidth: 320,
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardText: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 12,
    flex: 1,
  },
  secondaryBtn: {
    marginTop: 28,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  secondaryBtnText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "700",
  },
});
