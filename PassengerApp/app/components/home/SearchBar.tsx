import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";

type SearchBarProps = {
  compact?: boolean;
  onPress?: () => void;
};

export default function SearchBar({
  compact = false,
  onPress,
}: SearchBarProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;

  const animatePress = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 24,
      bounciness: 6,
    }).start();
  };

  const handlePressIn = () => {
    animatePress(0.97);
    Animated.timing(shadowAnim, {
      toValue: 1,
      duration: 120,
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = () => {
    animatePress(1);
    Animated.timing(shadowAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 28,
        bounciness: 4,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 22,
        bounciness: 8,
      }),
    ]).start(() => onPress?.());
  };

  const shadowOpacity = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.06, 0.14],
  });

  const shadowRadius = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 18],
  });

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={{
            backgroundColor: "white",
            borderRadius: compact ? 20 : 24,
            paddingHorizontal: compact ? 14 : 18,
            paddingVertical: compact ? 10 : 14,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#20B768",
            shadowOpacity,
            shadowRadius,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
            borderWidth: 1.5,
            borderColor: "#E8F9F1",
          }}
        >
          {/* LEFT: pulsing location dot */}
          <View
            style={{ position: "relative", width: 24, alignItems: "center" }}
          >
            <Ionicons name="location" size={20} color="#22B36A" />
          </View>

          {/* CENTER: placeholder */}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text
              style={{
                fontSize: compact ? 13 : 15,
                color: "#9CA3AF",
                fontWeight: "500",
              }}
            >
              Where are you going?
            </Text>
          </View>

          {/* DIVIDER + HOME */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View
              style={{
                width: 1,
                height: compact ? 20 : 24,
                backgroundColor: "#E5E7EB",
              }}
            />
            <View
              style={{
                backgroundColor: "#F3F4F6",
                borderRadius: compact ? 10 : 12,
                padding: compact ? 6 : 8,
              }}
            >
              <Ionicons
                name="home-outline"
                size={compact ? 16 : 18}
                color="#374151"
              />
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
