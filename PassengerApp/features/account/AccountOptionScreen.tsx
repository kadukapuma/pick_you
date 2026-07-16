import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenTransition from "../../components/ui/ScreenTransition";
import ThemeButton from "../../components/ui/ThemeButton";

type AccountInfoRow = {
  label: string;
  value: string;
};

type AccountOptionScreenProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  rows?: AccountInfoRow[];
  children?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

export default function AccountOptionScreen({
  title,
  subtitle,
  icon,
  rows = [],
  children,
  actionLabel,
  onAction,
}: AccountOptionScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.84}>
          <Ionicons name="arrow-back" size={22} color="#063D31" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTransition>
        <View style={styles.profileLikeHeader}>
          <View style={styles.heroIcon}>
            <Ionicons name={icon} size={30} color="#063D31" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>

        {rows.length > 0 ? (
          <View style={styles.statsRow}>
            {rows.slice(0, 3).map((row) => (
              <View key={row.label} style={styles.statTile}>
                <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{row.value}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>{row.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {rows.length > 3 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            {rows.slice(3).map((row) => (
              <View key={row.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {children}

        {actionLabel && onAction ? (
          <ThemeButton
            label={actionLabel}
            onPress={onAction}
            rightIcon="chevron-forward"
            variant="outline"
            style={styles.actionButton}
          />
        ) : null}
        </ScreenTransition>
      </ScrollView>
    </View>
  );
}

export function AccountNoticeCard({ title, text, icon = "information-circle-outline" }: { title: string; text: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.noticeCard}>
      <View style={styles.noticeIcon}>
        <Ionicons name={icon} size={21} color="#063D31" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.noticeTitle}>{title}</Text>
        <Text style={styles.noticeText}>{text}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9AA9A4" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2FBF8" },
  header: { height: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.72)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(221,235,229,0.82)" },
  headerTitle: { color: "#18231F", fontSize: 18, fontWeight: "900" },
  headerSpacer: { width: 40 },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 110 },
  profileLikeHeader: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  heroIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: "#DDF7ED", alignItems: "center", justifyContent: "center", marginRight: 17 },
  heroCopy: { flex: 1, minWidth: 0 },
  title: { color: "#18231F", fontSize: 25, fontWeight: "900" },
  subtitle: { color: "#697872", fontSize: 13, fontWeight: "600", lineHeight: 19, marginTop: 5 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 26 },
  statTile: { flex: 1, minHeight: 74, borderRadius: 18, backgroundColor: "transparent", borderWidth: 1.2, borderColor: "rgba(153,177,169,0.38)", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  statValue: { color: "#18231F", fontSize: 17, fontWeight: "900" },
  statLabel: { color: "#697872", fontSize: 12, fontWeight: "700", marginTop: 6 },
  section: { marginBottom: 22 },
  sectionTitle: { color: "#6A7772", fontSize: 13, fontWeight: "800", marginBottom: 10 },
  infoRow: { minHeight: 62, borderRadius: 18, backgroundColor: "transparent", borderWidth: 1.2, borderColor: "rgba(153,177,169,0.38)", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 10, gap: 12 },
  infoLabel: { color: "#697872", fontSize: 13, fontWeight: "800" },
  infoValue: { flex: 1, color: "#18231F", fontSize: 14, fontWeight: "900", textAlign: "right" },
  noticeCard: { minHeight: 70, borderRadius: 18, backgroundColor: "transparent", borderWidth: 1.2, borderColor: "rgba(153,177,169,0.38)", flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, marginBottom: 10 },
  noticeIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  noticeTitle: { color: "#28342F", fontSize: 16, fontWeight: "800" },
  noticeText: { color: "#71817B", fontSize: 12, fontWeight: "600", lineHeight: 18, marginTop: 3 },
  actionButton: { marginTop: 8 },
});









