import {
  Feather,
  FontAwesome,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { MotiText, MotiView } from "moti";
import { useState } from "react";
import {
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// --- BACKEND & SCROLL INTEGRATIONS ---
import KeyboardAwareWrapper from "../../components/KeyboardAwareWrapper";
import api from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

const LoginScreen = ({
  navigation,
  route,
  setIsLoggedIn,
  setIsNewUser,
  setDriverStatus,
  setDriver,
}) => {
  // Back-end expects email and password states (with route param fallback)
  const [email, setEmail] = useState(route?.params?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const BRAND_GREEN = "#00A859";

  // Production API Login Workflow
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/login", {
        email,
        password,
      });

      if (response.data?.data?.token) {
        await AsyncStorage.setItem("userToken", response.data.data.token);

        const userResponse = await api.get("/user");
        const driverData = userResponse.data?.driver;
        let status = (driverData?.status || "pending").toLowerCase();

        if (status === "approved" && driverData) {
          const hasSeenKey = `hasSeenApproved_${driverData.id}`;
          const hasSeenApproved = await AsyncStorage.getItem(hasSeenKey);
          if (!hasSeenApproved) {
            status = "show_approved_screen";
          }
        }

        setDriverStatus?.(status);
        setDriver?.(driverData || null);

        // Profile completeness gate definition logic
        const isProfileComplete = !!driverData?.address;
        if (status !== "approved" && status !== "show_approved_screen" && !isProfileComplete) {
          setIsNewUser?.(true);
        } else {
          setIsNewUser?.(false);
        }

        setTimeout(() => {
          setIsLoading(false);
          setIsLoggedIn?.(true);
        }, 500);
      }
    } catch (error) {
      setIsLoading(false);
      console.log("Login error:", error.response?.data || error.message);
      Alert.alert(
        "Login Failed",
        error.response?.data?.message ||
        "Invalid credentials. Please try again."
      );
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.mainBackground}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />

        {/* --- YOUR TOP GRAPHICS --- */}
        <MotiView
          from={{ opacity: 0, scale: 0.5, rotate: "0deg" }}
          animate={{ opacity: 1, scale: 1, rotate: "15deg" }}
          transition={{ type: "timing", duration: 2000 }}
          style={[
            styles.graphicBlob,
            {
              top: -80,
              right: -60,
              backgroundColor: "rgba(0, 168, 89, 0.12)",
              width: 350,
              height: 350,
            },
          ]}
        />

        <MotiView
          from={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ type: "spring", delay: 800 }}
          style={[
            styles.graphicBlob,
            {
              top: 20,
              right: -100,
              backgroundColor: "rgba(0, 168, 89, 0.08)",
              width: 200,
              height: 200,
              borderRadius: 100,
            },
          ]}
        />

        {/* --- INTEGRATED KEYBOARD AVOIDANCE & SCROLL WRAPPER --- */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <KeyboardAwareWrapper
            contentContainerStyle={{ flexGrow: 1 }}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.container}>
              {/* HEADER */}
              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 200, type: "timing" }}
                style={styles.header}
              >
                <TouchableOpacity
                  onPress={() => navigation?.goBack()}
                  activeOpacity={0.7}
                  style={styles.backButton}
                >
                  <Feather name="chevron-left" size={24} color="#1E293B" />
                </TouchableOpacity>
              </MotiView>

              {/* CONTENT */}
              <View style={styles.contentContainer}>
                {/* ICON */}
                <MotiView
                  from={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", delay: 300 }}
                  style={styles.iconCircle}
                >
                  <MaterialCommunityIcons
                    name="car-connected"
                    size={32}
                    color={BRAND_GREEN}
                  />
                </MotiView>

                {/* TITLE */}
                <MotiText
                  from={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 400 }}
                  style={styles.title}
                >
                  Welcome Back
                </MotiText>

                <MotiText
                  from={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 500 }}
                  style={styles.subtitle}
                >
                  Sign in to start your shift
                </MotiText>

                {/* FORM */}
                <View style={styles.form}>
                  {/* EMAIL */}
                  <MotiView
                    from={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 600 }}
                    style={styles.inputWrapper}
                  >
                    <Feather
                      name="mail"
                      size={17}
                      color="#94A3B8"
                      style={styles.inputIcon}
                    />

                    <TextInput
                      style={styles.input}
                      placeholder="Email Address"
                      placeholderTextColor="#94A3B8"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </MotiView>

                  {/* PASSWORD */}
                  <MotiView
                    from={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 700 }}
                    style={styles.inputWrapper}
                  >
                    <Feather
                      name="lock"
                      size={17}
                      color="#94A3B8"
                      style={styles.inputIcon}
                    />

                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor="#94A3B8"
                      value={password}
                      secureTextEntry={!showPassword}
                      onChangeText={setPassword}
                    />

                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Feather
                        name={showPassword ? "eye" : "eye-off"}
                        size={17}
                        color={BRAND_GREEN}
                      />
                    </TouchableOpacity>
                  </MotiView>

                  {/* FORGOT BUTTON */}
                  <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 800 }}
                    style={styles.forgotBtn}
                  >
                    <TouchableOpacity>
                      <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </MotiView>

                  {/* LOGIN ACTIONS */}
                  <MotiView
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 900, type: "spring" }}
                  >
                    <TouchableOpacity
                      style={styles.loginBtn}
                      onPress={handleLogin}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.loginBtnText}>Login</Text>
                    </TouchableOpacity>
                  </MotiView>

                  {/* DIVIDER */}
                  <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1000 }}
                    style={styles.dividerRow}
                  >
                    <View style={styles.line} />
                    <Text style={styles.dividerText}>or continue with</Text>
                    <View style={styles.line} />
                  </MotiView>

                  {/* SOCIAL ROW */}
                  <View style={styles.socialRow}>
                    <MotiView
                      from={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1100, type: "spring" }}
                    >
                      <TouchableOpacity style={styles.socialBtn}>
                        <FontAwesome name="google" size={17} color="#1E293B" />
                      </TouchableOpacity>
                    </MotiView>

                    <MotiView
                      from={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1200, type: "spring" }}
                    >
                      <TouchableOpacity style={styles.socialBtn}>
                        <FontAwesome
                          name="facebook"
                          size={17}
                          color="#1E293B"
                        />
                      </TouchableOpacity>
                    </MotiView>
                  </View>

                  {/* FOOTER */}
                  <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1300 }}
                    style={styles.footer}
                  >
                    <Text style={styles.footerText}>
                      Dont have an account?
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation?.navigate("Register")}
                    >
                      <Text style={styles.signUpText}> Sign Up</Text>
                    </TouchableOpacity>
                  </MotiView>
                </View>

                {/* YOUR ORIGINAL DESIGN CAR IMAGE */}
                <MotiView
                  from={{ opacity: 0, translateY: 40 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{
                    delay: 1400,
                    duration: 900,
                    type: "timing",
                  }}
                  style={styles.carImageWrapper}
                >
                  <Image
                    source={require("../../assets/car.png")}
                    style={styles.carImage}
                    resizeMode="contain"
                  />
                </MotiView>
              </View>
            </View>
          </KeyboardAwareWrapper>
        </KeyboardAvoidingView>

        {/* BLACK BOTTOM SAFE AREA WRAPPER */}
        <SafeAreaView edges={["bottom"]} style={styles.bottomSafeArea} />

        {/* LOADING AUTHENTICATING STATE OVERLAY */}
        <Modal transparent visible={isLoading} animationType="fade">
          <View style={styles.loadingOverlay}>
            <MotiView
              from={{ translateX: -150, opacity: 0 }}
              animate={{ translateX: 150, opacity: 1 }}
              transition={{
                loop: true,
                duration: 1200,
                type: "timing",
              }}
            >
              <MaterialCommunityIcons
                name="car-sports"
                size={80}
                color={BRAND_GREEN}
              />
            </MotiView>

            <MotiText
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{
                loop: true,
                duration: 1500,
                type: "timing",
              }}
              style={styles.loadingText}
            >
              Authenticating...
            </MotiText>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
};

// --- YOUR EXACT UI LAYOUT STYLES PRESERVED ---
const styles = StyleSheet.create({
  mainBackground: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  graphicBlob: {
    position: "absolute",
    borderRadius: 160,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight || 0) + 5
        : 45,
  },
  backButton: {
    width: 40,
    height: 40,
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(0, 168, 89, 0.1)",
    shadowColor: "#00A859",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 18,
  },
  form: {
    width: "100%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 54,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "600",
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginBottom: 16,
  },
  forgotText: {
    color: "#00A859",
    fontWeight: "700",
    fontSize: 12,
  },
  loginBtn: {
    backgroundColor: "#00A859",
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00A859",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  loginBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    marginHorizontal: 10,
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    marginBottom: 10,
  },
  socialBtn: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: -10,
  },
  footerText: {
    color: "#64748B",
    fontSize: 13,
  },
  signUpText: {
    color: "#00A859",
    fontWeight: "800",
    fontSize: 13,
  },
  carImageWrapper: {
    width: width,
    alignItems: "center",
    marginTop: -28,
  },
  carImage: {
    width: width * 1.12,
    height: height * 0.28,
  },
  bottomSafeArea: {
    backgroundColor: "#000000",
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.98)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#0F172A",
    marginTop: 25,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },
});

export default LoginScreen;