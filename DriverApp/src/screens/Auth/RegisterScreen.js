import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  Image,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { MotiView, MotiText } from "moti";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Customs imported from your friend's architecture
import KeyboardAwareWrapper from "../../components/KeyboardAwareWrapper";
import api from "../../services/api";

const { width, height } = Dimensions.get("window");

const RegisterScreen = ({ navigation }) => {
  // Form State Configurations
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Validation States
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  // Interactive UI States
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [agree, setAgree] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Custom popup state
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState("error");
  const [popupButtonText, setPopupButtonText] = useState("OK");
  const [popupAction, setPopupAction] = useState(null);

  const BRAND_GREEN = "#00A859";

  const showPopup = (
    title,
    message,
    type = "error",
    action = null,
    buttonText = "OK"
  ) => {
    setPopupTitle(title);
    setPopupMessage(message);
    setPopupType(type);
    setPopupAction(() => action);
    setPopupButtonText(buttonText);
    setPopupVisible(true);
  };

  const validateEmail = (value) => {
    return /\S+@\S+\.\S+/.test(value);
  };

  const handleEmailChange = (value) => {
    setEmail(value);

    if (!value) {
      setEmailError("");
      return;
    }

    setEmailError(validateEmail(value) ? "" : "Please enter a valid email address");
  };

  const handlePasswordChange = (value) => {
    setPassword(value);

    if (!value) {
      setPasswordError("");
    } else if (value.length < 6) {
      setPasswordError("Password must be at least 6 characters");
    } else {
      setPasswordError("");
    }

    if (confirmPassword) {
      setConfirmPasswordError(
        value === confirmPassword ? "" : "Passwords do not match"
      );
    }
  };

  const handleConfirmPasswordChange = (value) => {
    setConfirmPassword(value);

    if (!value) {
      setConfirmPasswordError("");
      return;
    }

    setConfirmPasswordError(
      value === password ? "" : "Passwords do not match"
    );
  };

  // Backend Registration Pipeline Logic
  const handleRegister = async () => {
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");

    let hasError = false;

    if (!agree) {
      showPopup(
        "Terms Required",
        "Please agree to the Terms of Service to continue.",
        "warning"
      );
      return;
    }

    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword) {
      showPopup("Error", "Please fill in all fields.", "error");
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      hasError = true;
    }

    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      hasError = true;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    try {
      setIsLoading(true);

      const response = await api.post("/register", {
        first_name: firstName,
        last_name: lastName || firstName,
        email,
        phone,
        password,
        password_confirmation: confirmPassword,
        role: "driver"
      });

      if (response.data?.data?.token) {
        await AsyncStorage.setItem("userToken", response.data.data.token);
        navigation?.navigate("OTP", {
          isRegistration: true,
          email,
          phone,
        });
      }
    } catch (error) {
      console.log("Registration error:", error.response?.data || error.message);
      const resp = error.response?.data;
      const msg = resp?.message || "An error occurred during registration.";

      const emailError = resp?.errors?.email || /email|already/i.test(msg);

      if (emailError) {
        showPopup(
          "Email Already Registered",
          "This email is already registered. Please log in to continue.",
          "warning",
          () => navigation.navigate("Login", { email }),
          "Login"
        );
        return;
      }

      // Check if phone or user instance is already present in the database setup
      const phoneError = resp?.errors?.phone || /phone|already/i.test(msg);
      if (phoneError) {
        showPopup(
          "Number Already Registered",
          "Your mobile number is already registered. Please log in to continue.",
          "warning",
          () => navigation.navigate("Login", { phone }),
          "Login"
        );
        return;
      }

      showPopup("Registration Failed", msg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.mainBackground}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* TOP BACKGROUND GEOMETRIC GRAPHIC BLOB */}
      <MotiView
        from={{ opacity: 0, scale: 0.5, rotate: "0deg" }}
        animate={{ opacity: 1, scale: 1, rotate: "-15deg" }}
        transition={{ type: "timing", duration: 2000 }}
        style={[
          styles.graphicBlob,
          {
            top: -100,
            left: -50,
            backgroundColor: "rgba(0, 168, 89, 0.12)",
            width: 350,
            height: 350,
          },
        ]}
      />

      {/* LOWER BACKGROUND GRAPHIC BLOB */}
      <MotiView
        from={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "timing", duration: 1500, delay: 500 }}
        style={[
          styles.graphicBlob,
          {
            bottom: -50,
            right: -80,
            width: 250,
            height: 250,
            backgroundColor: "rgba(203, 213, 225, 0.35)",
          },
        ]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <KeyboardAwareWrapper
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >

          {/* HEADER BACK UTILITY ACTION */}
          <MotiView
            from={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 200 }}
            style={styles.header}
          >
            <TouchableOpacity
              onPress={() => navigation?.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={24} color="#1E293B" />
            </TouchableOpacity>
          </MotiView>

          {/* APPLICATION IDENTITY REGISTRATION INTERFACE */}
          <View style={styles.contentContainer}>
            <View style={styles.topSection}>

              {/* TOP CIRCULAR SYSTEM LOGO ICON */}
              <MotiView
                from={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", delay: 300 }}
                style={styles.iconCircle}
              >
                <MaterialCommunityIcons
                  name="account-plus"
                  size={34}
                  color={BRAND_GREEN}
                />
              </MotiView>

              {/* WELCOME HEADINGS TEXT EDIT */}
              <MotiText
                from={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 400 }}
                style={styles.title}
              >
                Create Account
              </MotiText>

              <MotiText
                from={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 500 }}
                style={styles.subtitle}
              >
                Start your journey as a driver
              </MotiText>

              {/* INPUT FIELDS STRUCTURAL ELEMENT FORM */}
              <View style={styles.form}>

                {/* FIRST NAME INPUT */}
                <InputField
                  icon="user"
                  placeholder="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  delay={600}
                />

                {/* LAST NAME INPUT */}
                <InputField
                  icon="user"
                  placeholder="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  delay={650}
                />

                {/* EMAIL ADDRESS INPUT */}
                <MotiView
                  from={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 700 }}
                >
                  <View style={[styles.inputWrapper, emailError && styles.inputError]}>
                    <Feather
                      name="mail"
                      size={18}
                      color={emailError ? "#EF4444" : "#94A3B8"}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Email Address"
                      placeholderTextColor="#94A3B8"
                      value={email}
                      onChangeText={handleEmailChange}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    {email.length > 0 && !emailError && validateEmail(email) && (
                      <Feather name="check-circle" size={18} color="#00A859" />
                    )}
                  </View>
                  {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                </MotiView>

                {/* PHONE NUMBER FIELD SYSTEM */}
                <InputField
                  icon="phone"
                  placeholder="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  delay={800}
                />

                {/* SECURE PASSWORD CREATION FIELD */}
                <MotiView
                  from={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 900 }}
                >
                  <View style={[styles.inputWrapper, passwordError && styles.inputError]}>
                    <Feather
                      name="lock"
                      size={18}
                      color={passwordError ? "#EF4444" : "#94A3B8"}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor="#94A3B8"
                      value={password}
                      secureTextEntry={!showPassword}
                      onChangeText={handlePasswordChange}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Feather
                        name={showPassword ? "eye" : "eye-off"}
                        size={18}
                        color={BRAND_GREEN}
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                </MotiView>

                {/* CONDITIONAL CONFIRM PASSWORD SUB-INPUT EXPANSION */}
                {(passwordFocused || password.length > 0) && (
                  <MotiView
                    from={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "timing", duration: 300 }}
                  >
                    <View style={[styles.inputWrapper, confirmPasswordError && styles.inputError]}>
                      <Feather
                        name="lock"
                        size={18}
                        color={confirmPasswordError ? "#EF4444" : "#94A3B8"}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Confirm Password"
                        placeholderTextColor="#94A3B8"
                        value={confirmPassword}
                        secureTextEntry={!showPassword}
                        onChangeText={handleConfirmPasswordChange}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Feather
                          name={showPassword ? "eye" : "eye-off"}
                          size={18}
                          color={BRAND_GREEN}
                        />
                      </TouchableOpacity>
                    </View>
                    {confirmPasswordError ? (
                      <Text style={styles.errorText}>{confirmPasswordError}</Text>
                    ) : null}
                  </MotiView>
                )}

                {/* POLICY AND TERMS VERIFICATION CHECKBOX LAYOUT */}
                <MotiView
                  from={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1000 }}
                  style={styles.termsRow}
                >
                  <TouchableOpacity
                    onPress={() => setAgree(!agree)}
                    style={[
                      styles.checkbox,
                      agree && {
                        backgroundColor: BRAND_GREEN,
                        borderColor: BRAND_GREEN,
                      },
                    ]}
                  >
                    {agree && (
                      <Feather name="check" size={13} color="#FFF" />
                    )}
                  </TouchableOpacity>

                  <Text style={styles.termsText}>
                    I agree to the{" "}
                    <Text style={styles.linkText}>Terms of Service</Text> and{" "}
                    <Text style={styles.linkText}>Privacy Policy</Text>
                  </Text>
                </MotiView>

                {/* PRIMARY ACTION REGISTRATION EMISSION BUTTON */}
                <MotiView
                  from={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1100, type: "spring" }}
                >
                  <TouchableOpacity
                    style={styles.continueBtn}
                    onPress={handleRegister}
                    activeOpacity={0.9}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.continueBtnText}>Continue</Text>
                    )}
                  </TouchableOpacity>
                </MotiView>

                {/* REDIRECT ANCHOR LINK SWITCH TO SIGN IN SCREEN */}
                <MotiView
                  from={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1200 }}
                  style={styles.footer}
                >
                  <Text style={styles.footerText}>Already have an account?</Text>
                  <TouchableOpacity onPress={() => navigation?.navigate("Login")}>
                    <Text style={styles.signInText}> Sign In</Text>
                  </TouchableOpacity>
                </MotiView>

              </View>
            </View>

            {/* ARTWORK VECTOR GRAPHIC LAYOUT PLACEMENT */}
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
                source={require("../../assets/three.png")}
                style={styles.carImage}
                resizeMode="contain"
              />
            </MotiView>

          </View>
        </KeyboardAwareWrapper>
      </KeyboardAvoidingView>

      {/* SYSTEM POPUP */}
      <Modal transparent visible={popupVisible} animationType="fade">
        <View style={styles.popupOverlay}>
          <MotiView
            from={{ opacity: 0, scale: 0.8, translateY: 20 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: "spring" }}
            style={styles.popupCard}
          >
            <View
              style={[
                styles.popupIconCircle,
                popupType === "error" && { backgroundColor: "rgba(239,68,68,0.12)" },
                popupType === "warning" && { backgroundColor: "rgba(245,158,11,0.12)" },
              ]}
            >
              <Feather
                name={popupType === "warning" ? "alert-triangle" : "x"}
                size={26}
                color={popupType === "warning" ? "#F59E0B" : "#EF4444"}
              />
            </View>

            <Text style={styles.popupTitle}>{popupTitle}</Text>

            <Text style={styles.popupMessage}>{popupMessage}</Text>

            <TouchableOpacity
              style={styles.popupButton}
              onPress={() => {
                setPopupVisible(false);
                if (typeof popupAction === "function") {
                  popupAction();
                }
              }}
            >
              <Text style={styles.popupButtonText}>{popupButtonText}</Text>
            </TouchableOpacity>
          </MotiView>
        </View>
      </Modal>

      {/* SYSTEM DEVICE LOWER BAR VIEW FILL */}
      <SafeAreaView
        edges={["bottom"]}
        style={styles.bottomSafeArea}
      />
    </View>
  );
};

const InputField = ({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  delay = 600,
}) => (
  <MotiView
    from={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    style={styles.inputWrapper}
  >
    <Feather
      name={icon}
      size={18}
      color="#94A3B8"
      style={styles.inputIcon}
    />

    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCapitalize="none"
    />
  </MotiView>
);

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
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 5 : 45,
    marginBottom: 5,
    zIndex: 10,
  },
  backButton: {
    width: 42,
    height: 42,
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
    justifyContent: "space-between",
    alignItems: "center",
  },
  topSection: {
    width: "100%",
    alignItems: "center",
  },
  iconCircle: {
    width: 74,
    height: 74,
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
    fontSize: 30,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 20,
  },
  form: {
    width: "100%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
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
  inputError: {
    borderColor: "#EF4444",
    borderWidth: 1.5,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: -5,
    marginBottom: 10,
    marginLeft: 4,
    fontWeight: "600",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 18,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  termsText: {
    flex: 1,
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
  },
  linkText: {
    color: "#00A859",
    fontWeight: "700",
  },
  continueBtn: {
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
  continueBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 0,
  },
  footerText: {
    color: "#64748B",
    fontSize: 13,
  },
  signInText: {
    color: "#00A859",
    fontWeight: "800",
    fontSize: 13,
  },
  carImageWrapper: {
    width: width,
    alignItems: "center",
    marginTop: 5,
  },
  carImage: {
    width: width * 1.08,
    height: height * 0.22,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  popupCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
  },
  popupIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 8,
  },
  popupMessage: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 22,
  },
  popupButton: {
    backgroundColor: "#00A859",
    width: "100%",
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  popupButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
  bottomSafeArea: {
    backgroundColor: "#000000",
  },
});

export default RegisterScreen;
