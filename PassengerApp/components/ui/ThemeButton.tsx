import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

type ThemeButtonVariant = "primary" | "outline" | "danger" | "ghost";
type ThemeButtonSize = "medium" | "large";

type ThemeButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ThemeButtonVariant;
  size?: ThemeButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

const variantStyles = {
  primary: {
    button: {
      backgroundColor: "#0B8F62",
      borderColor: "#0B8F62",
    },
    text: "#FFFFFF",
    loader: "#FFFFFF",
  },
  outline: {
    button: {
      backgroundColor: "rgba(255,255,255,0.14)",
      borderColor: "rgba(11,143,98,0.36)",
    },
    text: "#063D31",
    loader: "#063D31",
  },
  danger: {
    button: {
      backgroundColor: "rgba(220,38,38,0.04)",
      borderColor: "rgba(220,38,38,0.28)",
    },
    text: "#DC2626",
    loader: "#DC2626",
  },
  ghost: {
    button: {
      backgroundColor: "transparent",
      borderColor: "rgba(153,177,169,0.42)",
    },
    text: "#18231F",
    loader: "#18231F",
  },
};

export default function ThemeButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  size = "large",
  icon,
  rightIcon,
  style,
}: ThemeButtonProps) {
  const colors = variantStyles[variant];
  const isDisabled = disabled || loading;
  const textColor = isDisabled ? "rgba(80,102,95,0.62)" : colors.text;

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        size === "large" ? styles.large : styles.medium,
        colors.button,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.loader} />
      ) : icon ? (
        <Ionicons name={icon} size={19} color={textColor} />
      ) : null}
      <Text style={[styles.label, { color: textColor }]} numberOfLines={1}>
        {label}
      </Text>
      {!loading && rightIcon ? (
        <Ionicons name={rightIcon} size={19} color={textColor} />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1.3,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  large: {
    minHeight: 58,
  },
  medium: {
    minHeight: 48,
  },
  label: {
    fontSize: 15,
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.72,
  },
});
