import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../hooks/useAuth";
import { AuthService } from "../services/auth/authService";
import SuccessModal from "../components/SuccessModal";
import ErrorAlert from "../components/ErrorAlert";
import {
  getUserFriendlyError,
  getValidationErrors,
  formatErrorLog,
} from "../utils/errorHandler";
import { logApiError, logScreenEvent } from "../utils/logger";

export default function SignUpScreen() {
  const { error, clearError, setPendingRegistration } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Clear error when user starts typing
  useEffect(() => {
    logScreenEvent("SignUpScreen", "MOUNT");
    return () => {
      logScreenEvent("SignUpScreen", "UNMOUNT");
    };
  }, []);

  // Clear error when user starts typing
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [firstName, lastName, email, phone, password, passwordConfirm]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) errors.firstName = "First name is required";
    if (!lastName.trim()) errors.lastName = "Last name is required";
    if (!email.trim()) errors.email = "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "Invalid email format";
    if (!phone.trim()) errors.phone = "Phone number is required";
    if (phone.length < 10)
      errors.phone = "Phone number must be at least 10 digits";
    if (!password.trim()) errors.password = "Password is required";
    if (password.length < 8)
      errors.password = "Password must be at least 8 characters";
    if (password !== passwordConfirm)
      errors.passwordConfirm = "Passwords do not match";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      logScreenEvent("SignUpScreen", "ACTION", {
        action: "VALIDATION_FAILED",
        errors: validationErrors,
      });
      return;
    }

    try {
      setIsVerifying(true);
      setShowError(false);

      // Register user WITHOUT auto-login
      const registerResult = await AuthService.registerWithOTP({
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        password: password,
        password_confirmation: passwordConfirm,
        role: "passenger",
      });

      if (!registerResult.success) {
        const friendlyError = getUserFriendlyError(registerResult);
        const fieldErrors = getValidationErrors(registerResult);
        if (Object.keys(fieldErrors).length > 0) {
          setValidationErrors(fieldErrors);
        }

        logApiError(registerResult, {
          screen: "SignUpScreen",
          action: "REGISTER",
          payload: {
            email,
            phone,
          },
        });

        setErrorMessage(friendlyError);
        setShowError(true);
        setIsVerifying(false);
        return;
      }

      // Send OTP for verification
      const otpResult = await AuthService.sendOtp(email);
      if (!otpResult.success) {
        const friendlyError = getUserFriendlyError(otpResult);
        logApiError(otpResult, {
          screen: "SignUpScreen",
          action: "SEND_OTP",
          email,
        });

        setErrorMessage(friendlyError);
        setShowError(true);
        setIsVerifying(false);
        return;
      }

      if (otpResult.otp) {
        setGeneratedOtp(String(otpResult.otp));
      }

      // Show success modal
      setShowSuccess(true);

      // Store registration data in context (temporary until OTP verification)
      setPendingRegistration(registerResult.data || null);

      logScreenEvent("SignUpScreen", "ACTION", {
        action: "REGISTRATION_SUCCESSFUL",
        email,
      });
    } catch (err: any) {
      const friendlyError = getUserFriendlyError(err);
      logApiError(err, {
        screen: "SignUpScreen",
        action: "SIGNUP",
      });

      setErrorMessage(friendlyError);
      setShowError(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    // Navigate to OTP verification screen
    router.push({
      pathname: "/(auth)/verify-number",
      params: { mobileNumber: email, testOtp: generatedOtp },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F7F7]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 28,
            paddingTop: 10,
            paddingBottom: 20,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View className="items-center mb-1">
            <Image
              source={require("../../assets/images/logo.png")}
              style={{
                width: 115,
                height: 115,
              }}
              resizeMode="contain"
            />
          </View>

          <Text className="text-2xl font-bold text-center text-[#222] mb-5">
            Sign Up
          </Text>

          {/* First Name */}
          <Text className="text-sm font-medium text-gray-600 mb-1">
            First Name
          </Text>
          <TextInput
            className={`bg-[#EDEDED] rounded-xl px-4 py-3 mb-3 text-base ${
              validationErrors.firstName ? "border-2 border-red-500" : ""
            }`}
            placeholder="Enter first name"
            placeholderTextColor="#999"
            value={firstName}
            onChangeText={setFirstName}
            editable={!isVerifying}
          />
          {validationErrors.firstName && (
            <Text className="text-red-500 text-xs mb-2">
              {validationErrors.firstName}
            </Text>
          )}

          {/* Last Name */}
          <Text className="text-sm font-medium text-gray-600 mb-1">
            Last Name
          </Text>
          <TextInput
            className={`bg-[#EDEDED] rounded-xl px-4 py-3 mb-3 text-base ${
              validationErrors.lastName ? "border-2 border-red-500" : ""
            }`}
            placeholder="Enter last name"
            placeholderTextColor="#999"
            value={lastName}
            onChangeText={setLastName}
            editable={!isVerifying}
          />
          {validationErrors.lastName && (
            <Text className="text-red-500 text-xs mb-2">
              {validationErrors.lastName}
            </Text>
          )}

          {/* Email */}
          <Text className="text-sm font-medium text-gray-600 mb-1">
            Email Address
          </Text>
          <TextInput
            className={`bg-[#EDEDED] rounded-xl px-4 py-3 mb-3 text-base ${
              validationErrors.email ? "border-2 border-red-500" : ""
            }`}
            placeholder="Enter email address"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!isVerifying}
          />
          {validationErrors.email && (
            <Text className="text-red-500 text-xs mb-2">
              {validationErrors.email}
            </Text>
          )}

          {/* Mobile */}
          <Text className="text-sm font-medium text-gray-600 mb-1">
            Mobile Number
          </Text>
          <TextInput
            className={`bg-[#EDEDED] rounded-xl px-4 py-3 mb-1 text-base ${
              validationErrors.phone ? "border-2 border-red-500" : ""
            }`}
            placeholder="Enter mobile number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={!isVerifying}
          />
          <Text className="text-xs text-gray-500 mb-3">
            We will verify your mobile number.
          </Text>
          {validationErrors.phone && (
            <Text className="text-red-500 text-xs mb-2">
              {validationErrors.phone}
            </Text>
          )}

          {/* Password */}
          <Text className="text-sm font-medium text-gray-600 mb-1">
            Password
          </Text>
          <TextInput
            className={`bg-[#EDEDED] rounded-xl px-4 py-3 mb-3 text-base ${
              validationErrors.password ? "border-2 border-red-500" : ""
            }`}
            placeholder="Enter password (min 8 characters)"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isVerifying}
          />
          {validationErrors.password && (
            <Text className="text-red-500 text-xs mb-2">
              {validationErrors.password}
            </Text>
          )}

          {/* Confirm Password */}
          <Text className="text-sm font-medium text-gray-600 mb-1">
            Re-enter Password
          </Text>
          <TextInput
            className={`bg-[#EDEDED] rounded-xl px-4 py-3 mb-5 text-base ${
              validationErrors.passwordConfirm ? "border-2 border-red-500" : ""
            }`}
            placeholder="Confirm password"
            placeholderTextColor="#999"
            secureTextEntry
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            editable={!isVerifying}
          />
          {validationErrors.passwordConfirm && (
            <Text className="text-red-500 text-xs mb-2">
              {validationErrors.passwordConfirm}
            </Text>
          )}

          {/* Button */}
          <TouchableOpacity
            onPress={handleSignUp}
            disabled={isVerifying}
            className={`rounded-xl py-4 items-center mb-4 flex-row justify-center ${
              isVerifying ? "bg-gray-400" : "bg-[#59C36A]"
            }`}
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white text-lg font-bold">Sign Up</Text>
            )}
          </TouchableOpacity>

          {/* Login Text */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/signin")}
            disabled={isVerifying}
          >
            <Text className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Text className="text-[#59C36A] font-bold">Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccess}
        title="Account Created!"
        message="Your account has been created. Let's verify your email."
        onDismiss={handleSuccessClose}
        autoClose={true}
        autoCloseDuration={2000}
      />

      {/* Error Modal */}
      <ErrorAlert
        visible={showError}
        title="Registration Failed"
        message={errorMessage}
        onDismiss={() => setShowError(false)}
        onRetry={handleSignUp}
        showRetry={true}
      />
    </SafeAreaView>
  );
}
