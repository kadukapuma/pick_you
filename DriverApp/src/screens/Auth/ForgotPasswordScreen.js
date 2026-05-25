import { Feather } from "@expo/vector-icons";
import { MotiText, MotiView } from "moti";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
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

const { width } = Dimensions.get("window");

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const BRAND_GREEN = "#00A859";

  const handleSendOtp = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      Alert.alert("Required", "Please enter your email.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/otp/send", {
        email: trimmedEmail,
        purpose: "forgot_password",
      });

      setLoading(false);

      navigation.navigate("OTP", {
        email: trimmedEmail,
        isForgotPassword: true,
        shouldAutoSendOtp: false,
      });
    } catch (error) {
      setLoading(false);

      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Unable to send OTP. Please verify the email and try again."
      );
    }
  };

  return (
    <View style={styles.mainBackground}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Background blob */}
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="chevron-left" size={28} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <MotiText
            from={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={styles.title}
          >
            Forgot Password?
          </MotiText>

          <Text style={styles.subtitle}>
            Enter your registered email address.{"\n"}
            We’ll send you an OTP to reset your password.
          </Text>

          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <Feather name="mail" size={20} color="#94A3B8" />

            <TextInput
              style={styles.input}
              placeholder="Enter Email"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Button */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: BRAND_GREEN },
              loading && { opacity: 0.7 },
            ]}
            onPress={handleSendOtp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Sending..." : "Send OTP"}
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
    paddingHorizontal: 25,
    justifyContent: "center",
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
    lineHeight: 22,
    marginBottom: 40,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    height: 60,
    paddingHorizontal: 18,
    marginBottom: 25,
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
  },

  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
  },
});

export default ForgotPasswordScreen;
