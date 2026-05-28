import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthService } from "../services/auth/authService";
import { useAuth } from "../context/AuthContext";

export default function VerifyNumberScreen() {
  const { mobileNumber, testOtp } = useLocalSearchParams<{
    mobileNumber?: string;
    testOtp?: string;
  }>();

  const { updateUser } = useAuth();

  const [code, setCode] = useState(["", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(58);
  const [canResend, setCanResend] = useState(false);
  const [showOtpPopup, setShowOtpPopup] = useState(true);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const displayNumber = mobileNumber || "your phone number";
  const isCodeComplete = code.every(Boolean);
  const otpCode = code.join("");

  // Show OTP popup on first load (for testing purposes until SMS/Email gateway is set up)
  useEffect(() => {
    if (showOtpPopup && mobileNumber) {
      const message = testOtp
        ? "📧 OTP has been sent to: \n\n🔐 FOR TESTING (DEV): Your OTP code is: \n\nEnter it in the field below to verify."
        : "📧 OTP has been sent to: \n\nIn development, check:\n• Your backend logs\n• Email received\n• Backend console output\n\nThe OTP is typically a 4-digit code.\n\nEnter it in the field below to verify.";

      // In development, show a popup with info on how to get the OTP
      Alert.alert(
        "🔐 OTP for Testing",
        message,
        [
          {
            text: "OK, I have the code",
            onPress: () => setShowOtpPopup(false),
          },
        ],
        { cancelable: false },
      );
    }
  }, [mobileNumber, testOtp]);

  // Timer for resend countdown
  useEffect(() => {
    if (timeLeft === 0) {
      setCanResend(true);
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  // Auto-verify when code is complete
  useEffect(() => {
    if (isCodeComplete && !isVerifying) {
      verifyOTP();
    }
  }, [isCodeComplete]);

  const verifyOTP = async () => {
    if (!otpCode || otpCode.length !== 4) return;

    setIsVerifying(true);
    try {
      // Verify OTP
      const result = await AuthService.verifyOtp(mobileNumber || "", otpCode);

      if (result.success) {
        if (result.data?.registered) {
          // User exists - login successful
          // ✅ UPDATE AUTH CONTEXT BEFORE NAVIGATION
          if (result.data.user) {
            updateUser(result.data.user);
            console.log("✅ User context updated after login");
          }

          Alert.alert("Success", "Logged in successfully!", [
            {
              text: "OK",
              onPress: () => {
                router.replace("/(drawer)/(tabs)/home");
              },
            },
          ]);
        } else {
          // New User - store user data for signup
          if (result.data?.user) {
            updateUser(result.data.user);
            console.log("✅ User context updated for new registration");
          }

          Alert.alert("Welcome!", "Complete your profile to get started", [
            {
              text: "OK",
              onPress: () => {
                router.replace({
                  pathname: "/(auth)/signup",
                  params: { mobileNumber },
                });
              },
            },
          ]);
        }
      } else {
        // Verification failed
        Alert.alert(
          "Verification Failed",
          result.message || "Invalid OTP. Please try again.",
          [
            {
              text: "OK",
              onPress: () => {
                setCode(["", "", "", ""]);
                inputRefs.current[0]?.focus();
              },
            },
          ],
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "An error occurred. Please try again.",
        [
          {
            text: "OK",
            onPress: () => {
              setCode(["", "", "", ""]);
              inputRefs.current[0]?.focus();
            },
          },
        ],
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    try {
      const result = await AuthService.sendOtp(mobileNumber || "");
      if (result.success) {
        setTimeLeft(58);
        setCanResend(false);
        setCode(["", "", "", ""]);
        inputRefs.current[0]?.focus();

        const successMsg = result.otp
          ? "OTP sent again. Your new OTP is: "
          : "OTP sent again. Check your SMS.";
        Alert.alert("Success", successMsg);
      } else {
        Alert.alert("Error", result.message || "Failed to resend OTP");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to resend OTP");
    }
  };

  const handleCodeChange = (value: string, index: number) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextCode = [...code];
    nextCode[index] = digit;
    setCode(nextCode);

    if (digit && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="border-b border-gray-200 bg-[#FFF8FF] px-5 pb-9 pt-7">
          <Text className="text-center text-2xl font-bold text-black">
            Verify phone
          </Text>
        </View>

        <View className="flex-1 px-5 pt-6">
          <View className="mb-6 flex-row items-center rounded-lg bg-[#EAF4FF] px-4 py-3">
            <Ionicons name="information-circle" size={20} color="#0071E3" />
            <Text className="ml-2 flex-1 text-sm text-gray-600">
              We sent a code to
              <Text className="font-semibold">{displayNumber}</Text>
            </Text>
          </View>

          {/* OTP Input Fields */}
          <View className="mb-6 flex-row justify-between gap-2">
            {[0, 1, 2, 3].map((index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                className="flex-1 rounded-lg border border-gray-300 bg-white text-center text-2xl font-bold text-black"
                style={{ height: 60 }}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={1}
                value={code[index]}
                onChangeText={(value) => handleCodeChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e.nativeEvent.key, index)}
                editable={!isVerifying}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Resend Section */}
          <View className="mb-6 flex-row items-center justify-center">
            <Text className="text-sm text-gray-600">
              {canResend ? "Didn't receive? " : `Resend in ${timeLeft}s `}
            </Text>
            {canResend && (
              <TouchableOpacity
                onPress={handleResendOTP}
                disabled={isVerifying}
              >
                <Text className="text-sm font-semibold text-blue-600">
                  Resend OTP
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Manual Verify Button (optional) */}
          {isCodeComplete && (
            <TouchableOpacity
              onPress={verifyOTP}
              disabled={isVerifying}
              className={`rounded-lg py-4 ${
                isVerifying ? "bg-gray-400" : "bg-[#59C36A]"
              }`}
            >
              <Text className="text-center font-semibold text-white">
                {isVerifying ? "Verifying..." : "Verify Code"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
