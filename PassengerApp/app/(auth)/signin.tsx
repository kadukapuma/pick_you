import { router } from "expo-router";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Keyboard,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { AuthService } from "../../src/services/auth/authService";

export default function SignInScreen() {
  const [phoneNumber, setPhoneNumber] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Clear error when user types
  useEffect(() => {
    setValidationErrors({});
  }, [phoneNumber]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!phoneNumber.trim()) {
      errors.phoneNumber = "Phone number is required";
    } else if (phoneNumber.replace(/\D/g, "").length < 10) {
      errors.phoneNumber = "Phone number must be at least 10 digits";
    }

    setValidationErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleSignIn = async () => {
    Keyboard.dismiss();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Send OTP
      const result = await AuthService.sendOtp(phoneNumber);

      if (result.success) {
        router.push({
          pathname: "/(auth)/verify-number",
          params: {
            mobileNumber: phoneNumber,
            testOtp: result.otp?.toString(),
          },
        });
      } else {
        setValidationErrors({
          phoneNumber: result.message || "Failed to send OTP",
        });
      }
    } catch (err: any) {
      setValidationErrors({
        phoneNumber: err.message || "Failed to send OTP",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F7F7]">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAwareScrollView
          enableOnAndroid={true}
          extraScrollHeight={20}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          enableAutomaticScroll={true}
          contentContainerStyle={{
            flexGrow: 1,
          }}
        >
          <View className="flex-1 px-7 justify-center min-h-screen">
            {/* Logo */}
            <View className="items-center mb-2">
              <Image
                source={require("../../assets/images/logo.png")}
                style={{
                  width: 130,
                  height: 130,
                }}
                resizeMode="contain"
              />
            </View>

            {/* Heading */}
            <Text className="text-3xl font-extrabold text-center text-[#222] mb-2">
              Welcome
            </Text>

            <Text className="text-base text-center text-gray-500 mb-10">
              Enter your phone number to get started
            </Text>

            {/* Phone Number */}
            <Text className="text-sm font-medium text-gray-600 mb-2">
              Phone Number
            </Text>

            <TextInput
              className="bg-[#EDEDED] rounded-xl px-4 py-4 mb-5 text-base"
              placeholder="0771234567"
              placeholderTextColor="#999"
              keyboardType={Platform.OS === "ios" ? "number-pad" : "phone-pad"}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              editable={!isLoading}
              autoFocus={false}
              returnKeyType="done"
              blurOnSubmit={true}
              textContentType="telephoneNumber"
              autoComplete="tel"
              importantForAutofill="yes"
              maxLength={15}
              onSubmitEditing={handleSignIn}
            />

            {/* Validation Error */}
            {validationErrors.phoneNumber && (
              <Text className="text-red-500 text-xs mb-5">
                {validationErrors.phoneNumber}
              </Text>
            )}

            {/* Sign In Button */}
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
              className={`rounded-xl py-4 items-center mb-5 flex-row justify-center ${
                isLoading ? "bg-gray-400" : "bg-[#59C36A]"
              }`}
              style={{
                shadowColor: "#59C36A",
                shadowOpacity: isLoading ? 0 : 0.2,
                shadowRadius: 8,
                elevation: isLoading ? 0 : 5,
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white text-lg font-bold">Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
