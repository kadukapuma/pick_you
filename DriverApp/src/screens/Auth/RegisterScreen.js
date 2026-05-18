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
  Alert,
  ActivityIndicator
} from "react-native";
import KeyboardAwareWrapper from "../../components/KeyboardAwareWrapper";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { MotiView, MotiText } from "moti";
import api from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");


const RegisterScreen = ({ navigation }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [agree, setAgree] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const BRAND_GREEN = "#00A859";

  const handleRegister = async () => {
    if (!agree) {
      Alert.alert("Terms Required", "Please agree to the Terms of Service to continue.");
      return;
    }
    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
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
        // OTP logic can be implemented, for now go to profile setup or main based on your flow
        navigation?.navigate("OTP", { isRegistration: true, phone: phone });
      }
    } catch (error) {
      console.log("Registration error:", error.response?.data || error.message);
      const resp = error.response?.data;
      const msg = resp?.message || "An error occurred during registration.";

      // If phone already registered, prompt user to login
      const phoneError = resp?.errors?.phone || /phone|already/i.test(msg);
      if (phoneError) {
        Alert.alert(
          "Number Already Registered",
          "Your mobile number is already registered. Please log in to continue.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Login", onPress: () => navigation.navigate("Login", { phone }) },
          ]
        );
        return;
      }

      Alert.alert("Registration Failed", msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.mainBackground}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={true}
      />

      {/* --- BACKGROUND DECORATION (Matching Login Style) --- */}
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
            backgroundColor: "rgba(203, 213, 225, 0.4)",
          },
        ]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <KeyboardAwareWrapper showsVerticalScrollIndicator={false} bounces={false}>
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
                name="account-plus"
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

            <View style={styles.form}>
              {/* First Name */}
              <MotiView
                from={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 600 }}
                style={styles.inputWrapper}
              >
                <Feather
                  name="user"
                  size={20}
                  color="#94A3B8"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="First Name"
                  placeholderTextColor="#94A3B8"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </MotiView>

              {/* Last Name */}
              <MotiView
                from={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 650 }}
                style={styles.inputWrapper}
              >
                <Feather
                  name="user"
                  size={20}
                  color="#94A3B8"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Last Name"
                  placeholderTextColor="#94A3B8"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </MotiView>

              {/* Email */}
              <MotiView
                from={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 700 }}
                style={styles.inputWrapper}
              >
                <Feather
                  name="mail"
                  size={20}
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

              {/* Phone */}
              <MotiView
                from={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 800 }}
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
                />
              </MotiView>

              {/* Password */}
              <MotiView
                from={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 900 }}
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
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
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

              {(passwordFocused || password.length > 0) && (
                <MotiView
                  from={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 910 }}
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
                    placeholder="Confirm Password"
                    placeholderTextColor="#94A3B8"
                    value={confirmPassword}
                    secureTextEntry={!showPassword}
                    onChangeText={setConfirmPassword}
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
              )}

              {/* Terms Checkbox */}
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
                  {agree && <Feather name="check" size={14} color="#FFF" />}
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  I agree to the{" "}
                  <Text style={styles.linkText}>Terms of Service</Text> and{" "}
                  <Text style={styles.linkText}>Privacy Policy</Text>
                </Text>
              </MotiView>

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

              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1200 }}
                style={styles.footer}
              >
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation?.navigate("Login")}>
                  <Text style={styles.signInText}>Sign In</Text>
                </TouchableOpacity>
              </MotiView>
            </View>
          </View>
        </KeyboardAwareWrapper>
      </KeyboardAvoidingView>
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
    marginBottom: 10,
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
    marginBottom: 20,
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
    marginBottom: 30,
  },
  form: { width: "100%" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(241, 245, 249, 0.8)",
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
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
    paddingRight: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  termsText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  linkText: {
    color: "#00A859",
    fontWeight: "700",
  },
  continueBtn: {
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
  continueBtnText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  footerText: {
    color: "#64748B",
    fontSize: 15,
  },
  signInText: {
    color: "#00A859",
    fontWeight: "800",
    fontSize: 15,
  },
});

export default RegisterScreen;
