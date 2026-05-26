import { Feather } from "@expo/vector-icons";
import { MotiText, MotiView } from "moti";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import api from "../../services/api";

const ResetPasswordScreen = ({ navigation, route }) => {
  const email = route?.params?.email || "";
  const phone = route?.params?.phone || "";
  const resetIdentifier = phone || email;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const BRAND_GREEN = "#00A859";

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert(
        "Required",
        "Please fill all fields."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Mismatch",
        "Passwords do not match."
      );
      return;
    }

    try {
      setLoading(true);

      const payload = {
        password,
        password_confirmation: confirmPassword,
      };

      if (phone) {
        payload.phone = phone;
      } else {
        payload.email = email;
      }

      await api.post("/reset-password", payload);

      Alert.alert(
        "Success",
        "Password reset successfully.",
        [
          {
            text: "OK",
            onPress: () =>
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              }),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Unable to reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainBackground}>
      <StatusBar
        translucent
        backgroundColor="transparent"
      />

      <MotiView
        from={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2000 }}
        style={styles.graphicBlob}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Feather
              name="chevron-left"
              size={28}
              color="#0F172A"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <MotiText
            from={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={styles.title}
          >
            Reset Password
          </MotiText>

          <Text style={styles.subtitle}>
            Create a new secure password for
            {" "}
            {resetIdentifier || "your account"}.
          </Text>

          <View style={styles.inputWrapper}>
            <Feather
              name="lock"
              size={20}
              color="#94A3B8"
            />

            <TextInput
              style={styles.input}
              secureTextEntry={!showPassword}
              placeholder="New Password"
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              onPress={() =>
                setShowPassword(!showPassword)
              }
            >
              <Feather
                name={
                  showPassword
                    ? "eye-off"
                    : "eye"
                }
                size={20}
                color="#94A3B8"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrapper}>
            <Feather
              name="lock"
              size={20}
              color="#94A3B8"
            />

            <TextInput
              style={styles.input}
              secureTextEntry={
                !showConfirmPassword
              }
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={
                setConfirmPassword
              }
            />

            <TouchableOpacity
              onPress={() =>
                setShowConfirmPassword(
                  !showConfirmPassword
                )
              }
            >
              <Feather
                name={
                  showConfirmPassword
                    ? "eye-off"
                    : "eye"
                }
                size={20}
                color="#94A3B8"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: BRAND_GREEN,
              },
            ]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              Reset Password
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainBackground: {
    flex: 1,
    backgroundColor: "#FFF",
  },

  graphicBlob: {
    position: "absolute",
    width: 350,
    height: 350,
    borderRadius: 200,
    top: -100,
    right: -50,
    backgroundColor: "rgba(0,168,89,0.12)",
  },

  header: {
    paddingTop:
      Platform.OS === "android"
        ? StatusBar.currentHeight + 20
        : 60,
    paddingHorizontal: 20,
  },

  backButton: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 25,
  },

  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 15,
    color: "#64748B",
    marginBottom: 40,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 18,
    marginBottom: 20,
  },

  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "600",
  },

  button: {
    height: 62,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },

  buttonText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 18,
  },
});

export default ResetPasswordScreen;
