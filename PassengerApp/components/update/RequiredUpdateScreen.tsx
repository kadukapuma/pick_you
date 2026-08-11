import { Alert, Image, Linking, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { AppUpdatePolicy } from "../../services/notifications/appUpdate";

const STEPS = [
  "Tap Download below to open our website.",
  "Download the latest APK from picku.lk.",
  "Open the downloaded file and allow installs from this source if asked.",
  "Install the update and reopen PickU.",
];

type Props = {
  policy: AppUpdatePolicy;
  dismissible?: boolean;
  onClose?: () => void;
};

export default function RequiredUpdateScreen({ policy, dismissible = false, onClose }: Props) {
  const download = async () => {
    if (!policy?.website_url || !(await Linking.canOpenURL(policy.website_url))) {
      Alert.alert("Download unavailable", "The download page could not be opened. Please try again later.");
      return;
    }
    await Linking.openURL(policy.website_url);
  };

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
        {dismissible && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color="#18231F" />
          </TouchableOpacity>
        )}

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>New version available</Text>
              <Text style={styles.title}>{policy?.title || "Update"}</Text>
            </View>
            <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
          </View>

          <Text style={styles.message}>{policy?.message}</Text>

          {!!policy?.latest_version && (
            <View style={styles.versionPill}>
              <Ionicons name="pricetag-outline" size={13} color="#20B768" />
              <Text style={styles.versionText}>Version {policy.latest_version}</Text>
            </View>
          )}

          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>How to update</Text>
            {STEPS.map((step, index) => (
              <View style={styles.stepRow} key={step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={download} activeOpacity={0.85}>
            <Ionicons name="download-outline" size={21} color="#FFF" />
            <Text style={styles.buttonText}>Download update</Text>
          </TouchableOpacity>
          <Text style={styles.note}>You'll be taken to picku.lk to get the latest APK.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#F2FBF8" },
  circle1: {
    position: "absolute", top: -40, right: -60, width: 220, height: 220,
    borderRadius: 110, backgroundColor: "rgba(32, 183, 104, 0.12)",
  },
  circle2: {
    position: "absolute", bottom: 100, left: -80, width: 280, height: 280,
    borderRadius: 140, backgroundColor: "rgba(32, 183, 104, 0.08)",
  },
  safe: { flex: 1 },
  closeButton: {
    alignSelf: "flex-end", marginRight: 20, marginTop: 8, width: 36, height: 36,
    borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(24,35,31,0.06)",
  },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginTop: 12 },
  headerText: { flex: 1, paddingRight: 16 },
  eyebrow: { fontSize: 13, fontWeight: "700", color: "#20B768", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 },
  title: { fontSize: 32, fontWeight: "900", color: "#18231F" },
  logo: { width: 52, height: 52, borderRadius: 14 },
  message: { fontSize: 15, lineHeight: 22, color: "#52635D", marginTop: 18 },
  versionPill: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    backgroundColor: "#E1F7EA", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginTop: 14,
  },
  versionText: { fontSize: 12, fontWeight: "700", color: "#20B768" },
  stepsCard: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, marginTop: 28,
    elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10,
  },
  stepsTitle: { fontSize: 15, fontWeight: "800", color: "#18231F", marginBottom: 14 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  stepNumber: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: "#20B768",
    alignItems: "center", justifyContent: "center", marginRight: 12, marginTop: 1,
  },
  stepNumberText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20, color: "#334037" },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 6 },
  button: {
    height: 56, borderRadius: 16, backgroundColor: "#20B768", flexDirection: "row", gap: 9,
    alignItems: "center", justifyContent: "center", elevation: 2,
    shadowColor: "#20B768", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12,
  },
  buttonText: { color: "#FFF", fontSize: 17, fontWeight: "800" },
  note: { marginTop: 12, fontSize: 12, color: "#82908B", textAlign: "center" },
});
