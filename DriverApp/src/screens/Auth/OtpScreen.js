import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { MotiText, MotiView } from "moti";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Alert
} from "react-native";
import api from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

const OTPScreen = ({ navigation, route, setIsLoggedIn, setIsNewUser, setDriverStatus, setDriver }) => {
  // Backend returns a 4-digit OTP
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(120);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const inputs = useRef([]);
  const BRAND_GREEN = "#00A859";

  // 1. Updated Route Params
  const isRegistration = route?.params?.isRegistration ?? false;
  const isForgotPassword = route?.params?.isForgotPassword ?? false;
  const shouldAutoSendOtp = route?.params?.shouldAutoSendOtp ?? true;
  const email = route?.params?.email ?? "";
  const phone = route?.params?.phone ?? "";
  const otpRecipient = phone || email;

  // Automatically request OTP when screen mounts
  useEffect(() => {
    if (shouldAutoSendOtp) {
      sendOtpRequest();
    }

    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [shouldAutoSendOtp, sendOtpRequest]);

  // 2. Updated sendOtpRequest() with conditional purpose
  const sendOtpRequest = useCallback(async () => {
    if (!otpRecipient) {
      Alert.alert("Missing Contact", "A mobile number or email address is required to send the OTP.");
      return;
    }
    try {
      const payload = {
        purpose: isForgotPassword ? "forgot_password" : "verification",
      };

      if (phone) {
        payload.phone = phone;
      } else {
        payload.email = email;
      }

      const res = await api.post("/otp/send", payload);
      if (res.data?.data?.otp) {
        Alert.alert("Test Mode", `Your OTP is: ${res.data.data.otp}`);
      }
    } catch (err) {
      console.log("Error sending OTP", err.response?.data || err.message);
    }
  }, [email, phone, otpRecipient, isForgotPassword]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text.slice(-1);
    setOtp(newOtp);

    if (text.length !== 0 && index < 3) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && otp[index] === "" && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  // 3 & 4. Updated handleVerify() with Forgot Password Routing and API payloads
  const handleVerify = async () => {
    const otpCode = otp.join("");

    if (otpCode.length < 4) return;

    if (!otpRecipient) {
      Alert.alert(
        "Missing Contact",
        "A mobile number or email address is required to verify the OTP."
      );
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        otp_code: otpCode,
        purpose: isForgotPassword ? "forgot_password" : "verification",
      };

      if (phone) {
        payload.phone = phone;
      } else {
        payload.email = email;
      }

      await api.post("/otp/verify", payload);

      // ==========================
      // FORGOT PASSWORD FLOW
      // ==========================
      if (isForgotPassword) {
        setIsLoading(false);

        navigation.replace("ResetPassword", {
          email,
          phone,
        });

        return;
      }

      // ==========================
      // REGISTRATION / LOGIN FLOW
      // ==========================
      let driverData = null;
      let status = "pending";
      let isProfileComplete = false;

      try {
        const userResponse = await api.get("/user");

        driverData = userResponse.data?.driver;

        if (driverData) {
          status = (driverData.status || "pending").toLowerCase();

          if (status === "approved") {
            const hasSeenKey = `hasSeenApproved_${driverData.id}`;

            const hasSeenApproved = await AsyncStorage.getItem(hasSeenKey);

            if (!hasSeenApproved) {
              status = "show_approved_screen";
            }
          }

          isProfileComplete = !!driverData.address;
        }
      } catch (userErr) {
        console.log("Error fetching user after OTP verify:", userErr);
      }

      setDriver?.(driverData);
      setDriverStatus?.(status);

      if (isRegistration) {
        setIsNewUser?.(true);
      } else {
        if (
          status !== "approved" &&
          status !== "show_approved_screen" &&
          !isProfileComplete
        ) {
          setIsNewUser?.(true);
        } else {
          setIsNewUser?.(false);
        }
      }

      setIsLoading(false);

      setTimeout(() => {
        setIsLoggedIn?.(true);
      }, 300);
    } catch (error) {
      setIsLoading(false);

      Alert.alert(
        "Verification Failed",
        error.response?.data?.message || "Invalid OTP code."
      );
    }
  };

  const isOtpComplete = otp.every((digit) => digit !== "");

  return (
    <View style={styles.mainBackground}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* --- BACKGROUND DECORATION --- */}
      <MotiView
        from={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "timing", duration: 2000 }}
        style={[
          styles.graphicBlob,
          { top: -100, right: -50, backgroundColor: "rgba(0, 168, 89, 0.12)" },
        ]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <MotiView
          from={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={28} color="#1E293B" />
          </TouchableOpacity>
        </MotiView>

        <View style={styles.contentContainer}>
          {/* 5. Dynamic Screen Title */}
          <MotiText
            from={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 100 }}
            style={styles.title}
          >
            {isForgotPassword ? "Verify OTP" : "Verify Account"}
          </MotiText>

          {/* 6. Dynamic Subtitle text */}
          <MotiText style={styles.subtitle}>
            {isForgotPassword ? "Enter the OTP sent to " : "We sent a 4-digit code to "}
            <Text style={[styles.phoneText, { color: BRAND_GREEN }]}>
              {otpRecipient || "your contact details"}
            </Text>
          </MotiText>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <MotiView
                key={index}
                animate={{
                  borderColor: focusedIndex === index ? BRAND_GREEN : "#E2E8F0",
                  backgroundColor:
                    focusedIndex === index
                      ? "#FFFFFF"
                      : "rgba(241, 245, 249, 0.8)",
                  scale: focusedIndex === index ? 1.05 : 1,
                }}
                style={styles.otpBox}
              >
                <TextInput
                  ref={(ref) => (inputs.current[index] = ref)}
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  maxLength={1}
                  onFocus={() => setFocusedIndex(index)}
                  onChangeText={(text) => handleChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  value={digit}
                  selectionColor={BRAND_GREEN}
                  placeholder="•"
                  placeholderTextColor="#CBD5E1"
                />
              </MotiView>
            ))}
          </View>

          <View style={styles.timerRow}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={18}
              color="#64748B"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.timerText}>
              {timer > 0
                ? `Resend code in ${formatTime(timer)}`
                : "Didn't receive a code?"}
            </Text>
            {timer === 0 && (
              <TouchableOpacity onPress={() => {
                setTimer(120);
                setOtp(["", "", "", ""]);
                sendOtpRequest();
              }}>
                <Text style={[styles.resendAction, { color: BRAND_GREEN }]}>
                  {" "}
                  Resend Now
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.buttonWrapper}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.verifyBtn,
                { backgroundColor: BRAND_GREEN },
                !isOtpComplete && styles.disabledBtn,
              ]}
              onPress={handleVerify}
              disabled={!isOtpComplete}
            >
              <Text style={styles.verifyBtnText}>Verify & Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal transparent visible={isLoading} animationType="fade">
        <View style={styles.loadingOverlay}>
          <MotiView
            from={{ translateX: -100, opacity: 0 }}
            animate={{ translateX: 100, opacity: 1 }}
            transition={{ loop: true, duration: 1200, type: "timing" }}
          >
            <MaterialCommunityIcons
              name="car-sports"
              size={80}
              color={BRAND_GREEN}
            />
          </MotiView>
          {/* 7. Dynamic Loading Text */}
          <MotiText
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ loop: true, duration: 1500, type: "timing" }}
            style={styles.loadingText}
          >
            {isForgotPassword ? "Verifying OTP..." : "Verifying Account..."}
          </MotiText>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainBackground: { flex: 1, backgroundColor: "#FFFFFF", overflow: "hidden" },
  graphicBlob: {
    position: "absolute",
    width: 350,
    height: 350,
    borderRadius: 150,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 20 : 60,
    marginBottom: 30,
    zIndex: 10,
  },
  backButton: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  contentContainer: { flex: 1, paddingHorizontal: 25, alignItems: "center" },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 40,
    lineHeight: 22,
    textAlign: "center",
  },
  phoneText: { fontWeight: "700" },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 40,
  },
  otpBox: {
    width: (width - 80) / 4, // Adjusted from /6 to /4 for a perfect 4-digit grid alignment
    height: 68,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  otpInput: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    width: "100%",
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  timerText: { color: "#64748B", fontSize: 15, fontWeight: "500" },
  resendAction: { fontWeight: "800", fontSize: 15 },
  buttonWrapper: { width: "100%", marginTop: "auto", marginBottom: 50 },
  verifyBtn: {
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00A859",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  disabledBtn: { backgroundColor: "#CBD5E1", shadowOpacity: 0 },
  verifyBtnText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#0F172A",
    marginTop: 20,
    fontSize: 18,
    fontWeight: "800",
  },
});

export default OTPScreen;
