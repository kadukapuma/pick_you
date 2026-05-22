import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../hooks/useAuth";

export default function SignInScreen() {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Clear error when user starts typing
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [email, password]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!email.trim()) errors.email = "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "Invalid email format";
    if (!password.trim()) errors.password = "Password is required";
    if (password.length < 8)
      errors.password = "Password must be at least 8 characters";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    try {
      await login(email, password);
      // On success, navigate to home
      router.replace("/(drawer)/(tabs)/home");
    } catch (err: any) {
      Alert.alert("Login Failed", error || err.message || "Please try again");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F7F7]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 px-7 justify-center">
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
            Welcome Back!
          </Text>

          <Text className="text-base text-center text-gray-500 mb-10">
            Sign in to continue
          </Text>

          {/* Error Message */}
          {error && (
            <View className="bg-red-100 border border-red-400 rounded-lg px-4 py-3 mb-4">
              <Text className="text-red-700 text-sm">{error}</Text>
            </View>
          )}

          {/* Email */}
          <Text className="text-sm font-medium text-gray-600 mb-2">
            Email Address
          </Text>

          <TextInput
            className={`bg-[#EDEDED] rounded-xl px-4 py-4 mb-5 text-base ${
              validationErrors.email ? "border-2 border-red-500" : ""
            }`}
            placeholder="Enter email address"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
          />
          {validationErrors.email && (
            <Text className="text-red-500 text-xs mb-2">
              {validationErrors.email}
            </Text>
          )}

          {/* Password */}
          <Text className="text-sm font-medium text-gray-600 mb-2">
            Password
          </Text>

          <TextInput
            className={`bg-[#EDEDED] rounded-xl px-4 py-4 mb-3 text-base ${
              validationErrors.password ? "border-2 border-red-500" : ""
            }`}
            placeholder="Enter password"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
          />
          {validationErrors.password && (
            <Text className="text-red-500 text-xs mb-3">
              {validationErrors.password}
            </Text>
          )}

          {/* Forgot Password */}
          <TouchableOpacity className="mb-7" disabled={isLoading}>
            <Text className="text-right text-[#59C36A] text-sm font-semibold">
              Forgot password?
            </Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            onPress={handleSignIn}
            disabled={isLoading}
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
              <Text className="text-white text-lg font-bold">Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Bottom Text */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/signup")}
            disabled={isLoading}
          >
            <Text className="text-center text-sm text-gray-500">
              Don’t have an account?{" "}
              <Text className="text-[#59C36A] font-bold">Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
