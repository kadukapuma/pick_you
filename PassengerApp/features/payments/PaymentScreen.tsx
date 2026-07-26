import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { paymentTheme } from "./paymentTheme";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  canGoBack?: boolean;
  keyboardAware?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export default function PaymentScreen({
  title,
  subtitle,
  children,
  footer,
  canGoBack = true,
  keyboardAware = false,
  contentStyle,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={keyboardAware && Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          {canGoBack ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              style={styles.back}
              activeOpacity={0.82}
            >
              <Ionicons name="chevron-back" size={23} color={paymentTheme.ink} />
            </TouchableOpacity>
          ) : (
            <View style={styles.back} />
          )}
          <View style={styles.heading}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <View style={styles.back} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: footer ? 24 : insets.bottom + 28 },
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        {footer ? (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function PaymentCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: object;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PaymentButton({
  label,
  icon,
  onPress,
  variant = "primary",
  disabled = false,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.86}
      style={[
        styles.button,
        variant === "secondary" && styles.secondaryButton,
        variant === "danger" && styles.dangerButton,
        disabled && styles.disabled,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={19}
          color={variant === "primary" ? paymentTheme.white : variant === "danger" ? paymentTheme.danger : paymentTheme.ink}
        />
      ) : null}
      <Text
        style={[
          styles.buttonText,
          variant !== "primary" && styles.secondaryButtonText,
          variant === "danger" && styles.dangerButtonText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: paymentTheme.background },
  header: {
    minHeight: 78,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: paymentTheme.white,
    borderWidth: 1,
    borderColor: "rgba(15,35,29,0.08)",
  },
  heading: { flex: 1, minWidth: 0, alignItems: "center" },
  title: {
    color: paymentTheme.ink,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: paymentTheme.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
    textAlign: "center",
  },
  content: { paddingHorizontal: 16, gap: 14 },
  card: {
    backgroundColor: paymentTheme.white,
    borderRadius: 22,
    padding: 17,
    borderWidth: 1,
    borderColor: "rgba(15,35,29,0.08)",
    shadowColor: "#10231D",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: paymentTheme.white,
    borderTopWidth: 1,
    borderTopColor: paymentTheme.line,
  },
  button: {
    minHeight: 56,
    paddingHorizontal: 18,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: paymentTheme.green,
  },
  secondaryButton: {
    backgroundColor: paymentTheme.white,
    borderWidth: 1,
    borderColor: paymentTheme.line,
  },
  dangerButton: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: paymentTheme.white, fontSize: 15, fontWeight: "900" },
  secondaryButtonText: { color: paymentTheme.ink },
  dangerButtonText: { color: paymentTheme.danger },
});

