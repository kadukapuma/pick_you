import {
  Feather,
  FontAwesome,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { MotiText, MotiView } from "moti";
import { useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert
} from "react-native";
import KeyboardAwareWrapper from "../../components/KeyboardAwareWrapper";
import api from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

const LoginScreen = ({ navigation, route, setIsLoggedIn, setIsNewUser, setDriverStatus, setDriver }) => {
  // Backend expects phone number for login, not email
  const [phone, setPhone] = useState(route?.params?.phone || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const BRAND_GREEN = "#00A859";

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert("Error", "Please enter both phone number and password");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/login", {
        phone,
        password
      });

      if (response.data?.data?.token) {
        await AsyncStorage.setItem("userToken", response.data.data.token);

        const userResponse = await api.get("/user");
        const driver = userResponse.data?.driver;
        const status = (driver?.status || "pending").toLowerCase();

        setDriverStatus?.(status);
        setDriver?.(driver || null);

        // A user is only "new" if they haven't filled out their profile (e.g., no address)
        // AND they aren't approved yet.
        const isProfileComplete = !!driver?.address;
        if (status !== "approved" && !isProfileComplete) {
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
      Alert.alert("Login Failed", error.response?.data?.message || "Invalid credentials. Please try again.");
    }
  };

  return (
    <View style={styles.mainBackground}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />

      {/* --- MODERN GRAPHIC BACKGROUND ELEMENTS --- */}

      {/* INCREASED VISIBILITY GREEN SHAPES */}
      <MotiView
        from={{ opacity: 0, scale: 0.5, rotate: "0deg" }}
        animate={{ opacity: 1, scale: 1, rotate: "15deg" }}
        transition={{ type: "timing", duration: 2000 }}
        style={[
          styles.graphicBlob,
          {
            top: -80,
            right: -60,
            backgroundColor: "rgba(0, 168, 89, 0.12)", // Increased opacity from 0.05
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

      {/* Bottom Left Subtle Shape */}
      <MotiView
        from={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "timing", duration: 1500, delay: 500 }}
        style={[
          styles.graphicBlob,
          {
            bottom: -80,
            left: -120,
            width: 300,
            height: 300,
            backgroundColor: "rgba(203, 213, 225, 0.4)",
          },
        ]}
      />
      {/* ------------------------------------------- */}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <KeyboardAwareWrapper
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
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
              <Feather name="chevron-left" size={28} color="#1E293B" />
            </TouchableOpacity>
          </MotiView>

          <View style={styles.contentContainer}>
            <MotiView
              from={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", delay: 300 }}
              style={styles.iconCircle}
            >
              <MaterialCommunityIcons
                name="car-connected"
                size={40}
                color={BRAND_GREEN}
              />
            </MotiView>

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

            <View style={styles.form}>
              <MotiView
                from={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 600 }}
                style={styles.inputWrapper}
              >
                <Feather
                  name="phone"
                  size={20}
                  color="#94A3B8"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  placeholderTextColor="#94A3B8"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />
              </MotiView>

              <MotiView
                from={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 700 }}
                style={styles.inputWrapper}
              >
                <Feather
                  name="lock"
                  size={20}
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
                    size={20}
                    color={BRAND_GREEN}
                  />
                </TouchableOpacity>
              </MotiView>

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

              <View style={styles.socialRow}>
                <MotiView
                  from={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1100, type: "spring" }}
                >
                  <TouchableOpacity style={styles.socialBtn}>
                    <FontAwesome name="google" size={22} color="#1E293B" />
                  </TouchableOpacity>
                </MotiView>

                <MotiView
                  from={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1200, type: "spring" }}
                >
                  <TouchableOpacity style={styles.socialBtn}>
                    <FontAwesome name="facebook" size={22} color="#1E293B" />
                  </TouchableOpacity>
                </MotiView>
              </View>

              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1300 }}
                style={styles.footer}
              >
                <Text style={styles.footerText}>Dont have an account? </Text>
                <TouchableOpacity
                  onPress={() => navigation?.navigate("MainTabs")}
                >
                  <Text style={styles.signUpText}>Sign Up</Text>
                </TouchableOpacity>
              </MotiView>
            </View>
          </View>
        </KeyboardAwareWrapper>
      </KeyboardAvoidingView>

      <Modal transparent visible={isLoading} animationType="fade">
        <View style={styles.loadingOverlay}>
          <MotiView
            from={{ translateX: -150, opacity: 0 }}
            animate={{ translateX: 150, opacity: 1 }}
            transition={{ loop: true, duration: 1200, type: "timing" }}
          >
            <MaterialCommunityIcons
              name="car-sports"
              size={80}
              color={BRAND_GREEN}
            />
          </MotiView>
          <MotiText
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ loop: true, duration: 1500, type: "timing" }}
            style={styles.loadingText}
          >
            Logging in...
          </MotiText>
        </View>
      </Modal>
    </View>
  );
};

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
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 50,
    marginBottom: 20,
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: "center",
    paddingBottom: 40,
  },
  iconCircle: {
    width: 85,
    height: 85,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "rgba(0, 168, 89, 0.1)",
    shadowColor: "#00A859",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 40,
  },
  form: { width: "100%" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)", // Slightly transparent to let green peek through
    borderRadius: 20,
    paddingHorizontal: 18,
    height: 64,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "600",
  },
  forgotBtn: { alignSelf: "flex-end", marginBottom: 30 },
  forgotText: { color: "#00A859", fontWeight: "700" },
  loginBtn: {
    backgroundColor: "#00A859",
    height: 64,
    borderRadius: 20,
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
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 35,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    marginHorizontal: 15,
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 40,
  },
  socialBtn: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  footer: { flexDirection: "row", justifyContent: "center" },
  footerText: { color: "#64748B", fontSize: 15 },
  signUpText: { color: "#00A859", fontWeight: "800", fontSize: 15 },
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
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
