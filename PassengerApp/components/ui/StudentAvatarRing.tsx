import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StyleProp, View, ViewStyle } from "react-native";

interface StudentAvatarRingProps {
  active: boolean;
  size: number;
  ringWidth?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/** Wraps a passenger avatar with a green ring once their student status is approved. */
export default function StudentAvatarRing({
  active,
  size,
  ringWidth = 3,
  style,
  children,
}: StudentAvatarRingProps) {
  if (!active) {
    return <View style={style}>{children}</View>;
  }

  const outerSize = size + ringWidth * 2;

  return (
    <LinearGradient
      colors={["#8FE3A6", "#0B9E54", "#04502B"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          width: outerSize,
          height: outerSize,
          borderRadius: outerSize / 2,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
}
