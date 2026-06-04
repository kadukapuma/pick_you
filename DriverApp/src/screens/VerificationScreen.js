import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { MotiText, MotiView } from "moti";
import { useEffect, useState } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LottieView from "lottie-react-native"; 
import api from "../services/api";
import createEchoInstance from "../services/echo";

const VerificationStatusScreen = ({ navigation, setIsLoggedIn, setDriverStatus, setIsNewUser }) => {
  /* =========================
      BRAND COLORS
  ========================= */
  const BRAND_GREEN = "#00A859";
  const BRAND_YELLOW = "#FDE047";
  const BRAND_RED = "#EF4444";
  const DARK_BG = "#0B1220";

  /* =========================
      STATES
  ========================= */
  const [verificationStatus, setVerificationStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false); // New state to handle loading after approval click
  const [driver, setDriver] = useState(null);

  useEffect(() => {
    fetchStatus();
    setupEcho();

    const unsubscribe = navigation?.addListener?.("focus", () => {
      fetchStatus();
    });

    return () => {
      unsubscribe?.();
    };
  }, [navigation]);

  const setupEcho = async () => {
    try {
      console.log("Initializing Echo connection...");
      const echo = await createEchoInstance();
      console.log("Echo instance created successfully");

      const response = await api.get("/user");
      const currentDriverId = response.data?.driver?.id;

      if (!currentDriverId) {
        console.log("No driver ID found");
        return;
      }

      console.log("Subscribing to admin.dashboard channel for driver:", currentDriverId);

      echo.channel("admin.dashboard")
        .listen(".DashboardUpdated", (e) => {
          console.log("Real-time update received:", e);
          if (e.event === "driver.status" && e.data.driver_id === currentDriverId) {
            const newStatus = e.data.status?.toLowerCase();
            if (newStatus === "approved") {
              setVerificationStatus("approved");
            } else if (newStatus === "rejected") {
              setVerificationStatus("rejected");
            }
          }
        });

      return () => {
        echo.leaveChannel("admin.dashboard");
      };
    } catch (error) {
      console.error("Echo setup error:", error.message || error);
      console.error("Error details:", error);
    }
  };

  const handleLogout = async () => {
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
  };

  const fetchStatus = async () => {
    try {
      const response = await api.get("/user");
      const drv = response.data?.driver;
      if (drv) {
        setDriver(drv);
        setVerificationStatus(drv.status?.toLowerCase() || "pending");
      }
    } catch (error) {
      console.log("Error fetching driver status:", error);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
      STATE EFFECTS
  ========================= */
  useEffect(() => {
    // Other effects can go here if needed
  }, [verificationStatus]);

  /* =========================
      STATUS CONFIG
  ========================= */
  const currentStatus = verificationStatus?.toLowerCase() || "pending";

  const statusConfig = {
    pending: {
      title: "Verification in Progress",
      subtitle:
        "We are reviewing your documents. This usually takes 24-48 hours.",
      icon: "clock",
      color: BRAND_YELLOW,
      buttonText: "Waiting For Approval",
      buttonDisabled: true,
      docStatus: "In Review",
      docIsComplete: false,
      docIsRejected: false,
      nextStepIcon: "information-outline",
      nextStepTitle: "What's Next?",
      nextStepText: "You will receive an email notification once your documents have been verified and your account is approved. This usually takes 24-48 hours.",
      nextStepBoxBorder: "rgba(255,255,255,0.08)",
      nextStepBoxBg: "rgba(255,255,255,0.05)",
      nextStepTitleColor: "#FFF"
    },

    approved: {
      title: "Account Approved",
      subtitle:
        "Your documents have been verified successfully. You can now use the app.",
      icon: "check-circle",
      color: BRAND_GREEN,
      buttonText: "Open App",
      buttonDisabled: false,
      docStatus: "Approved",
      docIsComplete: true,
      docIsRejected: false,
      nextStepIcon: "check-circle",
      nextStepTitle: "Account Active!",
      nextStepText: "Your account is now fully verified and active. You're ready to start receiving ride requests. Get ready to drive!",
      nextStepBoxBorder: "rgba(0,168,89,0.3)",
      nextStepBoxBg: "rgba(0,168,89,0.08)",
      nextStepTitleColor: BRAND_GREEN
    },

    rejected: {
      title: "Verification Rejected",
      subtitle:
        "Some of your documents were rejected. Please re-upload valid documents.",
      icon: "x-circle",
      color: BRAND_RED,
      buttonText: "Upload Again",
      buttonDisabled: false,
      docStatus: "Rejected",
      docIsComplete: false,
      docIsRejected: true,
      nextStepIcon: "alert-circle",
      nextStepTitle: "Action Required",
      nextStepText: "Some of your documents did not meet our requirements. Please review and re-upload clear, valid documents to resubmit your application.",
      nextStepBoxBorder: "rgba(239,68,68,0.3)",
      nextStepBoxBg: "rgba(239,68,68,0.08)",
      nextStepTitleColor: BRAND_RED
    },
  };

  const current = statusConfig[currentStatus] || statusConfig.pending;

  /* =========================
      STATUS ITEM COMPONENT
  ========================= */
  const StatusItem = ({
    title,
    status,
    isComplete,
    isRejected,
    index,
  }) => (
    <MotiView
      from={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 300 + index * 100 }}
      style={styles.statusCard}
    >
      <View style={styles.statusLeft}>
        <View
          style={[
            styles.statusIconCircle,
            {
              borderColor: isRejected
                ? BRAND_RED
                : isComplete
                  ? BRAND_GREEN
                  : BRAND_YELLOW,
            },
          ]}
        >
          <Feather
            name={
              isRejected
                ? "x"
                : isComplete
                  ? "check"
                  : "clock"
            }
            size={16}
            color={
              isRejected
                ? BRAND_RED
                : isComplete
                  ? BRAND_GREEN
                  : BRAND_YELLOW
            }
          />
        </View>
        <Text style={styles.statusTitle}>{title}</Text>
      </View>
      <Text
        style={[
          styles.statusLabel,
          {
            color: isRejected ? BRAND_RED : isComplete ? "#94A3B8" : BRAND_YELLOW,
          },
        ]}
      >{status}</Text>
    </MotiView>
  );

  /* =========================
      LOADING & TRANSITION SCREEN
  ========================= */
  if (loading || isTransitioning) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        <View style={styles.loaderContainer}>
          <LottieView
            source={require("../assets/Upload Complete.json")}
            autoPlay
            loop={true}
            style={styles.loadingLottieCanvas}
          />

          <Text style={styles.loadingText}>
            {isTransitioning ? "Setting up your workspace..." : "Checking verification status..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER WITH LOGOUT */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Feather name="log-out" size={18} color="#FFF" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* TOP ICON */}
        <View style={styles.iconContainer}>
          <MotiView
            from={{ opacity: 0.4, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1.1 }}
            transition={{
              type: "timing",
              duration: 2000,
              loop: true,
              repeatReverse: true,
            }}
            style={[
              styles.pulseRing,
              {
                backgroundColor:
                  currentStatus === "approved"
                    ? "rgba(0,168,89,0.12)"
                    : currentStatus === "rejected"
                      ? "rgba(239,68,68,0.12)"
                      : "rgba(253,224,71,0.12)",
              },
            ]}
          />

          <View
            style={[
              styles.mainIconCircle,
              {
                borderColor: current.color,
              },
            ]}
          >
            <Feather
              name={current.icon}
              size={40}
              color={current.color}
            />
          </View>
        </View>

        {/* TITLE */}
        <MotiText
          from={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.headerTitle}
        >
          {current.title}
        </MotiText>

        {/* SUBTITLE */}
        <Text style={styles.headerSubtitle}>{current.subtitle}</Text>

        {/* STATUS-SPECIFIC CONTENT */}
        <View style={styles.statusList}>
          <StatusItem
            index={0}
            title="Profile Submitted"
            status="Complete"
            isComplete={true}
          />

          <StatusItem
            index={1}
            title="Vehicle Details"
            status="Complete"
            isComplete={true}
          />

          <StatusItem
            index={2}
            title="Document Verification"
            status={current.docStatus}
            isComplete={current.docIsComplete}
            isRejected={current.docIsRejected}
          />
        </View>

        {/* INFO BOX */}
        <MotiView
          key={currentStatus}
          from={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 700 }}
          style={[
            styles.nextStepBox,
            {
              borderColor: current.nextStepBoxBorder,
              backgroundColor: current.nextStepBoxBg,
            },
          ]}
        >
          <View style={styles.nextStepHeader}>
            <MaterialCommunityIcons
              name={current.nextStepIcon}
              size={20}
              color={current.nextStepTitleColor}
            />

            <Text style={[styles.nextStepTitle, { color: current.nextStepTitleColor }]}>
              {current.nextStepTitle}
            </Text>
          </View>

          <Text style={styles.nextStepText}>
            {current.nextStepText}
          </Text>
        </MotiView>
      </View>

      {/* BUTTON */}
      <TouchableOpacity
        activeOpacity={0.9}
        disabled={current.buttonDisabled}
        style={[
          styles.actionBtn,
          {
            backgroundColor: current.color,
            opacity: current.buttonDisabled ? 0.7 : 1,
          },
        ]}
        onPress={async () => {
          if (verificationStatus === "rejected") {
            setDriverStatus?.("rejected");
            navigation.navigate("Documentscreen");
          } else if (verificationStatus === "approved") {
            // Trigger Lottie transition indicator before replacing screen layout contexts
            setIsTransitioning(true);

            try {
              const hasSeenKey = driver ? `hasSeenApproved_${driver.id}` : "hasSeenApproved";
              await AsyncStorage.setItem(hasSeenKey, "true");
              setDriverStatus?.("approved");
              setIsNewUser?.(false);
              navigation.replace("MainTabs");
            } catch (error) {
              console.log("Error processing post-approval logic:", error);
              setIsTransitioning(false); // Reset if storage configuration fails
            }
          }
        }}
      >
        <Text style={styles.actionText}>
          {current.buttonText}
        </Text>
      </TouchableOpacity>

      <SafeAreaView
        edges={["bottom"]}
        style={styles.bottomSafe}
      />
    </SafeAreaView>
  );
};

export default VerificationStatusScreen;

/* =========================
    STYLES
========================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1220",
  },

  content: {
    flex: 1,
    paddingHorizontal: 25,
    alignItems: "center",
    paddingTop: 10,
  },

  topBar: {
    width: "100%",
    paddingHorizontal: 25,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },

  logoutText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
  },

  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingLottieCanvas: {
    width: 140,
    height: 140,
  },

  loadingText: {
    color: "#FFF",
    marginTop: 12,
    fontSize: 15,
    fontWeight: "600",
  },

  iconContainer: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },

  pulseRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
  },

  mainIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 15,
  },

  headerSubtitle: {
    fontSize: 15,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
  },

  statusList: {
    width: "100%",
    marginBottom: 30,
  },

  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1E293B",
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
  },

  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  statusIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  statusTitle: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },

  statusLabel: {
    fontSize: 13,
    fontWeight: "700",
  },

  nextStepBox: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  nextStepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  nextStepTitle: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 10,
  },

  nextStepText: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 20,
  },

  actionBtn: {
    height: 58,
    marginHorizontal: 25,
    marginBottom: 20,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  actionText: {
    color: "#0B1220",
    fontSize: 16,
    fontWeight: "900",
  },

  bottomSafe: {
    backgroundColor: "#000",
  },
});