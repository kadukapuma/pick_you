import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AppUpdatePolicy } from "../../services/notifications/appUpdate";

export default function RequiredUpdateScreen({ policy }: { policy: AppUpdatePolicy }) {
  const download = async () => {
    if (!policy.website_url || !(await Linking.canOpenURL(policy.website_url))) {
      Alert.alert("Download unavailable", "The download page could not be opened. Please try again later.");
      return;
    }
    await Linking.openURL(policy.website_url);
  };

  return <View style={styles.container}>
    <View style={styles.icon}><Ionicons name="cloud-download-outline" size={64} color="#20B768" /></View>
    <Text style={styles.title}>{policy.title || "Update"}</Text>
    <Text style={styles.message}>{policy.message}</Text>
    <Text style={styles.version}>Latest version {policy.latest_version}</Text>
    <TouchableOpacity style={styles.button} onPress={download} activeOpacity={0.85}>
      <Ionicons name="download-outline" size={21} color="#FFF" />
      <Text style={styles.buttonText}>Download</Text>
    </TouchableOpacity>
    <Text style={styles.note}>Install the update to continue using PickU.</Text>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2FBF8", alignItems: "center", justifyContent: "center", padding: 28 },
  icon: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#E1F7EA", alignItems: "center", justifyContent: "center", marginBottom: 28 },
  title: { fontSize: 30, fontWeight: "900", color: "#18231F", marginBottom: 12, textAlign: "center" },
  message: { fontSize: 16, lineHeight: 24, color: "#52635D", textAlign: "center", maxWidth: 360 },
  version: { marginTop: 14, color: "#20B768", fontWeight: "700" },
  button: { width: "100%", maxWidth: 360, height: 56, borderRadius: 16, backgroundColor: "#20B768", flexDirection: "row", gap: 9, alignItems: "center", justifyContent: "center", marginTop: 32 },
  buttonText: { color: "#FFF", fontSize: 17, fontWeight: "800" },
  note: { marginTop: 14, fontSize: 12, color: "#82908B", textAlign: "center" },
});
