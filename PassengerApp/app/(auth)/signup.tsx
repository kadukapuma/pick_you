import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import SuccessModal from "../components/SuccessModal";

import { AuthService } from "../services/auth/authService";

import {
  getUserFriendlyError,
  getValidationErrors,
} from "../utils/errorHandler";

export default function SignUpScreen() {
  const { mobileNumber } = useLocalSearchParams<{
    mobileNumber?: string;
  }>();


  const [isVerifying, setIsVerifying] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);

  const [showError, setShowError] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [firstName, setFirstName] = useState("");

  const [lastName, setLastName] = useState("");

  const [email, setEmail] = useState("");

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Clear validation errors while typing
  useEffect(() => {
    setValidationErrors({});
  }, [firstName, lastName, email]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) {
      errors.firstName = "First name is required";
    }

    if (!lastName.trim()) {
      errors.lastName = "Last name is required";
    }

    // Email optional but validate if entered
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Invalid email format";
    }

    setValidationErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleSignUp = async () => {
    Keyboard.dismiss();

    if (!validateForm()) {
      return;
    }

    if (!mobileNumber) {
      setErrorMessage("Phone number not found. Please try again.");
      setShowError(true);
      return;
    }

    try {
      setIsVerifying(true);

      setShowError(false);

      // Register user
      const registerResult = await AuthService.register({
        first_name: firstName,
        last_name: lastName,
        email: email.trim() || undefined,
        phone: mobileNumber,
      });

      if (!registerResult.success) {
        const friendlyError = getUserFriendlyError(registerResult);

        const fieldErrors = getValidationErrors(registerResult);

        if (Object.keys(fieldErrors).length > 0) {
          setValidationErrors(fieldErrors);
        }

        setErrorMessage(friendlyError);

        setShowError(true);

        setIsVerifying(false);

        return;
      }

      // Show success modal
      setShowSuccess(true);
    } catch (err: any) {
      const friendlyError = getUserFriendlyError(err);

      setErrorMessage(friendlyError);

      setShowError(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);

    router.replace("/(drawer)/(tabs)/home");
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F7F7]">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAwareScrollView
          enableOnAndroid={true}
          extraScrollHeight={20}
          extraHeight={120}
          enableAutomaticScroll={true}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 28,
            paddingTop: 10,
            paddingBottom: 20,
          }}
        >
          <View className="flex-1 justify-center min-h-screen">
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

            {/* Title */}
            <Text className="text-2xl font-bold text-center text-[#222] mb-5">
              Complete Profile
            </Text>

            {/* First Name */}
            <Text className="text-sm font-medium text-gray-600 mb-1">
              First Name
            </Text>

            <TextInput
              className={`bg-[#EDEDED] rounded-xl px-4 py-3 mb-3 text-base ${validationErrors.firstName ? "border-2 border-red-500" : ""
                }`}
              placeholder="Enter first name"
              placeholderTextColor="#999"
              value={firstName}
              onChangeText={setFirstName}
              editable={!isVerifying}
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="givenName"
              autoComplete="name-given"
              returnKeyType="next"
              blurOnSubmit={false}
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
              className={`bg-[#EDEDED] rounded-xl px-4 py-3 mb-3 text-base ${validationErrors.lastName ? "border-2 border-red-500" : ""
                }`}
              placeholder="Enter last name"
              placeholderTextColor="#999"
              value={lastName}
              onChangeText={setLastName}
              editable={!isVerifying}
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="familyName"
              autoComplete="name-family"
              returnKeyType="next"
              blurOnSubmit={false}
            />

            {validationErrors.lastName && (
              <Text className="text-red-500 text-xs mb-2">
                {validationErrors.lastName}
              </Text>
            )}

            {/* Email */}
            <Text className="text-sm font-medium text-gray-600 mb-1">
              Email Address <Text className="text-gray-400">(Optional)</Text>
            </Text>

            <TextInput
              className={`bg-[#EDEDED] rounded-xl px-4 py-3 mb-5 text-base ${validationErrors.email ? "border-2 border-red-500" : ""
                }`}
              placeholder="Enter email address (optional)"
              placeholderTextColor="#999"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!isVerifying}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />

            {validationErrors.email && (
              <Text className="text-red-500 text-xs mb-3 -mt-2">
                {validationErrors.email}
              </Text>
            )}

            {showError && (
              <Text className="text-red-500 text-sm mb-3 text-center">
                {errorMessage}
              </Text>
            )}

            {/* Sign Up Button */}
            <TouchableOpacity
              onPress={handleSignUp}
              disabled={isVerifying}
              activeOpacity={0.8}
              className={`rounded-xl py-4 items-center mb-8 mt-2 flex-row justify-center ${isVerifying ? "bg-gray-400" : "bg-[#59C36A]"
                }`}
            >
              {isVerifying ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white text-lg font-bold">
                  Complete Registration
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/(auth)/signin")}
              activeOpacity={0.8}
              className="items-center"
            >
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>

      <SuccessModal
        visible={showSuccess}
        title="Registration Successful!"
        message="Welcome to PickYou!"
        buttonText="Get Started"
        onClose={handleSuccessClose}
      />
    </SafeAreaView>
  );
}
