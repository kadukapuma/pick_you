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
import { useAuth } from "../hooks/useAuth";

export default function VerifyNumberScreen() {
  const { mobileNumber, testOtp } = useLocalSearchParams<{
    mobileNumber?: string;
    testOtp?: string;
  }>();

  const { pendingRegistration, setPendingRegistration } = useAuth();

  const [code, setCode] = useState(["", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(58);
  const [canResend, setCanResend] = useState(false);
  const [showOtpPopup, setShowOtpPopup] = useState(true);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const displayNumber = mobileNumber || "your email";
  const isCodeComplete = code.every(Boolean);
  const otpCode = code.join("");

  // Show OTP popup on first load (for testing purposes until SMS/Email gateway is set up)
  useEffect(() => {
    if (showOtpPopup && mobileNumber) {
      const message = testOtp
        ? `📧 OTP has been sent to: ${mobileNumber}\n\n🔐 FOR TESTING (DEV): Your OTP code is: ${testOtp}\n\nEnter it in the field below to verify.`
        : `📧 OTP has been sent to: ${mobileNumber}\n\nIn development, check:\n• Your backend logs\n• Email received\n• Backend console output\n\nThe OTP is typically a 4-digit code.\n\nEnter it in the field below to verify.`;

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
      const result = await AuthService.verifyOtp(
        mobileNumber || "",
        otpCode,
        pendingRegistration || undefined,
      );

      if (result.success && result.data) {
        // User exists - login successful
        setPendingRegistration(null);

        Alert.alert("Success", "Logged in successfully!", [
          {
            text: "OK",
            onPress: () => {
              router.replace("/(drawer)/(tabs)/home");
            },
          },
        ]);
      } else if (result.success) {
        // OTP verified but no user data returned - this is a NEW user
        // Navigate to signup screen with phone number
        setPendingRegistration(null);

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
          ? `OTP sent again. Your new OTP is: ${result.otp}`
          : "OTP sent again. Check your email.";
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
            Verify email
          </Text>
        </View>

        <View className="flex-1 px-5 pt-6">
          <View className="mb-6 flex-row items-center rounded-lg bg-[#EAF4FF] px-4 py-3">
            <Text className="flex-1 text-base leading-6 text-[#627088]">
              We have sent a 4 digit code via email to{" "}
              <Text className="font-semibold text-[#263A59]">
                {displayNumber}
              </Text>{" "}
              <Text
                className="text-[#2385C6] underline"
                onPress={() => router.back()}
              >
                Change email
              </Text>
            </Text>
            <Ionicons name="chatbubble-ellipses" size={28} color="#263A59" />
          </View>

          <View className="mb-6 flex-row justify-between gap-3">
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                className={`h-14 flex-1 rounded-lg border-2 bg-white text-center text-2xl font-semibold text-[#263A59] ${
                  index === 0 ? "border-[#263A59]" : "border-[#C4C8D0]"
                }`}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(value) => handleCodeChange(value, index)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(nativeEvent.key, index)
                }
                textContentType="oneTimeCode"
                editable={!isVerifying}
              />
            ))}
          </View>

          <TouchableOpacity
            disabled={!canResend || isVerifying}
            onPress={handleResendOTP}
            className="self-start rounded-full border border-[#C4C8D0] px-7 py-3"
          >
            <Text
              className={`text-base ${
                canResend ? "text-[#2385C6]" : "text-[#D4D7DC]"
              }`}
            >
              Resend code {String(Math.floor(timeLeft / 60)).padStart(2, "0")} :{" "}
              {String(timeLeft % 60).padStart(2, "0")}
            </Text>
          </TouchableOpacity>

          {isVerifying && (
            <Text className="mt-5 text-center text-base font-semibold text-[#59C36A]">
              Verifying email...
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
