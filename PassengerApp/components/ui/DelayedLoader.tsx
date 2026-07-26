import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

type DelayedLoaderVariant = "screen" | "inline";

type DelayedLoaderProps = {
  visible?: boolean;
  label?: string;
  delayMs?: number;
  variant?: DelayedLoaderVariant;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
};

export default function DelayedLoader({
  visible = true,
  label,
  delayMs = 220,
  variant = "inline",
  backgroundColor = "#F2FBF8",
  style,
}: DelayedLoaderProps) {
  const [shouldShow, setShouldShow] = useState(delayMs <= 0);

  useEffect(() => {
    if (!visible) {
      setShouldShow(false);
      return;
    }

    if (delayMs <= 0) {
      setShouldShow(true);
      return;
    }

    const timer = setTimeout(() => setShouldShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, visible]);

  if (!visible) return null;

  if (!shouldShow) {
    return variant === "screen" ? (
      <View style={[styles.screen, { backgroundColor }, style]} />
    ) : null;
  }

  return (
    <View
      style={[
        variant === "screen" ? styles.screen : styles.inline,
        variant === "screen" && { backgroundColor },
        style,
      ]}
    >
      <View style={styles.indicatorWrap}>
        <ActivityIndicator size="small" color="#0B8F62" />
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inline: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  indicatorWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,143,98,0.08)",
    borderWidth: 1,
    borderColor: "rgba(11,143,98,0.18)",
  },
  label: {
    color: "#50665F",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10,
  },
});
