import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthService } from "../../services/auth/authService";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../hooks/useToast";
import { getFriendlyError, SuccessMessages } from "../../utils/errorMessages";
import InlineError from "../../components/ui/InlineError";

export default function VerifyNumberScreen() {
  const { mobileNumber, testOtp } = useLocalSearchParams<{
    mobileNumber?: string;
    testOtp?: string;
  }>();

  const { updateUser } = useAuth();
  const { showToast } = useToast();

  const [code, setCode] = useState(["", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(58);
  const [canResend, setCanResend] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [showOtpPopup, setShowOtpPopup] = useState(true);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const displayNumber = mobileNumber || "your phone number";
  const isCodeComplete = code.every(Boolean);
  const otpCode = code.join("");

  // Show OTP popup only when the backend/dev mock explicitly returns a test OTP.
  useEffect(() => {
    if (showOtpPopup && mobileNumber && testOtp) {
      Alert.alert(
        "🔐 OTP for Testing",
        `OTP has been sent to ${mobileNumber}.\n\nFOR TESTING (DEV): Your OTP code is ${testOtp}.\n\nEnter it in the field below to verify.`,
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

  // Clear inline error when user types
  useEffect(() => {
    if (code.some(Boolean)) setOtpError(null);
  }, [code]);

  // Auto-verify when code is complete
  useEffect(() => {
    if (isCodeComplete && !isVerifying) {
      verifyOTP();
    }
  }, [isCodeComplete]);

  const verifyOTP = async () => {
    if (!otpCode || otpCode.length !== 4) return;

    setIsVerifying(true);
    setOtpError(null);

    try {
      const result = await AuthService.verifyOtp(mobileNumber || "", otpCode);

      if (result.success) {
        if (result.data?.registered) {
          // Existing user — login
          if (result.data.user) {
            updateUser(result.data.user);
            if (__DEV__) console.log("✅ User context updated after login");
          }
          showToast(SuccessMessages.LOGIN, "success");
          setTimeout(() => router.replace("/(drawer)/(tabs)/home"), 400);
        } else {
          // New user — go to signup
          if (result.data?.user) {
            updateUser(result.data.user);
            if (__DEV__) console.log("✅ User context updated for new registration");
          }
          showToast("Welcome! Let's complete your profile.", "success");
          setTimeout(
            () =>
              router.replace({
                pathname: "/(auth)/signup",
                params: { mobileNumber },
              }),
            400,
          );
        }
      } else {
        // OTP failed — show inline error, clear inputs
        setOtpError(getFriendlyError(result.message));
        setCode(["", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch (error: any) {
      setOtpError(getFriendlyError(error?.message));
      setCode(["", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
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
        setOtpError(null);
        inputRefs.current[0]?.focus();

        const successMsg = result.otp
          ? `OTP sent again. Your new OTP is: ${result.otp}`
          : "OTP sent again. Check your SMS.";
        Alert.alert("Success", successMsg);
      } else {
        showToast(getFriendlyError(result.message), "error");
      }
    } catch (error: any) {
      showToast(getFriendlyError(error?.message), "error");
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
              We sent a code to{" "}
              <Text className="font-semibold">{displayNumber}</Text>
            </Text>
          </View>

          {/* OTP Input Fields */}
          <View className="mb-2 flex-row justify-between gap-2">
            {[0, 1, 2, 3].map((index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                className={`flex-1 rounded-lg border bg-white text-center text-2xl font-bold text-black ${otpError ? "border-red-400" : "border-gray-300"
                  }`}
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

          {/* Inline OTP error */}
          <InlineError message={otpError} marginTop={6} />

          {/* Resend Section */}
          <View className="mt-6 mb-6 flex-row items-center justify-center">
            <Text className="text-sm text-gray-600">
              {canResend ? "Didn't receive? " : `Resend in ${timeLeft}s `}
            </Text>
            {canResend && (
              <TouchableOpacity onPress={handleResendOTP} disabled={isVerifying}>
                <Text className="text-sm font-semibold text-blue-600">
                  Resend OTP
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Manual Verify Button */}
          {isCodeComplete && (
            <TouchableOpacity
              onPress={verifyOTP}
              disabled={isVerifying}
              className={`rounded-lg py-4 ${isVerifying ? "bg-gray-400" : "bg-[#59C36A]"
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
