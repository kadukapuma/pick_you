import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { rideTheme } from "./rideUtils";

type RideScreenShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  scroll?: boolean;
};

export default function RideScreenShell({ title, subtitle, children, right, scroll = true }: RideScreenShellProps) {
  const insets = useSafeAreaInsets();
  const content = <View style={styles.content}>{children}</View>;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={24} color={rideTheme.ink} />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
        {right || <View style={styles.headerSpacer} />}
      </View>
      {scroll ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}> 
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.fixedContent, { paddingBottom: insets.bottom + 16 }]}>{content}</View>
      )}
    </SafeAreaView>
  );
}

export function RideCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryRideButton({ label, onPress, disabled, icon }: { label: string; onPress: () => void; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.85} style={[styles.primaryButton, disabled && styles.disabledButton]}>
      {icon ? <Ionicons name={icon} size={18} color="#FFFFFF" /> : null}
      <Text style={styles.primaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function SecondaryRideButton({ label, onPress, icon, danger }: { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; danger?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.secondaryButton, danger && styles.dangerButton]}>
      {icon ? <Ionicons name={icon} size={18} color={danger ? rideTheme.danger : rideTheme.ink} /> : null}
      <Text style={[styles.secondaryText, danger && styles.dangerText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: rideTheme.bg },
  header: { minHeight: 76, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: rideTheme.bg },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(15,23,42,0.08)" },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { flex: 1, color: rideTheme.ink, fontSize: 20, fontWeight: "900" },
  subtitle: { color: rideTheme.muted, fontSize: 13, marginTop: 3, lineHeight: 18 },
  headerSpacer: { width: 44, height: 44 },
  scrollContent: { paddingHorizontal: 16 },
  fixedContent: { flex: 1, paddingHorizontal: 16 },
  content: { gap: 14 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "rgba(15,23,42,0.08)", shadowColor: "#0F172A", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  primaryButton: { minHeight: 54, borderRadius: 18, backgroundColor: rideTheme.green, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 18 },
  disabledButton: { opacity: 0.55 },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  secondaryButton: { minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: rideTheme.line, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 16 },
  secondaryText: { color: rideTheme.ink, fontSize: 14, fontWeight: "800" },
  dangerButton: { borderColor: "rgba(220,38,38,0.25)", backgroundColor: "#FEF2F2" },
  dangerText: { color: rideTheme.danger },
});

