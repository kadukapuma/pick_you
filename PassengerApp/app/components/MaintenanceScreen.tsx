import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";

export default function MaintenanceScreen() {
  const { logout } = useAuth();
  const pulse = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();
    bobLoop.start();

    return () => {
      pulseLoop.stop();
      bobLoop.stop();
    };
  }, [bob, pulse]);

  const orbScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });

  const orbOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0.08],
  });

  const logoLift = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.replace("/(auth)/signin");
    } catch (error) {
      router.replace("/(auth)/signin");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <View className="flex-1 bg-[#0F172A]">
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -40,
          right: -28,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: "rgba(89, 195, 106, 0.16)",
          transform: [{ scale: orbScale }],
          opacity: orbOpacity,
        }}
      />

      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: 70,
          left: -30,
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: "rgba(255, 255, 255, 0.06)",
          transform: [{ scale: orbScale }],
          opacity: orbOpacity,
        }}
      />

      <View className="flex-1 items-center justify-center px-8">
        <View className="w-full max-w-[420px] rounded-[32px] border border-white/10 bg-white/6 px-7 py-10 items-center">
          <Animated.View style={{ transform: [{ translateY: logoLift }] }}>
            <View className="h-28 w-28 items-center justify-center rounded-full bg-white/10 mb-6">
              <Image
                source={require("../../assets/images/logo.png")}
                style={{ width: 120, height: 120, resizeMode: "contain" }}
              />
            </View>
          </Animated.View>

          <View className="mb-4 rounded-full bg-[#F59E0B]/15 px-4 py-2 border border-[#F59E0B]/25">
            <Text className="text-[#FDBA74] text-xs font-bold tracking-[2px] uppercase">
              Maintenance Mode
            </Text>
          </View>

          <Text className="text-white text-3xl font-extrabold text-center leading-[38px]">
            We&apos;ll be back soon
          </Text>

          <Text className="text-[#CBD5E1] text-center text-base leading-6 mt-4">
            The passenger app is temporarily unavailable while we make a few
            improvements. Please check back in a moment.
          </Text>

          <View className="mt-8 w-full rounded-3xl bg-white/8 border border-white/10 px-5 py-4">
            <Text className="text-white text-sm font-semibold mb-1">
              What this means
            </Text>
            <Text className="text-[#CBD5E1] text-sm leading-5">
              Ride booking, login, and account features are paused until the
              system is restored.
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.85}
            disabled={isLoggingOut}
            className="mt-8 w-full rounded-2xl bg-[#59C36A] py-4 items-center shadow-lg shadow-black/20"
          >
            <Text className="text-white text-base font-bold">
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
