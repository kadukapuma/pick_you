import { ReactNode, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleProp,
  ViewStyle,
} from "react-native";

type ScreenTransitionProps = {
  children: ReactNode;
  delayMs?: number;
  distance?: number;
  durationMs?: number;
  style?: StyleProp<ViewStyle>;
};

export default function ScreenTransition({
  children,
  delayMs = 40,
  distance = 10,
  durationMs = 180,
  style,
}: ScreenTransitionProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!mounted) return;
      setReduceMotion(enabled);

      if (enabled) {
        opacity.setValue(1);
        translateY.setValue(0);
        return;
      }

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: durationMs,
          delay: delayMs,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: durationMs,
          delay: delayMs,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });

    return () => {
      mounted = false;
    };
  }, [delayMs, distance, durationMs, opacity, translateY]);

  return (
    <Animated.View
      style={[
        style,
        reduceMotion
          ? null
          : {
              opacity,
              transform: [{ translateY }],
            },
      ]}
    >
      {children}
    </Animated.View>
  );
}
